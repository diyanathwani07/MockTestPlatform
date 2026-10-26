const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { validateStartupEnv } = require("../config/validateEnv");
const { getVoiceMetrics } = require("../controllers/aiVoiceController");
const Call = require("../models/Call");
const Schedule = require("../models/Schedule");
const aiVoiceRoutes = require("../routes/aiVoiceRoutes");
const { getSchedulerMetrics, isSchedulerRunning } = require("../services/aiVoiceSchedulerService");

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

test("PrepMark Phase 7: Production Readiness, Health & Visibility Suite", async (t) => {

  await t.test("1. Startup Environment Validation: Validates required variables safely", () => {
    const originalEnv = { ...process.env };

    try {
      // Test missing variables
      delete process.env.JWT_SECRET;
      delete process.env.MONGO_URI;
      delete process.env.MONGODB_URI;
      delete process.env.GEMINI_API_KEY;

      const resultMissing = validateStartupEnv();
      assert.strictEqual(resultMissing.valid, false);
      assert.ok(resultMissing.missingCritical.includes("JWT_SECRET"));
      assert.ok(resultMissing.missingCritical.includes("MONGO_URI / MONGODB_URI"));
      assert.ok(resultMissing.missingCritical.includes("GEMINI_API_KEY"));

      // Test valid environment
      process.env.JWT_SECRET = "super-secret-jwt-key-for-test";
      process.env.MONGO_URI = "mongodb://localhost:27017/testdb";
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const resultValid = validateStartupEnv();
      assert.strictEqual(resultValid.valid, true);
      assert.strictEqual(resultValid.missingCritical.length, 0);
    } finally {
      process.env = originalEnv;
    }
  });

  await t.test("2. Operational Health Check Contract: Returns correct payload and status codes", () => {
    // Health handler simulation mirroring server.js logic
    const handleHealthCheck = (req, res, readyState, schedulerRunning) => {
      const dbStatus = readyState === 1 ? "connected" : "disconnected";
      const schedulerStatus = schedulerRunning ? "running" : "stopped";
      const isHealthy = dbStatus === "connected";

      return res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? "healthy" : "degraded",
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          aiVoiceScheduler: schedulerStatus
        }
      });
    };

    // Scenario A: DB connected (readyState 1)
    const resA = createMockRes();
    handleHealthCheck({}, resA, 1, true);
    assert.strictEqual(resA.statusCode, 200);
    assert.strictEqual(resA.data.status, "healthy");
    assert.strictEqual(resA.data.services.database, "connected");
    assert.strictEqual(resA.data.services.aiVoiceScheduler, "running");
    assert.ok(typeof resA.data.uptimeSeconds === "number");
    assert.ok(typeof resA.data.timestamp === "string");

    // Scenario B: DB disconnected (readyState 0)
    const resB = createMockRes();
    handleHealthCheck({}, resB, 0, false);
    assert.strictEqual(resB.statusCode, 503);
    assert.strictEqual(resB.data.status, "degraded");
    assert.strictEqual(resB.data.services.database, "disconnected");
    assert.strictEqual(resB.data.services.aiVoiceScheduler, "stopped");
  });

  await t.test("3. Protected Metrics Telemetry: getVoiceMetrics returns scheduler and realtime stats without sensitive leaks", async () => {
    const origCallCount = Call.countDocuments;
    const origScheduleCount = Schedule.countDocuments;

    try {
      Call.countDocuments = async () => 3;
      Schedule.countDocuments = async () => 7;

      const req = { user: { _id: new mongoose.Types.ObjectId() } };
      const res = createMockRes();

      await getVoiceMetrics(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.timestamp);
      assert.strictEqual(res.data.realtime.activeCallsCount, 3);
      assert.strictEqual(res.data.realtime.pendingSchedulesCount, 7);

      assert.ok(res.data.scheduler);
      assert.ok("totalSweeps" in res.data.scheduler);
      assert.ok("totalDispatched" in res.data.scheduler);
      assert.ok("totalFailed" in res.data.scheduler);
      assert.ok("totalStaleCallsRecovered" in res.data.scheduler);
      assert.ok("uptimeSeconds" in res.data.scheduler);

      // Verify no sensitive keys leaked
      const serialized = JSON.stringify(res.data);
      assert.strictEqual(serialized.includes("password"), false);
      assert.strictEqual(serialized.includes("fcmToken"), false);
      assert.strictEqual(serialized.includes("JWT_SECRET"), false);
      assert.strictEqual(serialized.includes("audioBuffer"), false);
    } finally {
      Call.countDocuments = origCallCount;
      Schedule.countDocuments = origScheduleCount;
    }
  });

  await t.test("4. Scheduler Telemetry Service: getSchedulerMetrics produces safe structured schema", () => {
    const metrics = getSchedulerMetrics();
    assert.ok(typeof metrics.startedAt === "string");
    assert.ok(typeof metrics.totalSweeps === "number");
    assert.ok(typeof metrics.totalDispatched === "number");
    assert.ok(typeof metrics.totalFailed === "number");
    assert.ok(typeof metrics.uptimeSeconds === "number");
    assert.ok(typeof metrics.isRunning === "boolean");
  });

  await t.test("5. AI Voice Routes: Verifies /metrics endpoint is mounted with admin authorization", () => {
    const routeLayer = aiVoiceRoutes.stack.find(
      (layer) => layer.route && layer.route.path === "/metrics"
    );
    assert.ok(routeLayer, "Route /metrics must be registered in aiVoiceRoutes");
    assert.ok(routeLayer.route.methods.get, "Route /metrics must respond to GET");
    // Verify it contains multiple middleware handlers (protect, adminOnly, getVoiceMetrics)
    assert.ok(routeLayer.route.stack.length >= 3, "Route /metrics must be guarded by protect and adminOnly");
  });

  await t.test("6. Admin Authorization Guard: adminOnly rejects students and permits internal roles", () => {
    const { adminOnly } = require("../middleware/adminMiddleware");

    // Student role -> 403
    let res = createMockRes();
    let nextCalled = false;
    adminOnly({ user: { role: "student" } }, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(nextCalled, false);

    // Admin role -> passes next()
    res = createMockRes();
    nextCalled = false;
    adminOnly({ user: { role: "admin" } }, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(nextCalled, true);
  });
});
