const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const path = require("path");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
try { dns.setServers(["1.1.1.1", "8.8.8.8"]); } catch (e) {}
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Schedule = require("../models/Schedule");
const Call = require("../models/Call");
const {
  createSchedule,
  getSchedules,
  getScheduleById,
  cancelSchedule,
  deleteSchedule,
  getCallHistory
} = require("../controllers/aiVoiceController");

function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
}

test("AI Voice Scheduling Test Suite (Phase 1 Foundation)", async (t) => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  }

  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();
  const createdScheduleIds = [];
  const createdCallIds = [];

  t.after(async () => {
    if (createdScheduleIds.length > 0) {
      await Schedule.deleteMany({ _id: { $in: createdScheduleIds } });
    }
    if (createdCallIds.length > 0) {
      await Call.deleteMany({ _id: { $in: createdCallIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  await t.test("1. Successfully creates a valid task reminder schedule for authenticated user", async () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
    const req = {
      user: { _id: userA },
      body: {
        taskTitle: "Team Standup Call",
        taskDescription: "Review sprint deliverables and blockers",
        reminderAudioText: "Good morning! Time for the daily standup.",
        scheduledTime: futureDate.toISOString(),
        callType: "TASK_REMINDER"
      }
    };
    const res = createMockRes();

    await createSchedule(req, res);

    assert.strictEqual(res.statusCode, 201, "Expected HTTP 201 on creation");
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.taskTitle, "Team Standup Call");
    assert.strictEqual(res.data.data.status, "PENDING");
    assert.strictEqual(res.data.data.user.toString(), userA.toString(), "Owner must be derived strictly from req.user._id");

    createdScheduleIds.push(res.data.data._id);
  });

  await t.test("2. Rejects schedule creation when taskTitle is missing or empty", async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    const req = {
      user: { _id: userA },
      body: {
        taskTitle: "   ",
        scheduledTime: futureDate.toISOString()
      }
    };
    const res = createMockRes();

    await createSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Task title is required/i);
  });

  await t.test("3. Rejects schedule creation when taskTitle exceeds 200 characters", async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    const req = {
      user: { _id: userA },
      body: {
        taskTitle: "A".repeat(201),
        scheduledTime: futureDate.toISOString()
      }
    };
    const res = createMockRes();

    await createSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /cannot exceed 200 characters/i);
  });

  await t.test("4. Rejects invalid date format or missing scheduledTime", async () => {
    const req = {
      user: { _id: userA },
      body: {
        taskTitle: "Valid Title",
        scheduledTime: "not-a-valid-date"
      }
    };
    const res = createMockRes();

    await createSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Invalid scheduled time format/i);
  });

  await t.test("5. Rejects scheduledTime set in the past according to policy", async () => {
    const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes in past
    const req = {
      user: { _id: userA },
      body: {
        taskTitle: "Past Reminder",
        scheduledTime: pastDate.toISOString()
      }
    };
    const res = createMockRes();

    await createSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /must be in the future/i);
  });

  await t.test("6. Multi-tenant isolation: User B cannot see User A's schedules in list", async () => {
    // Schedule created by User A in test 1 exists
    const reqB = {
      user: { _id: userB },
      query: {}
    };
    const resB = createMockRes();

    await getSchedules(reqB, resB);

    assert.strictEqual(resB.statusCode, 200);
    assert.strictEqual(resB.data.success, true);
    assert.strictEqual(resB.data.count, 0, "User B should not see User A's schedules");
  });

  await t.test("7. User isolation: User B cannot get User A's schedule by ID (returns 404)", async () => {
    const scheduleId = createdScheduleIds[0];
    const reqB = {
      user: { _id: userB },
      params: { id: scheduleId.toString() }
    };
    const resB = createMockRes();

    await getScheduleById(reqB, resB);

    assert.strictEqual(resB.statusCode, 404, "Access to another user's schedule must return 404");
    assert.strictEqual(resB.data.success, false);
  });

  await t.test("8. Safe cancellation transitions status from PENDING to CANCELLED", async () => {
    const scheduleId = createdScheduleIds[0];
    const req = {
      user: { _id: userA },
      params: { id: scheduleId.toString() }
    };
    const res = createMockRes();

    await cancelSchedule(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.status, "CANCELLED");

    // Verify in database
    const dbSchedule = await Schedule.findById(scheduleId);
    assert.strictEqual(dbSchedule.status, "CANCELLED");
  });

  await t.test("9. Cannot cancel an already COMPLETED schedule", async () => {
    // Create a schedule with status: COMPLETED directly in DB
    const completedSchedule = await Schedule.create({
      user: userA,
      taskTitle: "Finished Task",
      reminderAudioText: "Done text",
      scheduledTime: new Date(Date.now() + 3600000),
      status: "COMPLETED"
    });
    createdScheduleIds.push(completedSchedule._id);

    const req = {
      user: { _id: userA },
      params: { id: completedSchedule._id.toString() }
    };
    const res = createMockRes();

    await cancelSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /Cannot cancel a schedule that is already completed/i);
  });

  await t.test("10. Call Model: correctly validates and auto-derives durationSeconds on pre-save hook", async () => {
    const startTime = new Date("2026-10-24T12:00:00Z");
    const endTime = new Date("2026-10-24T12:01:45Z"); // Exactly 105 seconds difference

    const call = await Call.create({
      user: userA,
      scheduleId: createdScheduleIds[0],
      callType: "TASK_REMINDER",
      status: "COMPLETED",
      startTime,
      endTime,
      terminationReason: "USER_HANGUP"
    });
    createdCallIds.push(call._id);

    assert.strictEqual(call.durationSeconds, 105, "Duration should auto-derive to exactly 105 seconds");
    assert.strictEqual(call.status, "COMPLETED");
  });

  await t.test("11. Call history retrieves calls strictly isolated to authenticated user", async () => {
    const req = {
      user: { _id: userA }
    };
    const res = createMockRes();

    await getCallHistory(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.count, 1);
    assert.strictEqual(res.data.data[0].durationSeconds, 105);

    // User B checks history
    const reqB = { user: { _id: userB } };
    const resB = createMockRes();
    await getCallHistory(reqB, resB);
    assert.strictEqual(resB.data.count, 0, "User B should have 0 call history records");
  });
});
