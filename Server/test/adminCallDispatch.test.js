const { test, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const User = require("../models/User");
const Schedule = require("../models/Schedule");
const NotificationDevice = require("../models/NotificationDevice");
const { initFirebaseAdmin } = require("../config/firebaseAdmin");
const { dispatchImmediateSchedule } = require("../services/aiVoiceSchedulerService");

test("Admin AI Voice Calling & Dispatch Suite", async (t) => {
  before(async () => {
    initFirebaseAdmin();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  after(async () => {
    await mongoose.disconnect();
  });

  await t.test("1. Admin can schedule and immediately dispatch call to a user", async () => {
    const testStudentId = new mongoose.Types.ObjectId();
    const testAdminId = new mongoose.Types.ObjectId();

    const dummyAudioDir = path.resolve(__dirname, "../uploads/audio");
    if (!fs.existsSync(dummyAudioDir)) {
      fs.mkdirSync(dummyAudioDir, { recursive: true });
    }
    const dummyAudioPath = path.join(dummyAudioDir, `test-admin-call-${Date.now()}.pcm`);
    fs.writeFileSync(dummyAudioPath, Buffer.alloc(1024));

    await NotificationDevice.create({
      userId: testStudentId,
      token: `mock-fcm-token-${Date.now()}`,
      platform: "android"
    });

    const schedule = await Schedule.create({
      user: testStudentId,
      scheduledBy: testAdminId,
      taskTitle: "Mentorship Call for Test Prep",
      reminderAudioText: "Hello Student! This is your mentor from PrepMark.",
      scheduledTime: new Date(),
      callType: "CUSTOM",
      status: "PENDING",
      preGeneratedAudioStatus: "READY",
      preGeneratedAudioPath: dummyAudioPath,
      audioDurationSeconds: 15
    });

    const dispatchResult = await dispatchImmediateSchedule(schedule._id, {
      callerName: "PrepMark AI Test"
    });

    assert.strictEqual(dispatchResult.success, true);
    assert.strictEqual(dispatchResult.dispatchPayload.type, "INCOMING_CALL");
    assert.strictEqual(dispatchResult.dispatchPayload.scheduleId, schedule._id.toString());
    assert.strictEqual(dispatchResult.dispatchPayload.callerName, "PrepMark AI Test");

    const updatedSchedule = await Schedule.findById(schedule._id);
    assert.strictEqual(updatedSchedule.status, "DISPATCHED");
    assert.ok(updatedSchedule.dispatchedAt);

    await Schedule.findByIdAndDelete(schedule._id);
    await NotificationDevice.deleteMany({ userId: testStudentId });
    if (fs.existsSync(dummyAudioPath)) {
      fs.unlinkSync(dummyAudioPath);
    }
  });
});
