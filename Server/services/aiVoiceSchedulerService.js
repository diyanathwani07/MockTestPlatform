const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Schedule = require("../models/Schedule");
const NotificationDevice = require("../models/NotificationDevice");
const { emitToUser } = require("./socketService");
const { admin } = require("../config/firebaseAdmin");

// Configuration parameters
const LEASE_DURATION_MS = 3 * 60 * 1000; // 3 minutes claim lease
const MAX_DISPATCH_ATTEMPTS = 3;
const BATCH_LIMIT = 50;
const CALLER_NAME = "Teaching Pariksha AI";

let activeCronJob = null;
let isProcessingSweep = false;

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
    // 1. Find candidates due for dispatch:
    // Either PENDING or stuck in PROCESSING with an expired lease, under max attempts.
    const candidates = await Schedule.find({
      scheduledTime: { $lte: now },
      preGeneratedAudioStatus: "READY",
      dispatchAttempts: { $lt: MAX_DISPATCH_ATTEMPTS },
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

        // If attempts reached max limit, mark as FAILED, otherwise allow recovery
        const finalStatus = claimed.dispatchAttempts >= MAX_DISPATCH_ATTEMPTS ? "FAILED" : "PROCESSING";
        await Schedule.findOneAndUpdate(
          { _id: claimed._id, dispatchClaimId: workerId },
          {
            $set: {
              status: finalStatus,
              lastDispatchError: itemError.message || "Dispatch delivery error."
            }
          }
        ).catch(() => {});
      }
    }

    return stats;
  } catch (error) {
    console.error("[AiVoiceScheduler] Fatal error during dispatch sweep:", error.message || error);
    return stats;
  }
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
  sendIncomingCallFcmPush,
  initAiVoiceScheduler,
  stopAiVoiceScheduler,
  isSchedulerRunning,
  LEASE_DURATION_MS,
  MAX_DISPATCH_ATTEMPTS
};
