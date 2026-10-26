const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const Schedule = require("../models/Schedule");
const Call = require("../models/Call");
const {
  acceptSchedule,
  rejectSchedule
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

test("PrepMark Phase 4: Accept and Reject Lifecycle & State Transitions", async (t) => {
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();
  const memoryStore = new Map();

  // Pure isolated in-memory unit test mock for Schedule.findOne
  const originalFindOne = Schedule.findOne;
  Schedule.findOne = function (query) {
    return {
      select() {
        return this;
      },
      then(resolve) {
        const doc = memoryStore.get(query._id.toString());
        if (doc && doc.user.toString() === query.user.toString()) {
          return resolve(doc);
        }
        return resolve(null);
      }
    };
  };

  const originalCallFindOne = Call.findOne;
  const originalCallCreate = Call.create;
  const originalCallFindOneAndUpdate = Call.findOneAndUpdate;
  Call.findOne = function () {
    return {
      select() {
        return this;
      },
      then(resolve) {
        return resolve(null);
      }
    };
  };
  Call.findOneAndUpdate = function () {
    return {
      select() {
        return this;
      },
      then(resolve) {
        return resolve({
          _id: new mongoose.Types.ObjectId(),
          status: "ONGOING",
          async save() {
            return this;
          }
        });
      },
      catch() {
        return this;
      }
    };
  };
  Call.create = async function (data) {
    return {
      _id: new mongoose.Types.ObjectId(),
      ...data,
      async save() {
        return this;
      }
    };
  };

  function createTestDoc(data) {
    const id = new mongoose.Types.ObjectId();
    const doc = {
      _id: id,
      user: data.user,
      taskTitle: data.taskTitle,
      reminderAudioText: data.reminderAudioText,
      scheduledTime: data.scheduledTime,
      status: data.status,
      metadata: new Map(Object.entries(data.metadata || {})),
      async save() {
        memoryStore.set(this._id.toString(), this);
        return this;
      }
    };
    memoryStore.set(id.toString(), doc);
    return doc;
  }

  t.after(() => {
    Schedule.findOne = originalFindOne;
    Call.findOne = originalCallFindOne;
    Call.findOneAndUpdate = originalCallFindOneAndUpdate;
    Call.create = originalCallCreate;
    memoryStore.clear();
  });

  // Test 1: User Accept records response without falsely marking call as COMPLETED
  await t.test("1. User Accept acknowledges reminder and records acceptedAt timestamp without setting COMPLETED", async () => {
    const schedule = createTestDoc({
      user: userA,
      taskTitle: "Phase 4 Accept Test",
      reminderAudioText: "Accept reminder test.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "DISPATCHED"
    });

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() }
    };
    const res = createMockRes();

    await acceptSchedule(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.message.includes("accepted"));

    // Verified: Status is NOT falsely transitioned to COMPLETED
    assert.notStrictEqual(res.data.data.status, "COMPLETED");
    assert.strictEqual(res.data.data.status, "DISPATCHED");
    assert.ok(res.data.data.metadata.get("acceptedAt"));
  });

  // Test 2: User Reject cancels reminder and records rejectedAt
  await t.test("2. User Reject declines reminder and transitions status to CANCELLED", async () => {
    const schedule = createTestDoc({
      user: userA,
      taskTitle: "Phase 4 Reject Test",
      reminderAudioText: "Reject reminder test.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "DISPATCHED"
    });

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() }
    };
    const res = createMockRes();

    await rejectSchedule(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.status, "CANCELLED");
    assert.ok(res.data.data.metadata.get("rejectedAt"));
  });

  // Test 3: Idempotent Reject
  await t.test("3. Repeated reject on an already cancelled reminder is safely idempotent", async () => {
    const schedule = createTestDoc({
      user: userA,
      taskTitle: "Repeat Reject Test",
      reminderAudioText: "Repeat reject.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "CANCELLED"
    });

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() }
    };
    const res = createMockRes();

    await rejectSchedule(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.message.includes("already cancelled"));
  });

  // Test 4: Cannot accept an already cancelled reminder
  await t.test("4. Cannot accept an already cancelled reminder", async () => {
    const schedule = createTestDoc({
      user: userA,
      taskTitle: "Accept Cancelled Test",
      reminderAudioText: "Cannot accept cancelled.",
      scheduledTime: new Date(Date.now() - 5000),
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
    assert.ok(res.data.message.includes("Cannot accept"));
  });

  // Test 5: Ownership isolation: User B cannot accept or reject User A's reminder
  await t.test("5. Multi-tenant isolation: User B cannot accept or reject User A's schedule", async () => {
    const schedule = createTestDoc({
      user: userA,
      taskTitle: "User A Isolation Test",
      reminderAudioText: "Private reminder.",
      scheduledTime: new Date(Date.now() - 5000),
      status: "DISPATCHED"
    });

    const req = {
      user: { _id: userB }, // User B attempting to accept User A's schedule
      params: { id: schedule._id.toString() }
    };
    const resAccept = createMockRes();
    await acceptSchedule(req, resAccept);
    assert.strictEqual(resAccept.statusCode, 404);

    const resReject = createMockRes();
    await rejectSchedule(req, resReject);
    assert.strictEqual(resReject.statusCode, 404);
  });

  // Test 6: Rejecting an already COMPLETED reminder is rejected with 400
  await t.test("6. Rejecting an already COMPLETED reminder is rejected with 400", async () => {
    const schedule = createTestDoc({
      user: userA,
      taskTitle: "Completed Schedule Reject Test",
      status: "COMPLETED"
    });

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() }
    };
    const res = createMockRes();

    await rejectSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /already been completed/i);
  });

  // Test 7: Accepting an already COMPLETED reminder is rejected with 400
  await t.test("7. Accepting an already COMPLETED reminder is rejected with 400", async () => {
    const schedule = createTestDoc({
      user: userA,
      taskTitle: "Completed Schedule Accept Test",
      status: "COMPLETED"
    });

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() }
    };
    const res = createMockRes();

    await acceptSchedule(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.match(res.data.message, /already completed/i);
  });
});
