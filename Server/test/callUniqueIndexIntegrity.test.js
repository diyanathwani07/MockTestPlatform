const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const Call = require("../models/Call");
const Schedule = require("../models/Schedule");
const { verifyCallIndexSafety, isVoiceSubsystemReady } = require("../config/dbIntegrity");
const { acceptSchedule, createSchedule } = require("../controllers/aiVoiceController");

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

test("PrepMark Phase 8: Call Unique Compound Index & Non-Destructive Integrity Suite", async (t) => {
  const userA = new mongoose.Types.ObjectId();
  const scheduleId1 = new mongoose.Types.ObjectId();

  await t.test("1. Non-destructive safety scan: Detects duplicate groups without deleting any records", async () => {
    // Mock Call documents representing a real-world conflict:
    // Call 1 is a valid COMPLETED call with audio history (42 seconds).
    // Call 2 is a stuck INITIATED duplicate created by a client retry or socket race.
    const mockRecords = [
      {
        _id: new mongoose.Types.ObjectId(),
        scheduleId: scheduleId1,
        user: userA,
        status: "COMPLETED",
        durationSeconds: 42,
        startTime: new Date("2026-10-26T10:00:00Z"),
        endTime: new Date("2026-10-26T10:00:42Z")
      },
      {
        _id: new mongoose.Types.ObjectId(),
        scheduleId: scheduleId1,
        user: userA,
        status: "INITIATED",
        durationSeconds: 0,
        startTime: null,
        endTime: null
      }
    ];

    let deleteManyCalled = false;

    // Injected mock model adhering strictly to Call schema
    const mockCallModel = {
      aggregate: async () => [
        {
          _id: { scheduleId: scheduleId1, user: userA },
          count: 2,
          records: mockRecords.map((r) => ({
            id: r._id,
            status: r.status,
            durationSeconds: r.durationSeconds,
            startTime: r.startTime,
            endTime: r.endTime
          }))
        }
      ],
      deleteMany: async () => {
        deleteManyCalled = true;
      },
      init: async () => {},
      collection: {
        indexes: async () => []
      }
    };

    const result = await verifyCallIndexSafety({ callModel: mockCallModel });

    // Assert fail-closed behavior
    assert.strictEqual(result.safe, false, "Must fail closed when duplicates exist");
    assert.strictEqual(result.duplicates.length, 1);
    assert.strictEqual(deleteManyCalled, false, "Must NEVER automatically delete documents during startup scan");

    // Verify structured diagnostics reporting conflicting details
    const diag = result.diagnostics;
    assert.strictEqual(diag.duplicateGroupsCount, 1);
    assert.strictEqual(diag.totalConflictingDocuments, 2);
    assert.strictEqual(diag.groups[0].hasCompletedCall, true, "Must flag group containing COMPLETED call history");
    assert.strictEqual(diag.groups[0].hasOngoingCall, false);
    assert.strictEqual(diag.groups[0].records.length, 2);

    // Verify subsystem isolation state
    assert.strictEqual(isVoiceSubsystemReady(), false, "Voice reminder subsystem must be marked disabled");
  });

  await t.test("2. Clean collection scan: Awaits Call.init() and verifies compound unique index successfully", async () => {
    let initAwaited = false;

    const cleanMockCallModel = {
      aggregate: async () => [], // No duplicates
      init: async () => {
        initAwaited = true;
      },
      collection: {
        indexes: async () => [
          { key: { _id: 1 }, name: "_id_" },
          { key: { scheduleId: 1, user: 1 }, unique: true, name: "scheduleId_1_user_1" }
        ]
      }
    };

    const result = await verifyCallIndexSafety({ callModel: cleanMockCallModel });

    assert.strictEqual(result.safe, true, "Must pass safety check on clean collection");
    assert.strictEqual(initAwaited, true, "Call.init() must be awaited before declaring safe");
    assert.strictEqual(result.diagnostics.indexVerified, true);
    assert.strictEqual(isVoiceSubsystemReady(), true, "Voice subsystem must be marked ready");
  });

  await t.test("3. Subsystem isolation: Returns 503 Service Unavailable when subsystem is disabled by integrity check", async () => {
    // Simulate failed integrity check
    const failingMockCallModel = {
      aggregate: async () => [
        {
          _id: { scheduleId: scheduleId1, user: userA },
          count: 2,
          records: [{ id: "c1", status: "INITIATED" }, { id: "c2", status: "INITIATED" }]
        }
      ]
    };

    await verifyCallIndexSafety({ callModel: failingMockCallModel });
    assert.strictEqual(isVoiceSubsystemReady(), false);

    // Verify createSchedule rejects with 503
    const reqCreate = {
      user: { _id: userA },
      body: { taskTitle: "Math Quiz Review", scheduledTime: new Date(Date.now() + 60000).toISOString() }
    };
    const resCreate = createMockRes();
    await createSchedule(reqCreate, resCreate);
    assert.strictEqual(resCreate.statusCode, 503);
    assert.ok(resCreate.data.message.includes("temporarily unavailable"));

    // Verify acceptSchedule rejects with 503
    const reqAccept = {
      user: { _id: userA },
      params: { id: scheduleId1.toString() }
    };
    const resAccept = createMockRes();
    await acceptSchedule(reqAccept, resAccept);
    assert.strictEqual(resAccept.statusCode, 503);
    assert.ok(resAccept.data.message.includes("temporarily unavailable"));

    // Reset voice subsystem ready flag to true for subsequent tests
    await verifyCallIndexSafety({
      callModel: {
        aggregate: async () => [],
        init: async () => {},
        collection: { indexes: async () => [{ key: { scheduleId: 1, user: 1 }, unique: true }] }
      }
    });
    assert.strictEqual(isVoiceSubsystemReady(), true);
  });

  await t.test("4. Call Schema Verification: Enforces unique: true on { scheduleId: 1, user: 1 }", () => {
    const indexes = Call.schema.indexes();
    const compoundUniqueIndex = indexes.find(
      ([spec, options]) => spec.scheduleId === 1 && spec.user === 1 && options && options.unique === true
    );

    assert.ok(compoundUniqueIndex, "Call schema MUST declare { scheduleId: 1, user: 1 } with { unique: true }");
  });

  await t.test("5. Startup sequencing: server.js exports startServer lifecycle function", () => {
    const { startServer } = require("../server");
    assert.strictEqual(typeof startServer, "function", "server.js must export startServer lifecycle function");
  });

  await t.test("6. Index Verification Failure: Fails closed and disables subsystem if compound unique index is missing", async () => {
    const missingIndexCallModel = {
      aggregate: async () => [], // No duplicates
      init: async () => {},
      collection: {
        indexes: async () => [
          { key: { _id: 1 }, name: "_id_" }
          // Missing { scheduleId: 1, user: 1, unique: true }
        ]
      }
    };

    const result = await verifyCallIndexSafety({ callModel: missingIndexCallModel });
    assert.strictEqual(result.safe, false, "Must fail closed if unique compound index is missing from collection");
    assert.strictEqual(result.diagnostics.indexVerified, false);
    assert.strictEqual(isVoiceSubsystemReady(), false, "Voice subsystem must be disabled");

    // Reset back to ready
    await verifyCallIndexSafety({
      callModel: {
        aggregate: async () => [],
        init: async () => {},
        collection: { indexes: async () => [{ key: { scheduleId: 1, user: 1 }, unique: true }] }
      }
    });
    assert.strictEqual(isVoiceSubsystemReady(), true);
  });
});
