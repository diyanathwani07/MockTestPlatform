const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Schedule = require("../models/Schedule");
const Call = require("../models/Call");
const {
  acceptSchedule,
  endCallSession,
  getSessionAudio,
  getSchedules
} = require("../controllers/aiVoiceController");
const { createWavHeader } = require("../services/geminiTtsService");

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    send(payload) {
      this.data = payload;
      return this;
    }
  };
}

test("PrepMark Phase 5: Voice Session Lifecycle & Audio Streaming Suite", async (t) => {
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  const scheduleStore = new Map();
  const callStore = new Map();

  // Mock Schedule.findOne
  const originalScheduleFindOne = Schedule.findOne;
  Schedule.findOne = function (query) {
    return {
      select() {
        return this;
      },
      then(resolve) {
        const doc = scheduleStore.get(query._id.toString());
        if (doc && (!query.user || doc.user.toString() === query.user.toString())) {
          return resolve(doc);
        }
        return resolve(null);
      }
    };
  };

  // Mock Schedule.find
  const originalScheduleFind = Schedule.find;
  Schedule.find = function (query) {
    return {
      sort() {
        return {
          then(resolve) {
            const results = [];
            for (const doc of scheduleStore.values()) {
              if (doc.user.toString() === query.user.toString()) {
                if (!query.status || doc.status === query.status) {
                  results.push(doc);
                }
              }
            }
            return resolve(results);
          }
        };
      }
    };
  };

  // Mock Schedule.findOneAndUpdate
  const originalScheduleFindOneAndUpdate = Schedule.findOneAndUpdate;
  Schedule.findOneAndUpdate = function (query, update) {
    return {
      select() {
        return this;
      },
      then(resolve) {
        const doc = scheduleStore.get(query._id.toString());
        if (doc) {
          if (update.$set && update.$set.status) {
            doc.status = update.$set.status;
          }
          return resolve(doc);
        }
        return resolve(null);
      },
      catch() {
        return this;
      }
    };
  };

  // Mock Call.findOne
  const originalCallFindOne = Call.findOne;
  Call.findOne = function (query) {
    return {
      select() {
        return this;
      },
      then(resolve) {
        if (query._id) {
          const doc = callStore.get(query._id.toString());
          if (doc && (!query.user || doc.user.toString() === query.user.toString())) {
            return resolve(doc);
          }
          return resolve(null);
        }
        if (query.scheduleId) {
          for (const doc of callStore.values()) {
            if (
              doc.scheduleId.toString() === query.scheduleId.toString() &&
              (!query.user || doc.user.toString() === query.user.toString())
            ) {
              return resolve(doc);
            }
          }
          return resolve(null);
        }
        return resolve(null);
      }
    };
  };

  // Mock Call.create
  const originalCallCreate = Call.create;
  Call.create = async function (data) {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id,
      user: data.user,
      scheduleId: data.scheduleId,
      callType: data.callType || "TASK_REMINDER",
      status: data.status || "ONGOING",
      startTime: data.startTime || new Date(),
      endTime: data.endTime || null,
      durationSeconds: data.durationSeconds || 0,
      terminationReason: data.terminationReason || null,
      async save() {
        if (this.startTime && this.endTime && this.endTime > this.startTime) {
          this.durationSeconds = Math.max(0, Math.round((this.endTime.getTime() - this.startTime.getTime()) / 1000));
        }
        callStore.set(this._id.toString(), this);
        return this;
      }
    };
    callStore.set(id.toString(), doc);
    return doc;
  };

  function createTestSchedule(data) {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id,
      user: data.user,
      taskTitle: data.taskTitle,
      reminderAudioText: data.reminderAudioText || "Test reminder",
      scheduledTime: data.scheduledTime || new Date(),
      status: data.status || "DISPATCHED",
      preGeneratedAudioPath: data.preGeneratedAudioPath || null,
      audioDurationSeconds: data.audioDurationSeconds || 5,
      metadata: new Map(Object.entries(data.metadata || {})),
      async save() {
        scheduleStore.set(this._id.toString(), this);
        return this;
      }
    };
    scheduleStore.set(id.toString(), doc);
    return doc;
  }

  // Temporary test PCM file for audio stream verification
  const tempPcmPath = path.resolve(__dirname, `test_pcm_${Date.now()}.pcm`);
  const fakePcm = Buffer.alloc(24000 * 2); // 1 second of 24kHz 16-bit mono PCM (48,000 bytes)
  fs.writeFileSync(tempPcmPath, fakePcm);

  t.after(() => {
    Schedule.findOne = originalScheduleFindOne;
    Schedule.find = originalScheduleFind;
    Schedule.findOneAndUpdate = originalScheduleFindOneAndUpdate;
    Call.findOne = originalCallFindOne;
    Call.create = originalCallCreate;
    if (fs.existsSync(tempPcmPath)) {
      try {
        fs.unlinkSync(tempPcmPath);
      } catch (_) {}
    }
  });

  await t.test("1. acceptSchedule creates an active Call record and keeps schedule in DISPATCHED during ongoing call", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Biology Revision Call",
      status: "DISPATCHED",
      preGeneratedAudioPath: tempPcmPath
    });

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() }
    };
    const res = createMockRes();

    await acceptSchedule(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.callId, "Should return an active callId");

    // Verify Call document in memory store
    const createdCall = callStore.get(res.data.callId.toString());
    assert.ok(createdCall, "Call must exist in store");
    assert.strictEqual(createdCall.status, "ONGOING");
    assert.strictEqual(createdCall.user.toString(), userA.toString());
    assert.strictEqual(createdCall.scheduleId.toString(), schedule._id.toString());

    // Verify Schedule state is maintained as DISPATCHED during active call
    assert.strictEqual(schedule.status, "DISPATCHED");
    assert.strictEqual(schedule.metadata.get("activeCallId"), res.data.callId.toString());
  });

  await t.test("2. acceptSchedule is idempotent and does not create duplicate calls on retry", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Chemistry Practice Call",
      status: "DISPATCHED",
      preGeneratedAudioPath: tempPcmPath
    });

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() }
    };
    const res1 = createMockRes();
    const res2 = createMockRes();

    await acceptSchedule(req, res1);
    const initialCallId = res1.data.callId;

    await acceptSchedule(req, res2);
    const retryCallId = res2.data.callId;

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(initialCallId.toString(), retryCallId.toString(), "Must reuse existing Call session");
  });

  await t.test("3. acceptSchedule rejects cancelled schedules with 400", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Cancelled Physics Session",
      status: "CANCELLED"
    });

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() }
    };
    const res = createMockRes();

    await acceptSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /cannot accept a cancelled reminder/i);
  });

  await t.test("4. acceptSchedule enforces tenant ownership (User B cannot accept User A's schedule)", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Private Math Prep",
      status: "DISPATCHED"
    });

    const req = {
      user: { _id: userB },
      params: { id: schedule._id.toString() }
    };
    const res = createMockRes();

    await acceptSchedule(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("5. endCallSession updates status to COMPLETED, calculates duration, and records terminationReason", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Mock Test Sync"
    });

    // Create an ongoing call starting 45 seconds ago
    const startTime = new Date(Date.now() - 45000);
    const call = await Call.create({
      user: userA,
      scheduleId: schedule._id,
      status: "ONGOING",
      startTime
    });

    const req = {
      user: { _id: userA },
      params: { callId: call._id.toString() },
      body: { terminationReason: "USER_HANGUP" }
    };
    const res = createMockRes();

    await endCallSession(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(call.status, "COMPLETED");
    assert.strictEqual(call.terminationReason, "USER_HANGUP");
    assert.ok(call.durationSeconds >= 44 && call.durationSeconds <= 46, `Duration should be ~45s, got ${call.durationSeconds}`);
  });

  await t.test("6. endCallSession is idempotent on repeated requests", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "History Quiz"
    });

    const call = await Call.create({
      user: userA,
      scheduleId: schedule._id,
      status: "COMPLETED",
      startTime: new Date(Date.now() - 30000),
      endTime: new Date(),
      durationSeconds: 30,
      terminationReason: "USER_HANGUP"
    });

    const req = {
      user: { _id: userA },
      params: { callId: call._id.toString() }
    };
    const res = createMockRes();

    await endCallSession(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.match(res.data.message, /already ended/i);
    assert.strictEqual(res.data.data.durationSeconds, 30);
  });

  await t.test("7. endCallSession enforces tenant ownership (User B cannot end User A's call)", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Economics Session"
    });

    const call = await Call.create({
      user: userA,
      scheduleId: schedule._id,
      status: "ONGOING",
      startTime: new Date()
    });

    const req = {
      user: { _id: userB },
      params: { callId: call._id.toString() }
    };
    const res = createMockRes();

    await endCallSession(req, res);

    assert.strictEqual(res.statusCode, 404);
  });

  await t.test("8. getSessionAudio generates and returns valid WAV stream from cached 24kHz PCM", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Civics Reminder",
      preGeneratedAudioPath: tempPcmPath
    });

    const call = await Call.create({
      user: userA,
      scheduleId: schedule._id,
      status: "ONGOING",
      startTime: new Date()
    });

    const req = {
      user: { _id: userA },
      params: { callId: call._id.toString() }
    };
    const res = createMockRes();

    await getSessionAudio(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers["Content-Type"], "audio/wav");
    assert.ok(Buffer.isBuffer(res.data), "Response data must be a Buffer");

    // Expected total length = 44 bytes header + 48,000 bytes PCM = 48,044 bytes
    assert.strictEqual(res.data.length, fakePcm.length + 44);

    // Verify RIFF / WAVE header structure
    assert.strictEqual(res.data.subarray(0, 4).toString("ascii"), "RIFF");
    assert.strictEqual(res.data.subarray(8, 12).toString("ascii"), "WAVE");
    assert.strictEqual(res.data.readUInt32LE(24), 24000, "Sample rate must be 24,000 Hz");
    assert.strictEqual(res.data.readUInt16LE(22), 1, "Num channels must be 1 (mono)");
    assert.strictEqual(res.data.readUInt16LE(34), 16, "Bits per sample must be 16");
  });

  await t.test("9. getSessionAudio rejects unauthorized access from User B", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Private Audio",
      preGeneratedAudioPath: tempPcmPath
    });

    const call = await Call.create({
      user: userA,
      scheduleId: schedule._id,
      status: "ONGOING",
      startTime: new Date()
    });

    const req = {
      user: { _id: userB },
      params: { callId: call._id.toString() }
    };
    const res = createMockRes();

    await getSessionAudio(req, res);

    assert.strictEqual(res.statusCode, 404);
  });

  await t.test("10. getSchedules successfully queries with status=DISPATCHED filter", async () => {
    createTestSchedule({
      user: userA,
      taskTitle: "Dispatched Schedule",
      status: "DISPATCHED"
    });
    createTestSchedule({
      user: userA,
      taskTitle: "Completed Schedule",
      status: "COMPLETED"
    });

    const req = {
      user: { _id: userA },
      query: { status: "DISPATCHED" }
    };
    const res = createMockRes();

    await getSchedules(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.data.data.length > 0);
    for (const item of res.data.data) {
      assert.strictEqual(item.status, "DISPATCHED");
    }
  });
});
