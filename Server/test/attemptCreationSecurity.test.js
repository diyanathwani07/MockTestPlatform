const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Quiz = require("../models/Quiz");
const Result = require("../models/Result");
const { getQuizById, startQuizAttempt, submitQuiz } = require("../controllers/quizController");

async function runAttemptCreationRegressionTests() {
  console.log("==================================================");
  console.log(" PREPMARK EXAM ATTEMPT ON GET REGRESSION SUITE   ");
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

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI missing in .env");
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log("Connected to MongoDB for attempt verification.\n");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    return;
  }

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

  let testStudent;
  let testQuiz;
  let paidQuiz;

  try {
    testStudent = await User.findOne({ role: "user" });
    if (!testStudent) {
      console.log("No student found. Skipping.");
      return;
    }

    testQuiz = await Quiz.create({
      title: "Attempt Safety Verification Quiz",
      subject: "Computer Science",
      duration: 30,
      status: "Published",
      published: true,
      isPaid: false,
      questions: [
        {
          questionEnglish: "What is 2 + 2?",
          options: ["3", "4", "5", "6"],
          correctAnswer: "4",
          explanation: "Basic math."
        }
      ],
      createdBy: testStudent._id
    });

    paidQuiz = await Quiz.create({
      title: "Attempt Safety Paid Quiz",
      subject: "Aptitude",
      duration: 45,
      status: "Published",
      published: true,
      isPaid: true,
      price: 299,
      questions: [
        {
          questionEnglish: "What is 10 / 2?",
          options: ["2", "4", "5", "10"],
          correctAnswer: "5",
          explanation: "Division."
        }
      ],
      createdBy: testStudent._id
    });

    // ── TEST 1: GET quiz details does NOT create a Result record ──
    console.log("Test 1: GET /api/quizzes/:id does not create a Result");
    const countBeforeGet = await Result.countDocuments({ userId: testStudent._id, quizId: testQuiz._id });
    
    const req1 = {
      params: { id: testQuiz._id.toString() },
      user: testStudent
    };
    const res1 = createMockRes();
    await getQuizById(req1, res1);

    const countAfterGet = await Result.countDocuments({ userId: testStudent._id, quizId: testQuiz._id });
    assert(res1.statusCode === 200, "GET /api/quizzes/:id returns HTTP 200");
    assert(countBeforeGet === countAfterGet, `No Result document created on GET (Before: ${countBeforeGet}, After: ${countAfterGet})`);
    assert(res1.data.attemptId === null, "res.data.attemptId is null when no active attempt exists");

    // ── TEST 2: Repeated GET calls never create orphan attempts ──
    console.log("\nTest 2: Repeated GET calls do not inflate Result documents");
    for (let i = 0; i < 5; i++) {
      const res = createMockRes();
      await getQuizById(req1, res);
    }
    const countAfter5Gets = await Result.countDocuments({ userId: testStudent._id, quizId: testQuiz._id });
    assert(countBeforeGet === countAfter5Gets, `5 consecutive GET requests still created 0 Result records`);

    // ── TEST 3: Starting an attempt via POST /api/quizzes/:id/start-attempt creates 1 active attempt ──
    console.log("\nTest 3: POST /api/quizzes/:id/start-attempt creates active attempt");
    const req3 = {
      params: { id: testQuiz._id.toString() },
      user: testStudent
    };
    const res3 = createMockRes();
    await startQuizAttempt(req3, res3);
    assert(res3.statusCode === 200, "startQuizAttempt returns HTTP 200");
    assert(res3.data.success === true, "Response has success: true");
    assert(res3.data.attemptId != null, "Valid attemptId returned");

    const activeAttempt = await Result.findById(res3.data.attemptId);
    assert(activeAttempt && activeAttempt.status === "active", "Attempt in database is status: 'active'");

    // ── TEST 4: Repeated start-attempt calls are IDEMPOTENT (resume active attempt) ──
    console.log("\nTest 4: Repeated start-attempt calls are idempotent");
    const countBeforeRepeat = await Result.countDocuments({ userId: testStudent._id, quizId: testQuiz._id });
    const res4 = createMockRes();
    await startQuizAttempt(req3, res4);
    const countAfterRepeat = await Result.countDocuments({ userId: testStudent._id, quizId: testQuiz._id });

    assert(countBeforeRepeat === countAfterRepeat, "Duplicate start calls do NOT create duplicate active attempts");
    assert(res4.data.attemptId.toString() === res3.data.attemptId.toString(), "Returns the existing ongoing attemptId");

    // ── TEST 5: Subsequent GET calls now attach the active attemptId for resume ──
    console.log("\nTest 5: GET /api/quizzes/:id attaches ongoing attemptId for re-entry/resume");
    const res5 = createMockRes();
    await getQuizById(req1, res5);
    assert(res5.data.attemptId && res5.data.attemptId.toString() === res3.data.attemptId.toString(), "GET returns active attemptId for seamless test re-entry");

    // ── TEST 6: Unpurchased paid exam cannot be started ──
    console.log("\nTest 6: Unpurchased paid exam cannot be started");
    const reqPaid = {
      params: { id: paidQuiz._id.toString() },
      user: testStudent
    };
    const resPaid = createMockRes();
    await startQuizAttempt(reqPaid, resPaid);
    assert(resPaid.statusCode === 403, "Rejects unpurchased paid exam start with HTTP 403");

    // ── TEST 7: Submitting the attempt sets status to submitted ──
    console.log("\nTest 7: Submitting the attempt updates it to submitted");
    const reqSubmit = {
      params: { attemptId: res3.data.attemptId.toString() },
      body: {
        userAnswers: [{ questionId: testQuiz.questions[0]._id, selectedOption: "4" }],
        timeTaken: 120
      },
      user: testStudent
    };
    const resSubmit = createMockRes();
    await submitQuiz(reqSubmit, resSubmit);
    assert(resSubmit.statusCode === 200, "submitQuiz succeeds with HTTP 200");

    const submittedAttempt = await Result.findById(res3.data.attemptId);
    assert(submittedAttempt.status === "submitted", "Result status transitioned to 'submitted'");

    // ── TEST 8: GET after submission returns attemptId null (does not re-open submitted) ──
    console.log("\nTest 8: GET after submission returns attemptId null");
    const res8 = createMockRes();
    await getQuizById(req1, res8);
    assert(res8.data.attemptId === null, "GET does not attach already-submitted attemptId");

  } finally {
    // Cleanup test quizzes & results
    if (testQuiz) {
      await Quiz.deleteOne({ _id: testQuiz._id });
      await Result.deleteMany({ quizId: testQuiz._id });
    }
    if (paidQuiz) {
      await Quiz.deleteOne({ _id: paidQuiz._id });
      await Result.deleteMany({ quizId: paidQuiz._id });
    }
    await mongoose.disconnect();
  }

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runAttemptCreationRegressionTests();
