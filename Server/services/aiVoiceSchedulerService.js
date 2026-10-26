const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Schedule = require("../models/Schedule");
const Call = require("../models/Call");
const NotificationDevice = require("../models/NotificationDevice");
const { emitToUser } = require("./socketService");
const { admin } = require("../config/firebaseAdmin");
const { getVoiceSettingsSafe, isWithinCallingSchedule } = require("./voiceScheduleHelper");

// Configuration parameters
const LEASE_DURATION_MS = 3 * 60 * 1000; // 3 minutes claim lease
const DEFAULT_MAX_DISPATCH_ATTEMPTS = 3;
const BATCH_LIMIT = 50;
const CALLER_NAME = "Teaching Pariksha AI";

let activeCronJob = null;
let isProcessingSweep = false;

// In-memory operational metrics for production visibility & telemetry
const schedulerMetrics = {
  startedAt: new Date().toISOString(),
  totalSweeps: 0,
  totalDispatched: 0,
  totalFailed: 0,
  totalStaleCallsRecovered: 0,
  totalStaleSchedulesCleaned: 0,
  lastSweepAt: null,
  lastSweepStats: null
};

function getSchedulerMetrics() {
  return {
    ...schedulerMetrics,
    isRunning: isSchedulerRunning(),
    activeCronJob: activeCronJob ? "scheduled (* * * * *)" : null,
    uptimeSeconds: Math.round(process.uptime())
  };
}

/**
 * Sends a high-priority data-only FCM push notification for an incoming AI voice reminder call.
 * Uses NotificationDevice to locate registered user tokens and prunes invalid/unregistered tokens.
 */
async function sendIncomingCallFcmPush(userId, payload) {
  try {
    if (!admin || !admin.apps || admin.apps.length === 0) {
      // Firebase not configured in this environment (e.g. testing or local dev)
      return { sent: false, count: 0, reason: "Firebase Admin not initialized" };
    }

    const devices = await NotificationDevice.find({ userId }).select("token platform");
    if (!devices || devices.length === 0) {
      return { sent: false, count: 0, reason: "No registered device tokens found for user" };
    }

    const uniqueTokens = [...new Set(devices.map(d => d.token).filter(Boolean))];
    if (uniqueTokens.length === 0) {
      return { sent: false, count: 0, reason: "No valid tokens found" };
    }

    // Ensure all values in FCM data payload are strings
    const stringData = {};
    for (const [key, value] of Object.entries(payload)) {
      stringData[key] = value !== null && value !== undefined ? String(value) : "";
    }

    const fcmMessage = {
      tokens: uniqueTokens,
      data: stringData,
      android: {
        priority: "high",
        ttl: 60000 // 60 seconds time-to-live for ringing calls
      }
    };

    const response = await admin.messaging().sendEachForMulticast(fcmMessage);

    // Prune invalid and unregistered tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(uniqueTokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await NotificationDevice.deleteMany({ token: { $in: invalidTokens } });
      }
    }

    return {
      sent: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error("[AiVoiceScheduler FCM] Failed to send push notification:", error.message || error);
    return { sent: false, error: error.message };
  }
}

/**
 * Dispatches due reminder voice calls.
 * Implements atomic claiming, stale-lease recovery, audio verification, and dual-channel signaling.
 */
