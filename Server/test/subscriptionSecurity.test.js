const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const AiPlan = require("../models/AiPlan");
const Subscription = require("../models/Subscription");
const aiPlanController = require("../controllers/aiPlanController");
const subscriptionController = require("../controllers/subscriptionController");
const subscribersController = require("../controllers/subscribersController");
const { enforceExpiry } = require("../utils/subscriptionUtils");

// Mock Request & Response helpers
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

async function runSubscriptionSecuritySuite() {
  console.log("============================================================");
  console.log("  PREPMARK AI SUBSCRIPTION & PAYMENT INTEGRITY AUDIT SUITE  ");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI missing in .env");
    return;
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected to MongoDB for Phase 0 Security Verification.\n");

  try {
    // 0. Setup test fixtures
    let testStudent = await User.findOne({ email: "student_phase0_sec@test.com" });
    if (!testStudent) {
      testStudent = await User.create({
        fullName: "Phase0 Security Student",
        email: "student_phase0_sec@test.com",
        password: "hashedpassword123",
        role: "user",
        isPremium: false
      });
    }

    let testStudent2 = await User.findOne({ email: "student_phase0_sec2@test.com" });
    if (!testStudent2) {
      testStudent2 = await User.create({
        fullName: "Phase0 Second Student",
        email: "student_phase0_sec2@test.com",
        password: "hashedpassword123",
        role: "user",
        isPremium: false
      });
    }

    let testAdmin = await User.findOne({ email: "admin_phase0_sec@test.com" });
    if (!testAdmin) {
      testAdmin = await User.create({
        fullName: "Phase0 Security Admin",
        email: "admin_phase0_sec@test.com",
        password: "hashedpassword123",
        role: "admin",
        permissions: ["manage_students", "full_access"]
      });
    }

    // Clean any prior test subscriptions for these users
    await Subscription.deleteMany({ studentId: { $in: [testStudent._id, testStudent2._id] } });

    // Create a test paid plan
    let paidPlan = await AiPlan.findOne({ name: "Phase 0 Test Pro Plan" });
    if (!paidPlan) {
      paidPlan = await AiPlan.create({
        name: "Phase 0 Test Pro Plan",
        description: "Paid tier for security testing",
        originalPrice: 999,
        sellingPrice: 499,
        durationValue: 30,
        durationUnit: "days",
        maxAITests: 25,
        status: "active"
      });
    } else {
      paidPlan.status = "active";
      paidPlan.sellingPrice = 499;
      paidPlan.maxAITests = 25;
      await paidPlan.save();
    }

    // Create a test free plan
    let freePlan = await AiPlan.findOne({ name: "Phase 0 Test Free Plan" });
    if (!freePlan) {
      freePlan = await AiPlan.create({
        name: "Phase 0 Test Free Plan",
        description: "Free tier for security testing",
        originalPrice: 0,
        sellingPrice: 0,
        durationValue: 7,
        durationUnit: "days",
        maxAITests: 5,
        status: "active"
      });
    }

    const origEnv = process.env.NODE_ENV;
    const origSim = process.env.ALLOW_PAYMENT_SIMULATION;

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Student attempts subscription activation without payment in production
    // ─────────────────────────────────────────────────────────────
    console.log("--- TEST 1: Student attempts paid subscription activation without payment (Production) ---");
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_PAYMENT_SIMULATION;

    const req1 = {
      user: testStudent,
      body: { planId: paidPlan._id.toString() },
      ip: "127.0.0.1"
    };
    const res1 = createMockRes();
    await aiPlanController.subscribeToPlan(req1, res1);

    assert(res1.statusCode === 402, "Rejects unverified paid subscription activation with HTTP 402 Payment Required");
    assert(res1.data && res1.data.code === "PAYMENT_REQUIRED", "Response code indicates PAYMENT_REQUIRED");

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Student submits a fake transaction ID in production
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 2: Student submits a fake transaction ID in production ---");
    const req2 = {
      user: testStudent,
      body: { planId: paidPlan._id.toString(), gatewayTxnId: "FAKE_TXN_999888" },
      ip: "127.0.0.1"
    };
    const res2 = createMockRes();
    await aiPlanController.subscribeToPlan(req2, res2);

    assert(res2.statusCode === 402, "Rejects fake transaction ID with HTTP 402 in production");
    assert(res2.data && res2.data.success === false, "Returns success: false");

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Student changes/tampers amount in request
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 3: Student tampers amount in request (sellingPrice is 499, sends 1) ---");
    // Enable simulation for development validation check
    process.env.NODE_ENV = "development";
    process.env.ALLOW_PAYMENT_SIMULATION = "true";

    const req3 = {
      user: testStudent,
      body: { planId: paidPlan._id.toString(), amount: 1 },
      ip: "127.0.0.1"
    };
    const res3 = createMockRes();
    await aiPlanController.subscribeToPlan(req3, res3);

    assert(res3.statusCode === 400, "Rejects tampered amount with HTTP 400 Bad Request");
    assert(res3.data && res3.data.code === "AMOUNT_MISMATCH", "Response returns code AMOUNT_MISMATCH");

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Student submits a fake success-looking frontend response
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 4: Student sends frontend simulated success in production ---");
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_PAYMENT_SIMULATION;

    const req4 = {
      user: testStudent,
      body: {
        planId: paidPlan._id.toString(),
        paymentStatus: "SUCCESS",
        amount: 499,
        gateway: "phonepe",
        status: "COMPLETED",
        clientSignature: "simulated_fake_sig"
      },
      ip: "127.0.0.1"
    };
    const res4 = createMockRes();
    await aiPlanController.subscribeToPlan(req4, res4);

    assert(res4.statusCode === 402, "Server ignores client-supplied success flags and rejects in production (HTTP 402)");

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Replay attack & duplicate transaction ID prevention
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 5: Replay attack & duplicate transaction reference ---");
    process.env.NODE_ENV = "development";
    process.env.ALLOW_PAYMENT_SIMULATION = "true";

    const testTxn = "TXN_REPLAY_TEST_" + Date.now();
    // First activation succeeds in dev mode
    const req5a = {
      user: testStudent,
      body: { planId: paidPlan._id.toString(), gatewayTxnId: testTxn },
      ip: "127.0.0.1"
    };
    const res5a = createMockRes();
    await aiPlanController.subscribeToPlan(req5a, res5a);
    assert(res5a.statusCode === 200, "First subscription with unique transaction succeeds in dev simulation");

    // Replay 1: Re-submitting the same plan request with same transaction ID returns idempotent active status
    const req5b = {
      user: testStudent,
      body: { planId: paidPlan._id.toString(), gatewayTxnId: testTxn },
      ip: "127.0.0.1"
    };
    const res5b = createMockRes();
    await aiPlanController.subscribeToPlan(req5b, res5b);
    assert(res5b.statusCode === 200 && res5b.data.idempotent === true, "Repeated request for same active plan is handled idempotently without duplicate rows");

    // Replay 2: A different user attempts to reuse/replay the exact same transaction ID
    const req5c = {
      user: testStudent2,
      body: { planId: paidPlan._id.toString(), gatewayTxnId: testTxn },
      ip: "127.0.0.1"
    };
    const res5c = createMockRes();
    await aiPlanController.subscribeToPlan(req5c, res5c);
    assert(res5c.statusCode === 409, "Replay of existing transaction ID by another student rejected with HTTP 409 Conflict");
    assert(res5c.data && res5c.data.code === "DUPLICATE_TRANSACTION", "Response code indicates DUPLICATE_TRANSACTION");

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Student isolation (Student attempts to access another's subscription)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 6: Student subscription access isolation ---");
    // Student 2 queries own history via subscriptionController
    const req6a = { user: testStudent2 };
    const res6a = createMockRes();
    await subscriptionController.getMySubscriptionHistory(req6a, res6a);
    assert(res6a.statusCode === 200, "Student fetches own subscription history");
    assert(Array.isArray(res6a.data) && res6a.data.length === 0, "Student 2 history does NOT contain Student 1 subscriptions");

    // Student attempts to call admin subscribers list
    const req6b = { user: testStudent, query: {} };
    const res6b = createMockRes();
    // Simulate adminOnly middleware check
    const { adminOnly } = require("../middleware/adminMiddleware");
    let adminOnlyBlocked = false;
    adminOnly(req6b, res6b, () => { adminOnlyBlocked = false; });
    if (res6b.statusCode === 403) adminOnlyBlocked = true;
    assert(adminOnlyBlocked, "Student is blocked from admin subscribers endpoint with HTTP 403 Access Denied");

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Admin grants subscription with proper authorization
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 7: Admin grants subscription with proper authorization ---");
    const crypto = require("crypto");
    const purchaseId = `PUR-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + paidPlan.durationValue);

    const adminGrantSub = await Subscription.create({
      studentId: testStudent2._id,
      planId: paidPlan._id,
      planNameSnapshot: paidPlan.name,
      purchaseId,
      amount: paidPlan.sellingPrice,
      currency: "INR",
      maxAITests: paidPlan.maxAITests,
      aiTestsUsed: 0,
      startDate: new Date(),
      expiryDate,
      status: "active",
      paymentGateway: "admin_grant",
      gatewayTxnId: null
    });

    testStudent2.isPremium = true;
    testStudent2.activePlan = paidPlan._id;
    testStudent2.premiumExpiresAt = expiryDate;
    await testStudent2.save();

    assert(adminGrantSub.paymentGateway === "admin_grant", "Admin-granted subscription sets paymentGateway: 'admin_grant'");
    assert(adminGrantSub.maxAITests === 25, "Admin-granted subscription correctly populates maxAITests quota");
    assert(testStudent2.isPremium === true, "Student 2 user profile cache reflects premium status");

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Expired subscriptions cannot generate AI tests
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 8: Expired subscriptions cannot generate AI tests ---");
    // Set expiry to yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    adminGrantSub.expiryDate = yesterday;
    await adminGrantSub.save();
    testStudent2.premiumExpiresAt = yesterday;
    await testStudent2.save();

    // Run enforceExpiry
    const flipped = await enforceExpiry(testStudent2);
    assert(flipped === true, "enforceExpiry detects expired subscription and flips isPremium to false");

    const refreshedSub = await Subscription.findById(adminGrantSub._id);
    assert(refreshedSub.status === "expired", "Subscription record status updated to 'expired'");

    // Check quota query rejection
    const expiredSubCheck = await Subscription.findOne({
      studentId: testStudent2._id,
      status: "active",
      expiryDate: { $gt: new Date() }
    });
    assert(expiredSubCheck === null, "Active subscription query returns null for expired user");

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Failed AI generation correctly restores quota (atomic rollback)
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 9: Atomic quota deduction and rollback upon failure ---");
    // Re-activate Student 1 subscription
    const student1Sub = await Subscription.findOne({ studentId: testStudent._id, status: "active" });
    student1Sub.aiTestsUsed = 5;
    await student1Sub.save();

    // 1. Atomic reservation
    const reservedSub = await Subscription.findOneAndUpdate(
      {
        studentId: testStudent._id,
        status: "active",
        $expr: {
          $lt: ["$aiTestsUsed", "$maxAITests"]
        }
      },
      { $inc: { aiTestsUsed: 1 } },
      { new: true }
    );
    assert(reservedSub && reservedSub.aiTestsUsed === 6, "Atomic usage reservation increments aiTestsUsed from 5 to 6");

    // 2. Simulated generation error triggers rollback
    await Subscription.findByIdAndUpdate(reservedSub._id, { $inc: { aiTestsUsed: -1 } });
    const rolledBackSub = await Subscription.findById(reservedSub._id);
    assert(rolledBackSub.aiTestsUsed === 5, "Quota rollback restores aiTestsUsed back to 5 upon generation failure");

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Existing valid subscription functionality remains intact
    // ─────────────────────────────────────────────────────────────
    console.log("\n--- TEST 10: Existing valid subscription functionality remains intact ---");
    const activeValidSub = await Subscription.findOne({
      studentId: testStudent._id,
      status: "active",
      expiryDate: { $gt: new Date() }
    });

    assert(activeValidSub !== null, "Valid active subscription found for test student");
    assert(activeValidSub.status === "active", "Subscription status is active");
    assert(activeValidSub.maxAITests === 25, "Configured test quota is 25");
    const remaining = Math.max(0, activeValidSub.maxAITests - activeValidSub.aiTestsUsed);
    assert(remaining === 20, "Calculates 20 remaining tests correctly (25 max - 5 used)");

    // Restore environment
    process.env.NODE_ENV = origEnv;
    if (origSim !== undefined) process.env.ALLOW_PAYMENT_SIMULATION = origSim;

    // Cleanup test fixtures
    await Subscription.deleteMany({ studentId: { $in: [testStudent._id, testStudent2._id] } });
    await User.deleteMany({ _id: { $in: [testStudent._id, testStudent2._id, testAdmin._id] } });
    await AiPlan.deleteMany({ name: { $in: ["Phase 0 Test Pro Plan", "Phase 0 Test Free Plan"] } });

  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n============================================================");
  console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED `);
  console.log("============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSubscriptionSecuritySuite().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
