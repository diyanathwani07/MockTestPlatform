const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Schedule = require("../models/Schedule");
const Call = require("../models/Call");
const {
  acceptSchedule,
  rejectSchedule,
  endCallSession,
  getSessionAudio
} = require("../controllers/aiVoiceController");
const { cleanStaleSessions } = require("../services/aiVoiceSchedulerService");
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

test("PrepMark Phase 6: Reliability, Security & Hardening Suite", async (t) => {
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();

  const scheduleStore = new Map();
  const callStore = new Map();

  // Mock Schedule.findOne
  const origScheduleFindOne = Schedule.findOne;
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

  // Mock Schedule.findOneAndUpdate
  const origScheduleFindOneAndUpdate = Schedule.findOneAndUpdate;
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

  // Mock Schedule.updateMany
  const origScheduleUpdateMany = Schedule.updateMany;
  Schedule.updateMany = async function (query, update) {
    let count = 0;
    for (const doc of scheduleStore.values()) {
      if (query.status && doc.status === query.status) {
        if (query.dispatchedAt && query.dispatchedAt.$lte) {
          if (doc.dispatchedAt <= query.dispatchedAt.$lte) {
            if (update.$set && update.$set.status) {
              doc.status = update.$set.status;
              count++;
            }
          }
        }
      }
    }
    return { modifiedCount: count };
  };

  // Mock Call.findOne
  const origCallFindOne = Call.findOne;
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
        }
        return resolve(null);
      }
    };
  };

  // Mock Call.find
  const origCallFind = Call.find;
  Call.find = async function (query) {
    const results = [];
    for (const doc of callStore.values()) {
      if (query.status && doc.status === query.status) {
        if (query.startTime && query.startTime.$lte) {
          if (doc.startTime <= query.startTime.$lte) {
            results.push(doc);
          }
        } else {
          results.push(doc);
        }
      }
    }
    return results;
  };

  // Mock Call.findOneAndUpdate
  const origCallFindOneAndUpdate = Call.findOneAndUpdate;
  Call.findOneAndUpdate = function (query, update, options) {
    return {
      select() {
        return this;
      },
      then(resolve) {
        let doc = null;
        for (const item of callStore.values()) {
          if (
            query.scheduleId &&
            item.scheduleId.toString() === query.scheduleId.toString() &&
            (!query.user || item.user.toString() === query.user.toString())
          ) {
            doc = item;
            break;
          }
        }

        if (!doc && options && options.upsert) {
          const insertData = update.$setOnInsert || {};
          const id = new mongoose.Types.ObjectId();
          doc = {
            _id: id,
            user: insertData.user || query.user,
            scheduleId: insertData.scheduleId || query.scheduleId,
            callType: insertData.callType || "TASK_REMINDER",
            status: insertData.status || "ONGOING",
            startTime: insertData.startTime || new Date(),
            endTime: null,
            durationSeconds: 0,
            terminationReason: null,
            async save() {
              if (this.startTime && this.endTime && this.endTime > this.startTime) {
                this.durationSeconds = Math.max(0, Math.round((this.endTime.getTime() - this.startTime.getTime()) / 1000));
              }
              callStore.set(this._id.toString(), this);
              return this;
            }
          };
          callStore.set(id.toString(), doc);
        } else if (doc && update.$set) {
          Object.assign(doc, update.$set);
        }
        return resolve(doc);
      },
      catch() {
        return this;
      }
    };
  };

  function createTestSchedule(data) {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id,
      user: data.user,
      taskTitle: data.taskTitle,
      reminderAudioText: data.reminderAudioText || "Reliability test reminder",
      scheduledTime: data.scheduledTime || new Date(),
      status: data.status || "DISPATCHED",
      dispatchedAt: data.dispatchedAt || new Date(),
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

  // Temporary test PCM file for audio verification
  const tempPcmPath = path.resolve(__dirname, `reliability_pcm_${Date.now()}.pcm`);
  const fakePcm = Buffer.alloc(24000 * 2); // 48,000 bytes
  fs.writeFileSync(tempPcmPath, fakePcm);

  t.after(() => {
    Schedule.findOne = origScheduleFindOne;
    Schedule.findOneAndUpdate = origScheduleFindOneAndUpdate;
    Schedule.updateMany = origScheduleUpdateMany;
    Call.findOne = origCallFindOne;
    Call.find = origCallFind;
    Call.findOneAndUpdate = origCallFindOneAndUpdate;
    if (fs.existsSync(tempPcmPath)) {
      try {
        fs.unlinkSync(tempPcmPath);
      } catch (_) {}
    }
  });

  await t.test("1. Two concurrent Accept requests atomically produce exactly one Call document", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Concurrent Accept Race Test",
      status: "DISPATCHED",
      preGeneratedAudioPath: tempPcmPath
    });

    const req1 = { user: { _id: userA }, params: { id: schedule._id.toString() } };
    const req2 = { user: { _id: userA }, params: { id: schedule._id.toString() } };
    const res1 = createMockRes();
    const res2 = createMockRes();

    // Execute concurrently
    await Promise.all([acceptSchedule(req1, res1), acceptSchedule(req2, res2)]);

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res1.data.callId.toString(), res2.data.callId.toString());

    // Verify only 1 Call was created in the call store for this schedule
    let callCount = 0;
    for (const c of callStore.values()) {
      if (c.scheduleId.toString() === schedule._id.toString()) callCount++;
    }
    assert.strictEqual(callCount, 1, "Exactly one Call document must exist");
  });

  await t.test("2. rejectSchedule rejects an already COMPLETED reminder with 400 and preserves status", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Completed Reminder Reject Attempt",
      status: "COMPLETED"
    });

    const req = { user: { _id: userA }, params: { id: schedule._id.toString() } };
    const res = createMockRes();

    await rejectSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /already been completed/i);
    assert.strictEqual(schedule.status, "COMPLETED");
  });

  await t.test("3. acceptSchedule rejects an already COMPLETED reminder with 400", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Completed Reminder Accept Attempt",
      status: "COMPLETED"
    });

    const req = { user: { _id: userA }, params: { id: schedule._id.toString() } };
    const res = createMockRes();

    await acceptSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /already completed/i);
  });

  await t.test("4. getSessionAudio rejects streaming for a REJECTED call session with 403", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Rejected Call Audio Stream Guard",
      preGeneratedAudioPath: tempPcmPath
    });

    const callId = new mongoose.Types.ObjectId();
    const rejectedCall = {
      _id: callId,
      user: userA,
      scheduleId: schedule._id,
      status: "REJECTED",
      startTime: new Date(),
      async save() { return this; }
    };
    callStore.set(callId.toString(), rejectedCall);

    const req = { user: { _id: userA }, params: { callId: callId.toString() } };
    const res = createMockRes();

    await getSessionAudio(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /cannot stream audio for a rejected or failed/i);
  });

  await t.test("5. cleanStaleSessions recovers abandoned ONGOING calls older than threshold and calculates duration", async () => {
    const schedule = createTestSchedule({
      user: userA,
      taskTitle: "Zombie Session Recovery Test",
      status: "DISPATCHED"
    });

    const oldStart = new Date(Date.now() - 25 * 60 * 1000); // 25 minutes ago
    const callId = new mongoose.Types.ObjectId();
    const abandonedCall = {
      _id: callId,
      user: userA,
      scheduleId: schedule._id,
      status: "ONGOING",
      startTime: oldStart,
      endTime: null,
      durationSeconds: 0,
      terminationReason: null,
      async save() {
        callStore.set(this._id.toString(), this);
        return this;
      }
    };
    callStore.set(callId.toString(), abandonedCall);

    const sweepResult = await cleanStaleSessions({ thresholdMs: 15 * 60 * 1000 });

    assert.ok(sweepResult.staleCallsClosed >= 1, "Must close at least 1 abandoned call");
    assert.strictEqual(abandonedCall.status, "COMPLETED");
    assert.strictEqual(abandonedCall.terminationReason, "TIMEOUT");
    assert.ok(abandonedCall.durationSeconds >= 1400, "Duration should reflect elapsed time before cleanup");
    assert.strictEqual(schedule.status, "COMPLETED");
  });

  await t.test("6. cleanStaleSessions sweeps orphaned DISPATCHED schedules older than threshold", async () => {
    const oldDispatchedSchedule = createTestSchedule({
      user: userA,
      taskTitle: "Orphaned Dispatched Schedule",
      status: "DISPATCHED",
      dispatchedAt: new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
    });

    const sweepResult = await cleanStaleSessions({ thresholdMs: 15 * 60 * 1000 });

    assert.ok(sweepResult.staleSchedulesCompleted >= 1);
    assert.strictEqual(oldDispatchedSchedule.status, "COMPLETED");
  });

  await t.test("7. WAV header calculation conforms strictly to 24kHz 16-bit mono specification", async () => {
    const pcmLength = 48000; // 1 second
    const header = createWavHeader(pcmLength, 24000, 1, 16);

    assert.strictEqual(header.length, 44, "WAV header must be exactly 44 bytes");
    assert.strictEqual(header.subarray(0, 4).toString("ascii"), "RIFF");
    assert.strictEqual(header.readUInt32LE(4), pcmLength + 36, "RIFF chunk size must be pcmLength + 36");
    assert.strictEqual(header.subarray(8, 12).toString("ascii"), "WAVE");
    assert.strictEqual(header.subarray(12, 16).toString("ascii"), "fmt ");
    assert.strictEqual(header.readUInt32LE(16), 16, "Subchunk1Size must be 16 for PCM");
    assert.strictEqual(header.readUInt16LE(20), 1, "AudioFormat must be 1 (PCM)");
    assert.strictEqual(header.readUInt16LE(22), 1, "NumChannels must be 1");
    assert.strictEqual(header.readUInt32LE(24), 24000, "SampleRate must be 24000");
    assert.strictEqual(header.readUInt32LE(28), 48000, "ByteRate must be 48000 (24000 * 1 * 2)");
    assert.strictEqual(header.readUInt16LE(32), 2, "BlockAlign must be 2 (1 * 2)");
    assert.strictEqual(header.readUInt16LE(34), 16, "BitsPerSample must be 16");
    assert.strictEqual(header.subarray(36, 40).toString("ascii"), "data");
    assert.strictEqual(header.readUInt32LE(40), pcmLength, "data chunk length must match pcmLength");
  });
});