async function dispatchDueSchedules(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const workerId = options.workerId || `worker-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  const fcmSender = options.fcmSender || sendIncomingCallFcmPush;
  const socketEmitter = options.socketEmitter || emitToUser;

  const stats = {
    scanned: 0,
    claimed: 0,
    dispatched: 0,
    failed: 0,
    skippedNoAudio: 0
  };

  try {
    // 0. Check Master Voice Subsystem Switch & Permitted Calling Schedule
    const voiceSettings = await getVoiceSettingsSafe();
    if (voiceSettings && voiceSettings.enabled === false) {
      // Disabling voice calls prevents new automated calls without deleting records or interrupting active calls
      return stats;
    }

    if (voiceSettings && voiceSettings.callingSchedule?.enabled) {
      const isAllowed = isWithinCallingSchedule(voiceSettings.callingSchedule, now);
      if (!isAllowed) {
        return stats;
      }
    }

    const maxAttempts =
      typeof voiceSettings?.retryRules?.maxRetryAttempts === "number"
        ? voiceSettings.retryRules.maxRetryAttempts
        : DEFAULT_MAX_DISPATCH_ATTEMPTS;

    const retryDelayMinutes =
      typeof voiceSettings?.retryRules?.retryDelayMinutes === "number"
        ? voiceSettings.retryRules.retryDelayMinutes
        : 15;

    // 1. Find candidates due for dispatch:
    // Either PENDING or stuck in PROCESSING with an expired lease, under max attempts.
    const candidates = await Schedule.find({
      scheduledTime: { $lte: now },
      preGeneratedAudioStatus: "READY",
      dispatchAttempts: { $lt: maxAttempts },
      $or: [
        { status: "PENDING" },
        { status: "PROCESSING", dispatchClaimExpiresAt: { $lte: now } }
      ]
    })
      .sort({ scheduledTime: 1 })
      .limit(BATCH_LIMIT);

    stats.scanned = candidates.length;
    if (candidates.length === 0) {
      return stats;
    }

    // 2. Process each candidate with atomic conditional claim
    for (const candidate of candidates) {
      const leaseExpiry = new Date(now.getTime() + LEASE_DURATION_MS);

      // Atomic conditional update ensures only one worker claims the schedule
      const claimed = await Schedule.findOneAndUpdate(
        {
          _id: candidate._id,
          $or: [
            { status: "PENDING" },
            { status: "PROCESSING", dispatchClaimExpiresAt: { $lte: now } }
          ]
        },
        {
          $set: {
            status: "PROCESSING",
            dispatchClaimId: workerId,
            dispatchClaimedAt: now,
            dispatchClaimExpiresAt: leaseExpiry
          },
          $inc: { dispatchAttempts: 1 }
        },
        { returnDocument: "after" }
      );

      // Another worker claimed this schedule in parallel or status was updated
      if (!claimed) {
        continue;
      }
      stats.claimed++;

      try {
        // 2b. Boundary Check: Ensure service is still enabled before signaling user
        // Prevents an already-claimed job from dispatching if an admin just disabled the subsystem
        const latestSettings = await getVoiceSettingsSafe();
        if (latestSettings && latestSettings.enabled === false) {
          await Schedule.findOneAndUpdate(
            { _id: claimed._id, dispatchClaimId: workerId },
            {
              $set: {
                status: "PENDING",
                dispatchClaimId: null,
                dispatchClaimExpiresAt: null,
                lastDispatchError: "Dispatch deferred: Voice reminder service disabled by administrator."
              },
              $inc: { dispatchAttempts: -1 }
            }
          ).catch(() => {});
          continue;
        }

        // 3. Audio Verification: Ensure pre-generated audio file actually exists on disk
        const audioPath = claimed.preGeneratedAudioPath;
        const audioExists = audioPath ? fs.existsSync(path.resolve(audioPath)) : false;

        if (!audioExists) {
          stats.skippedNoAudio++;
          stats.failed++;

          // Transition to FAILED to avoid repeatedly alerting user with missing audio
          await Schedule.findOneAndUpdate(
            { _id: claimed._id, dispatchClaimId: workerId },
            {
              $set: {
                status: "FAILED",
                preGeneratedAudioStatus: "FAILED",
                lastDispatchError: "Cached PCM audio file not found on storage."
              }
            }
          );
          continue;
        }

        // 4. Build unique, deduplicable dispatch payload
        const dispatchId = crypto.randomUUID();
        const dispatchPayload = {
          type: "INCOMING_CALL",
          dispatchId,
          scheduleId: claimed._id.toString(),
          callerName: CALLER_NAME,
          callType: claimed.callType || "TASK_REMINDER",
          taskTitle: claimed.taskTitle,
          taskDescription: claimed.taskDescription || "",
          reminderAudioText: claimed.reminderAudioText,
          timestamp: now.toISOString()
        };

        // 5. Dual-Channel Delivery
        // Channel A: Real-time Socket.IO emission to user's private room
        try {
          socketEmitter(claimed.user.toString(), "incoming-call", dispatchPayload);
        } catch (socketErr) {
          console.warn(`[AiVoiceScheduler] Socket.IO emission warning for user ${claimed.user}:`, socketErr.message);
        }

        // Channel B: High-Priority FCM Data Push
        try {
          await fcmSender(claimed.user, dispatchPayload);
        } catch (fcmErr) {
          console.warn(`[AiVoiceScheduler] FCM push error for user ${claimed.user}:`, fcmErr.message);
        }

        // 6. Transition schedule to DISPATCHED
        // Match both _id AND workerId to guarantee a stale worker whose lease expired cannot overwrite a newer worker's state
        const updateResult = await Schedule.findOneAndUpdate(
          {
            _id: claimed._id,
            dispatchClaimId: workerId
          },
          {
            $set: {
              status: "DISPATCHED",
              dispatchedAt: new Date(),
              dispatchClaimExpiresAt: null,
              lastDispatchError: null
            }
          },
          { returnDocument: "after" }
        );

        if (updateResult) {
          stats.dispatched++;
        }
      } catch (itemError) {
        stats.failed++;
        console.error(`[AiVoiceScheduler] Error dispatching schedule ${claimed._id}:`, itemError.message || itemError);

        // If attempts reached max limit, mark as FAILED, otherwise allow recovery with configured retry delay
        const isMaxReached = claimed.dispatchAttempts >= maxAttempts;
        const finalStatus = isMaxReached ? "FAILED" : "PROCESSING";
        const retryExpiry = isMaxReached ? null : new Date(now.getTime() + retryDelayMinutes * 60 * 1000);
        await Schedule.findOneAndUpdate(
          { _id: claimed._id, dispatchClaimId: workerId },
          {
            $set: {
              status: finalStatus,
              dispatchClaimExpiresAt: retryExpiry,
              lastDispatchError: isMaxReached
                ? `Exceeded maximum retry attempts (${maxAttempts}). ${itemError.message || ""}`.trim()
                : itemError.message || "Dispatch delivery error."
            }
          }
        ).catch(() => {});
      }
    }

    schedulerMetrics.totalSweeps++;
    schedulerMetrics.totalDispatched += stats.dispatched;
    schedulerMetrics.totalFailed += stats.failed;
    schedulerMetrics.lastSweepAt = new Date().toISOString();
    schedulerMetrics.lastSweepStats = { ...stats };

    return stats;
  } catch (error) {
    schedulerMetrics.totalSweeps++;
    schedulerMetrics.totalFailed += stats.failed;
    schedulerMetrics.lastSweepAt = new Date().toISOString();
    console.error("[AiVoiceScheduler] Fatal error during dispatch sweep:", error.message || error);
    return stats;
  }
}

/**
 * Sweeps and cleans up abandoned ONGOING sessions and orphaned DISPATCHED reminders.
 * Handles server restart recovery and client disconnect timeouts.
 */
async function cleanStaleSessions(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const thresholdMs = options.thresholdMs || 15 * 60 * 1000; // 15 minutes
  const staleThreshold = new Date(now.getTime() - thresholdMs);

  const cleanupStats = {
    staleCallsClosed: 0,
    staleSchedulesCompleted: 0
  };

  try {
    // 1. Close abandoned ONGOING calls older than the timeout threshold
    const staleCalls = await Call.find({
      status: "ONGOING",
      startTime: { $lte: staleThreshold }
    });

    for (const call of staleCalls) {
      call.status = "COMPLETED";
      call.endTime = now;
      call.terminationReason = "TIMEOUT";
      if (call.startTime) {
        call.durationSeconds = Math.max(0, Math.round((now.getTime() - call.startTime.getTime()) / 1000));
      }
      await call.save();
      cleanupStats.staleCallsClosed++;

      // Also ensure associated schedule is closed
      await Schedule.findOneAndUpdate(
        { _id: call.scheduleId },
        { $set: { status: "COMPLETED" } }
      ).catch(() => {});
    }

    // 2. Mark orphaned DISPATCHED schedules older than the threshold as COMPLETED
    // Exclude any schedule currently associated with an active ONGOING call session
    const activeOngoingCalls = (await Call.find({ status: "ONGOING" })) || [];
    const activeScheduleIds = activeOngoingCalls.map(c => c.scheduleId).filter(Boolean);

    const staleSchedules = await Schedule.updateMany(
      {
        status: "DISPATCHED",
        dispatchedAt: { $lte: staleThreshold },
        _id: { $nin: activeScheduleIds }
      },
      {
        $set: { status: "COMPLETED" }
      }
    );
    cleanupStats.staleSchedulesCompleted = staleSchedules.modifiedCount || staleSchedules.nModified || 0;
  } catch (err) {
    console.error("[AiVoiceScheduler] Error during stale session sweep:", err.message || err);
  }

  schedulerMetrics.totalStaleCallsRecovered += cleanupStats.staleCallsClosed;
  schedulerMetrics.totalStaleSchedulesCleaned += cleanupStats.staleSchedulesCompleted;

  return cleanupStats;
}

/**
 * Initializes the background AI voice scheduler.
 * Enforces single-registration semantics per process.
 */
function initAiVoiceScheduler() {
  if (activeCronJob) {
    console.log("[AiVoiceScheduler] Scheduler is already active. Skipping duplicate registration.");
    return activeCronJob;
  }

  // Run every minute at second 0
  activeCronJob = cron.schedule("* * * * *", async () => {
    if (isProcessingSweep) {
      console.log("[AiVoiceScheduler] Previous sweep still in progress. Skipping tick.");
      return;
    }

    isProcessingSweep = true;
    try {
      // Run stale session cleanup alongside dispatch sweep
      await cleanStaleSessions();
      const stats = await dispatchDueSchedules();
      if (stats.dispatched > 0 || stats.failed > 0) {
        console.log(`[AiVoiceScheduler] Sweep complete: ${stats.dispatched} dispatched, ${stats.failed} failed, ${stats.scanned} scanned.`);
      }
    } catch (err) {
      console.error("[AiVoiceScheduler] Unexpected error during scheduled sweep:", err);
    } finally {
      isProcessingSweep = false;
    }
  });

  console.log("[AiVoiceScheduler] AI Voice Reminder Background Scheduler initialized (every 1 minute) 🚀");
  return activeCronJob;
}

/**
 * Gracefully stops the background scheduler.
 */
function stopAiVoiceScheduler() {
  if (activeCronJob) {
    activeCronJob.stop();
    activeCronJob = null;
    isProcessingSweep = false;
    console.log("[AiVoiceScheduler] AI Voice Reminder Background Scheduler stopped.");
  }
}

/**
 * Checks whether the scheduler is currently registered and running.
 */
function isSchedulerRunning() {
  return activeCronJob !== null;
}

module.exports = {
  dispatchDueSchedules,
  cleanStaleSessions,
  getSchedulerMetrics,
  sendIncomingCallFcmPush,
  initAiVoiceScheduler,
  stopAiVoiceScheduler,
  isSchedulerRunning,
  LEASE_DURATION_MS,
  MAX_DISPATCH_ATTEMPTS: DEFAULT_MAX_DISPATCH_ATTEMPTS
};
