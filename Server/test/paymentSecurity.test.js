const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Quiz = require("../models/Quiz");
const purchaseController = require("../controllers/purchaseController");

async function runPaymentSecurityTests() {
  console.log("==================================================");
  console.log("   PREPMARK PAYMENT SECURITY VERIFICATION SUITE   ");
  console.log("==================================================");

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

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI is missing in .env");
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected to MongoDB for payment security verification.\n");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    return;
  }

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

  try {
    // Setup test users & test exams
    const testUser = await User.findOne({ email: { $exists: true, $ne: "" } });
    if (!testUser) {
      console.log("Skipping DB tests: No user found.");
      return;
    }

    // ── TEST 1: Missing examId is rejected with 400 ──
    console.log("Test 1: Request without examId");
    const req1 = { user: testUser, body: {}, ip: "127.0.0.1" };
    const res1 = createMockRes();
    await purchaseController.purchaseExam(req1, res1);
    assert(res1.statusCode === 400, "Rejects request without examId (HTTP 400)");

    // ── TEST 2: Arbitrary/nonexistent examId is rejected with 404 ──
    console.log("\nTest 2: Request with nonexistent examId");
    const nonExistentId = new mongoose.Types.ObjectId();
    const req2 = { user: testUser, body: { examId: nonExistentId.toString() }, ip: "127.0.0.1" };
    const res2 = createMockRes();
    await purchaseController.purchaseExam(req2, res2);
    assert(res2.statusCode === 404, "Rejects nonexistent exam with HTTP 404");

    // ── TEST 3: Paid exam in production cannot be unlocked via client simulation ──
    console.log("\nTest 3: Paid exam with client-supplied success in Production mode");
    // Create a temporary in-memory paid quiz
    const paidQuiz = await Quiz.create({
      title: "Security Test Paid Exam",
      subject: "Aptitude",
      duration: 30,
      isPaid: true,
      price: 199,
      status: "Draft",
      createdBy: testUser._id
    });

    const origEnv = process.env.NODE_ENV;
    const origSim = process.env.ALLOW_PAYMENT_SIMULATION;
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_PAYMENT_SIMULATION;

    const req3 = { user: testUser, body: { examId: paidQuiz._id.toString(), gatewayTxnId: "FAKE123" }, ip: "127.0.0.1" };
    const res3 = createMockRes();
    await purchaseController.purchaseExam(req3, res3);
    assert(res3.statusCode === 402, "Rejects unverified paid exam purchase in production (HTTP 402)");
    assert(res3.data && res3.data.success === false, "Response returns success: false");

    // ── TEST 4: Free exam or study material in production can be granted access ──
    console.log("\nTest 4: Free exam access in production");
    const freeQuiz = await Quiz.create({
      title: "Security Test Free Exam",
      subject: "General Knowledge",
      duration: 15,
      isPaid: false,
      status: "Draft",
      createdBy: testUser._id
    });

    const req4 = { user: testUser, body: { examId: freeQuiz._id.toString() }, ip: "127.0.0.1" };
    const res4 = createMockRes();
    await purchaseController.purchaseExam(req4, res4);
    assert(res4.statusCode === 200, "Free exam purchase proceeds with HTTP 200");

    // Verify user purchasedExams contains freeQuiz._id
    const updatedUser = await User.findById(testUser._id);
    const hasFreeQuiz = updatedUser.purchasedExams.some(id => id.toString() === freeQuiz._id.toString());
    assert(hasFreeQuiz, "User purchasedExams contains free quiz");

    // ── TEST 5: Idempotent repeat purchase check ──
    console.log("\nTest 5: Idempotent repeated purchase request");
    const preCount = updatedUser.purchasedExams.length;
    const req5 = { user: updatedUser, body: { examId: freeQuiz._id.toString() }, ip: "127.0.0.1" };
    const res5 = createMockRes();
    await purchaseController.purchaseExam(req5, res5);
    const postUser = await User.findById(testUser._id);
    const postCount = postUser.purchasedExams.length;
    assert(res5.statusCode === 200, "Repeat purchase returns HTTP 200");
    assert(preCount === postCount, "Repeat purchase does not duplicate exam ID in user's purchasedExams array");

    // Clean up test fixtures
    await Quiz.deleteOne({ _id: paidQuiz._id });
    await Quiz.deleteOne({ _id: freeQuiz._id });
    await User.updateOne({ _id: testUser._id }, { $pull: { purchasedExams: freeQuiz._id } });

    // Restore env
    process.env.NODE_ENV = origEnv;
    if (origSim !== undefined) process.env.ALLOW_PAYMENT_SIMULATION = origSim;

  } finally {
    await mongoose.disconnect();
  }

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runPaymentSecurityTests();
