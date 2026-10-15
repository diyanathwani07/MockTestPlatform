const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const LiveExamination = require("../models/LiveExamination");
const LiveExamAttempt = require("../models/LiveExamAttempt");
const Quiz = require("../models/Quiz");
const User = require("../models/User");

async function runPhase2Tests() {
  console.log("==================================================");
  console.log("   PREPMARK LIVE EXAMINATION PHASE 2 TEST SUITE   ");
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

  // Connect to test database or local mongo
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/prepmark_test";
  console.log(`Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, "//<credentials>@")}...`);
  
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB successfully.\n");
  } catch (err) {
    console.warn("Could not connect to live MongoDB instance:", err.message);
    console.log("Running in-memory schema validation tests without active DB connection...\n");
  }

  // --- TEST 1: Slug and Unguessable Token Generation ---
  console.log("Test 1: Slug & Unguessable Token Generation");
  try {
    const { shareSlug, shareToken } = await LiveExamination.generateUniqueSlugAndToken("BPSC TRE 4.0 PRT Mock Test");
    assert(typeof shareSlug === "string" && shareSlug.startsWith("bpsc-tre-4-0-prt-mock-test-"), "Slug starts with normalized title");
    assert(typeof shareToken === "string" && shareToken.length === 32, "Token is 32-character crypto hex string (unguessable)");
    assert(/^[a-z0-9-]+$/.test(shareSlug), "Slug contains only valid URL-safe characters");
  } catch (err) {
    assert(false, `Slug/token generation threw error: ${err.message}`);
  }

  // --- TEST 2: Schema Validation (Required Fields & Rules) ---
  console.log("\nTest 2: Schema Validation on Invalid Inputs");
  
  // Missing required fields
  const invalidExam = new LiveExamination({});
  let valError;
  try {
    await invalidExam.validate();
  } catch (err) {
    valError = err;
  }
  assert(valError && valError.errors["quizId"], "Rejects missing quizId");
  assert(valError && valError.errors["title"], "Rejects missing title");
  assert(valError && valError.errors["scheduledStartTime"], "Rejects missing scheduledStartTime");
  assert(valError && valError.errors["scheduledEndTime"], "Rejects missing scheduledEndTime");
  assert(valError && valError.errors["duration"], "Rejects missing duration");

  // Invalid enum for webcamRule
  const badWebcam = new LiveExamination({
    quizId: new mongoose.Types.ObjectId(),
    title: "Test",
    scheduledStartTime: new Date(),
    scheduledEndTime: new Date(Date.now() + 3600000),
    duration: 60,
    shareSlug: "test-slug",
    shareToken: "token123",
    createdBy: new mongoose.Types.ObjectId(),
    webcamRule: "hacked_value",
  });
  let badWebcamError;
  try {
    await badWebcam.validate();
  } catch (err) {
    badWebcamError = err;
  }
  assert(badWebcamError && badWebcamError.errors["webcamRule"], "Rejects invalid webcamRule enum value");

  // --- TEST 3: Schedule Logic Validation in Controller ---
  console.log("\nTest 3: Schedule Logic Rules");
  const { createLiveExam } = require("../controllers/liveExamController");

  // Mock res & req for controller tests
  const createMockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
    res.json = function (data) {
      res.body = data;
      return res;
    };
    return res;
  };

  // Case A: End time earlier than start time
  const now = Date.now();
  const reqEndBeforeStart = {
    body: {
      quizId: new mongoose.Types.ObjectId(),
      title: "Invalid Exam",
      scheduledStartTime: new Date(now + 7200000).toISOString(), // 2 hours in future
      scheduledEndTime: new Date(now + 3600000).toISOString(),   // 1 hour in future (before start!)
      duration: 60,
    },
    user: { _id: new mongoose.Types.ObjectId(), fullName: "Admin Test" },
  };
  const resA = createMockRes();
  await createLiveExam(reqEndBeforeStart, resA);
  assert(resA.statusCode === 400 && resA.body.message.includes("Scheduled end time must be later"), "Rejects scheduledEndTime <= scheduledStartTime");

  // Case B: Duration exceeds the available scheduled window
  const reqDurationTooLong = {
    body: {
      quizId: new mongoose.Types.ObjectId(),
      title: "Duration Too Long Exam",
      scheduledStartTime: new Date(now + 3600000).toISOString(),
      scheduledEndTime: new Date(now + 7200000).toISOString(), // 60 min window
      duration: 120, // 120 mins requested for 60 min window!
    },
    user: { _id: new mongoose.Types.ObjectId(), fullName: "Admin Test" },
  };
  const resB = createMockRes();
  await createLiveExam(reqDurationTooLong, resB);
  assert(resB.statusCode === 400 && resB.body.message.includes("cannot exceed the total scheduled window"), "Rejects duration exceeding total start-to-end window");

  // --- TEST 4: LiveExamAttempt Model & Timeline Logging ---
  console.log("\nTest 4: LiveExamAttempt Schema & Methods");
  const attempt = new LiveExamAttempt({
    liveExamId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    quizId: new mongoose.Types.ObjectId(),
    status: "in_lobby",
  });
  attempt.logTimelineEvent("LOBBY_ENTER", { ip: "127.0.0.1" });
  assert(attempt.timeline.length === 1, "Appends timeline event");
  assert(attempt.timeline[0].event === "LOBBY_ENTER", "Timeline event name matches");
  assert(attempt.timeline[0].metadata.ip === "127.0.0.1", "Timeline event metadata persisted");

  // --- TEST 5: Calculated Status Method ---
  console.log("\nTest 5: LiveExamination.getCalculatedStatus()");
  const futureExam = new LiveExamination({
    scheduledStartTime: new Date(Date.now() + 86400000), // tomorrow
    scheduledEndTime: new Date(Date.now() + 86400000 + 7200000),
    entryWindowMinutes: 15,
    status: "scheduled",
  });
  assert(futureExam.getCalculatedStatus() === "scheduled", "Future exam evaluates to 'scheduled'");

  const pastExam = new LiveExamination({
    scheduledStartTime: new Date(Date.now() - 7200000), // 2 hours ago
    scheduledEndTime: new Date(Date.now() - 3600000),   // 1 hour ago
    entryWindowMinutes: 15,
    status: "scheduled",
  });
  assert(pastExam.getCalculatedStatus() === "completed", "Elapsed exam evaluates to 'completed'");

  const liveExam = new LiveExamination({
    scheduledStartTime: new Date(Date.now() - 1800000), // started 30 mins ago
    scheduledEndTime: new Date(Date.now() + 1800000),   // ends in 30 mins
    entryWindowMinutes: 15,
    status: "scheduled",
  });
  assert(liveExam.getCalculatedStatus() === "live", "Ongoing exam evaluates to 'live'");

  // --- TEST 6: Public Endpoint Zero-Answer-Leakage Check ---
  console.log("\nTest 6: Public Endpoint Data Sanitization (Zero Answer Leakage)");
  const { getPublicLiveExamInfo } = require("../controllers/liveExamController");
  
  // Verify that questions or correct answers are never returned by public endpoint
  const mockExamInDb = {
    _id: new mongoose.Types.ObjectId(),
    title: "Secure Mock Exam",
    instructions: "No external materials.",
    scheduledStartTime: new Date(Date.now() + 3600000),
    scheduledEndTime: new Date(Date.now() + 7200000),
    duration: 60,
    entryWindowMinutes: 15,
    allowLateEntry: true,
    webcamRule: "mandatory",
    status: "scheduled",
    shareSlug: "secure-mock-test-12345",
    shareToken: "token_secure_32_chars_12345678",
    quizId: {
      title: "Original Quiz",
      examName: "BPSC",
      subject: "Science",
      passPercentage: 50,
      marksPerQuestion: 1,
      negativeMarking: 0.25,
      questions: [
        {
          questionEnglish: "What is H2O?",
          options: ["Water", "Air", "Iron", "Gold"],
          correctAnswer: "Water", // SENSITIVE
          explanation: "Water is chemical compound H2O.", // SENSITIVE
        },
      ],
    },
  };

  // Mock LiveExamination.findOne
  const origFindOne = LiveExamination.findOne;
  LiveExamination.findOne = () => ({
    populate: () => ({
      lean: async () => mockExamInDb,
    }),
  });

  const resPublic = createMockRes();
  await getPublicLiveExamInfo({ params: { slugOrToken: "secure-mock-test-12345" } }, resPublic);

  assert(resPublic.statusCode === 200, "Public lookup succeeds with 200 OK");
  assert(resPublic.body.title === "Secure Mock Exam", "Public response includes exam title");
  assert(resPublic.body.totalQuestions === 1, "Public response includes total question count");
  assert(resPublic.body.questions === undefined, "Zero Answer Leakage: questions array is omitted");
  assert(resPublic.body.correctAnswer === undefined, "Zero Answer Leakage: correctAnswer is omitted");
  assert(resPublic.body.explanation === undefined, "Zero Answer Leakage: explanation is omitted");
  assert(resPublic.body.options === undefined, "Zero Answer Leakage: options array is omitted");

  LiveExamination.findOne = origFindOne;

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runPhase2Tests().catch((err) => {
  console.error("Test Suite Crashed:", err);
  process.exit(1);
});
