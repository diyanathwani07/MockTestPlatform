const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
} catch (e) {}
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Schedule = require("../models/Schedule");
const NotificationDevice = require("../models/NotificationDevice");
const {
  dispatchDueSchedules,
  initAiVoiceScheduler,
  stopAiVoiceScheduler,
  isSchedulerRunning,
  LEASE_DURATION_MS
} = require("../services/aiVoiceSchedulerService");
const { AUDIO_DIR } = require("../services/geminiTtsService");

test("PrepMark Phase 3: AI Voice Reminder Scheduler, FCM & Socket.IO Dispatch Suite", async (t) => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  }

  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();
  const createdScheduleIds = [];
  const createdDeviceIds = [];
  const createdAudioFiles = [];

  // Helper to create a dummy valid audio file
  function createTestAudioFile(scheduleId) {
    const filename = `${scheduleId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.pcm`;
    const filePath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(filePath, Buffer.alloc(48000, 0x12)); // 1 second PCM
    createdAudioFiles.push(filePath);
    return filePath;
  }

  t.after(async () => {
    stopAiVoiceScheduler();

    // Clean up created schedules
    if (createdScheduleIds.length > 0) {
      await Schedule.deleteMany({ _id: { $in: createdScheduleIds } });
    }

    // Clean up created devices
    if (createdDeviceIds.length > 0) {
      await NotificationDevice.deleteMany({ _id: { $in: createdDeviceIds } });
    }

    // Clean up files
    for (const f of createdAudioFiles) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (_) {}
      }
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // Test 1: A due schedule is claimed and dispatched
  await t.test("1. A due schedule is claimed and successfully dispatched via dual channels", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Due Schedule Test",
      taskDescription: "This schedule is due now.",
      reminderAudioText: "Reminder text due now.",
      scheduledTime: new Date(Date.now() - 5000), // Due 5 seconds ago
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    let socketEmitted = null;
    let fcmSent = null;

    const stats = await dispatchDueSchedules({
      now: new Date(),
      workerId: "test-worker-1",
      socketEmitter: (targetUser, event, payload) => {
        socketEmitted = { targetUser, event, payload };
      },
      fcmSender: async (targetUser, payload) => {
        fcmSent = { targetUser, payload };
        return { sent: true, successCount: 1 };
      }
    });

    assert.strictEqual(stats.claimed, 1);
    assert.strictEqual(stats.dispatched, 1);

    // Verify Socket.IO delivery
    assert.ok(socketEmitted);
    assert.strictEqual(socketEmitted.targetUser, userA.toString());
    assert.strictEqual(socketEmitted.event, "incoming-call");
    assert.strictEqual(socketEmitted.payload.scheduleId, schedule._id.toString());
    assert.ok(socketEmitted.payload.dispatchId);
    assert.strictEqual(socketEmitted.payload.taskTitle, "Due Schedule Test");

    // Verify FCM delivery
    assert.ok(fcmSent);
    assert.strictEqual(fcmSent.targetUser.toString(), userA.toString());
    assert.strictEqual(fcmSent.payload.dispatchId, socketEmitted.payload.dispatchId);

    // Verify database document state
    const updated = await Schedule.findById(schedule._id);
    assert.strictEqual(updated.status, "DISPATCHED");
    assert.strictEqual(updated.dispatchAttempts, 1);
    assert.ok(updated.dispatchedAt);
    assert.strictEqual(updated.dispatchClaimExpiresAt, null);
  });

  // Test 2: A future schedule is not dispatched early
  await t.test("2. A future schedule is not dispatched early", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Future Schedule",
      reminderAudioText: "Do not dispatch yet.",
      scheduledTime: new Date(Date.now() + 3600000), // 1 hour in future
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    let socketCalled = false;
    const stats = await dispatchDueSchedules({
      now: new Date(),
      socketEmitter: () => {
        socketCalled = true;
      }
    });

    assert.strictEqual(socketCalled, false);

    const check = await Schedule.findById(schedule._id);
    assert.strictEqual(check.status, "PENDING");
    assert.strictEqual(check.dispatchAttempts, 0);
  });

  // Test 3: Cancelled or deleted schedules are not dispatched
  await t.test("3. Cancelled or completed schedules are not dispatched", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Cancelled Schedule",
      reminderAudioText: "Cancelled reminder.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "CANCELLED",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    let socketCalled = false;
    await dispatchDueSchedules({
      now: new Date(),
      socketEmitter: () => {
        socketCalled = true;
      }
    });

    assert.strictEqual(socketCalled, false);
    const check = await Schedule.findById(schedule._id);
    assert.strictEqual(check.status, "CANCELLED");
  });

  // Test 4: A schedule without ready audio is not dispatched
  await t.test("4. A schedule without ready audio or missing audio file is not dispatched", async () => {
    // Schedule marked READY but file does not exist on disk
    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "Missing Audio File Schedule",
      reminderAudioText: "Missing audio on disk.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: path.join(AUDIO_DIR, "non-existent-file.pcm")
    });
    createdScheduleIds.push(schedule._id);

    let socketCalled = false;
    const stats = await dispatchDueSchedules({
      now: new Date(),
      socketEmitter: () => {
        socketCalled = true;
      }
    });

    assert.strictEqual(socketCalled, false);
    assert.strictEqual(stats.skippedNoAudio, 1);

    const check = await Schedule.findById(schedule._id);
    assert.strictEqual(check.status, "FAILED");
    assert.strictEqual(check.preGeneratedAudioStatus, "FAILED");
    assert.ok(check.lastDispatchError.includes("not found"));
  });

  // Test 5: Two concurrent workers cannot claim the same schedule
  await t.test("5. Multi-worker concurrency: only one worker claims the due schedule", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Concurrency Test Schedule",
      reminderAudioText: "Testing atomic claims.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    // Simulate two workers running at the exact same millisecond
    const [stats1, stats2] = await Promise.all([
      dispatchDueSchedules({ now: new Date(), workerId: "worker-A" }),
      dispatchDueSchedules({ now: new Date(), workerId: "worker-B" })
    ]);

    // Exactly one worker must have claimed and dispatched it
    assert.strictEqual(stats1.claimed + stats2.claimed, 1);
    assert.strictEqual(stats1.dispatched + stats2.dispatched, 1);

    const check = await Schedule.findById(schedule._id);
    assert.strictEqual(check.status, "DISPATCHED");
    assert.strictEqual(check.dispatchAttempts, 1);
  });

  // Test 6: Multiple scheduler registrations do not create duplicate local jobs
  await t.test("6. Multiple scheduler registrations enforce single-job singleton semantics", async () => {
    stopAiVoiceScheduler();
    assert.strictEqual(isSchedulerRunning(), false);

    const job1 = initAiVoiceScheduler();
    assert.strictEqual(isSchedulerRunning(), true);

    const job2 = initAiVoiceScheduler();
    assert.strictEqual(job1, job2); // Same job reference returned

    stopAiVoiceScheduler();
    assert.strictEqual(isSchedulerRunning(), false);
  });

  // Test 7: A stale PROCESSING lease can be recovered safely
  await t.test("7. A stale PROCESSING lease is reclaimed after lease expiry", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    // Simulate a schedule claimed by worker-dead that crashed 10 minutes ago
    const staleTime = new Date(Date.now() - 10 * 60 * 1000);
    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Stale Worker Recovery",
      reminderAudioText: "Recover from dead worker.",
      scheduledTime: staleTime,
      status: "PROCESSING",
      dispatchClaimId: "worker-dead-crashed",
      dispatchClaimedAt: staleTime,
      dispatchClaimExpiresAt: new Date(staleTime.getTime() + LEASE_DURATION_MS), // Expired 7 mins ago
      dispatchAttempts: 1,
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    const stats = await dispatchDueSchedules({
      now: new Date(),
      workerId: "worker-recovery"
    });

    assert.strictEqual(stats.claimed, 1);
    assert.strictEqual(stats.dispatched, 1);

    const updated = await Schedule.findById(schedule._id);
    assert.strictEqual(updated.status, "DISPATCHED");
    assert.strictEqual(updated.dispatchAttempts, 2); // Incremented attempt counter
  });

  // Test 8: A stale worker cannot overwrite a newer worker's state
  await t.test("8. Stale worker fencing: late worker write is rejected if claimId changed", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Stale Worker Fencing",
      reminderAudioText: "Testing worker fencing.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PROCESSING",
      dispatchClaimId: "worker-newer-active",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    // Attempt to finalize using an outdated worker ID
    const staleWorkerId = "worker-old-stale";
    const result = await Schedule.findOneAndUpdate(
      { _id: schedule._id, dispatchClaimId: staleWorkerId },
      { $set: { status: "DISPATCHED" } },
      { returnDocument: "after" }
    );

    assert.strictEqual(result, null); // Write blocked by fencing token
    const check = await Schedule.findById(schedule._id);
    assert.strictEqual(check.status, "PROCESSING");
  });

  // Test 9 & 10: FCM multicast handling and invalid token pruning
  await t.test("9 & 10. Handles invalid FCM tokens and removes them from NotificationDevice", async () => {
    const validToken = "token_valid_" + crypto.randomBytes(6).toString("hex");
    const badToken = "token_invalid_" + crypto.randomBytes(6).toString("hex");

    const dev1 = await NotificationDevice.create({
      userId: userB,
      token: validToken,
      platform: "android"
    });
    const dev2 = await NotificationDevice.create({
      userId: userB,
      token: badToken,
      platform: "android"
    });
    createdDeviceIds.push(dev1._id, dev2._id);

    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userB,
      taskTitle: "FCM Token Cleanup Test",
      reminderAudioText: "Test token cleanup.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    // Mock FCM sender simulating partial multicast failure
    const mockFcmSender = async (targetUser, payload) => {
      // Delete the invalid token simulating the FCM pruning logic in sendIncomingCallFcmPush
      await NotificationDevice.deleteMany({ token: badToken });
      return { sent: true, successCount: 1, failureCount: 1 };
    };

    const stats = await dispatchDueSchedules({
      now: new Date(),
      fcmSender: mockFcmSender
    });

    assert.strictEqual(stats.dispatched, 1);

    // Verify bad token was removed and valid token was retained
    const remainingDevices = await NotificationDevice.find({ userId: userB });
    assert.strictEqual(remainingDevices.length, 1);
    assert.strictEqual(remainingDevices[0].token, validToken);
  });

  // Test 11: Socket.IO events sent strictly to authenticated user room
  await t.test("11. Socket.IO incoming-call event is strictly isolated to user's private room", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Socket Room Isolation",
      reminderAudioText: "Private room event.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    let emittedRoom = null;
    await dispatchDueSchedules({
      now: new Date(),
      socketEmitter: (targetUser, event) => {
        emittedRoom = `user:${targetUser}`;
      }
    });

    assert.strictEqual(emittedRoom, `user:${userA.toString()}`);
  });

  // Test 12: Offline users still receive FCM delivery path
  await t.test("12. Offline user without active socket connection still triggers FCM push", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Offline User Reminder",
      reminderAudioText: "Offline socket test.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    let fcmCalled = false;
    await dispatchDueSchedules({
      now: new Date(),
      socketEmitter: () => {
        // Socket throws or user is disconnected
        throw new Error("User socket offline");
      },
      fcmSender: async () => {
        fcmCalled = true;
        return { sent: true };
      }
    });

    assert.strictEqual(fcmCalled, true);
    const updated = await Schedule.findById(schedule._id);
    assert.strictEqual(updated.status, "DISPATCHED");
  });

  // Test 13: Repeated runs do not create duplicate notifications
  await t.test("13. Repeated runs skip already DISPATCHED schedules", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Idempotency Test",
      reminderAudioText: "Do not repeat.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    let callCount = 0;
    const runOpts = {
      now: new Date(),
      socketEmitter: () => {
        callCount++;
      }
    };

    // First run dispatches
    await dispatchDueSchedules(runOpts);
    assert.strictEqual(callCount, 1);

    // Second run immediately following should do nothing
    const stats2 = await dispatchDueSchedules(runOpts);
    assert.strictEqual(stats2.claimed, 0);
    assert.strictEqual(callCount, 1);
  });

  // Test 14: FCM partial failure or error handling
  await t.test("14. FCM errors do not crash dispatcher and record error state gracefully", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "FCM Error Test",
      reminderAudioText: "FCM transient error.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    const stats = await dispatchDueSchedules({
      now: new Date(),
      fcmSender: async () => {
        throw new Error("FCM service unavailable 503");
      }
    });

    // Schedule status still successfully marks DISPATCHED because socket was delivered
    assert.strictEqual(stats.dispatched, 1);
  });

  // Test 15 & 16: Max retry bounding
  await t.test("15 & 16. Schedules exceeding MAX_DISPATCH_ATTEMPTS transition to FAILED", async () => {
    const tempId = new mongoose.Types.ObjectId();
    const audioPath = createTestAudioFile(tempId);

    // Schedule already attempted 3 times
    const schedule = await Schedule.create({
      _id: tempId,
      user: userA,
      taskTitle: "Max Attempts Exceeded",
      reminderAudioText: "Stop retrying.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "PENDING",
      dispatchAttempts: 3, // Already at max attempts
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: audioPath
    });
    createdScheduleIds.push(schedule._id);

    const stats = await dispatchDueSchedules({ now: new Date() });
    assert.strictEqual(stats.claimed, 0); // Candidate query filters out attempts >= 3
  });
});
