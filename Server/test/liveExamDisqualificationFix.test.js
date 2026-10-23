const assert = require("assert");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const LiveExamination = require("../models/LiveExamination");
const LiveExamAttempt = require("../models/LiveExamAttempt");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const {
  getStudentLiveExamState,
  joinLiveExamLobby,
  startLiveExamAttempt,
  updateLiveExam,
} = require("../controllers/liveExamController");

function mockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("==================================================");
  console.log(" PREPMARK LIVE EXAM DISQUALIFICATION REGRESSION   ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function expect(condition, msg) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully.\n");

    // Clean test fixture IDs
    const studentId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    // Create a mock quiz blueprint
    const testQuiz = await Quiz.create({
      title: "Regression Test Quiz",
      subject: "General Studies",
      examName: "BPSC TRE",
      duration: 30,
      marksPerQuestion: 1,
      negativeMarking: 0,
      passPercentage: 50,
      createdBy: adminId,
      questions: [
        {
          questionEnglish: "Sample question?",
          questionHindi: "नमूना प्रश्न?",
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
        },
      ],
    });

    const now = new Date();
    const startTime = new Date(now.getTime() - 5 * 60 * 1000); // Started 5 mins ago
    const endTime = new Date(now.getTime() + 25 * 60 * 1000);  // Ends in 25 mins

    const testExam = await LiveExamination.create({
      title: "BPSC TRE - Live Regression Exam",
      quizId: testQuiz._id,
      createdBy: adminId,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      duration: 30,
      entryWindowMinutes: 15,
      allowLateEntry: true,
      webcamRule: "disabled",
      status: "live",
      shareSlug: `bpsc-test-reg-${Date.now()}`,
      shareToken: `token-${Date.now()}-${Math.random().toString(36).substring(2)}`,
    });

    // Test Scenario: Student has an attempt previously marked 'disqualified'
    // (e.g. from an earlier cancelled/ended session before they actually started)
    const testAttempt = await LiveExamAttempt.create({
      liveExamId: testExam._id,
      studentId: studentId,
      quizId: testQuiz._id,
      status: "disqualified",
      startedAt: null,
      resultId: null,
      savedAnswers: {},
    });

    console.log("Test 1: getStudentLiveExamState allows unstarted disqualified attempts to start when exam is live");
    {
      const req = {
        params: { slugOrToken: testExam.shareSlug },
        user: { _id: studentId, role: "student" },
      };
      const res = mockRes();
      await getStudentLiveExamState(req, res);

      expect(res.statusCode === 200, "State returned HTTP 200");
      expect(res.data.canStart === true, "canStart is true for unstarted candidate");
      expect(res.data.startBlockReason === null, "startBlockReason is null");
    }

    console.log("\nTest 2: joinLiveExamLobby resets unstarted disqualified attempt to in_lobby");
    {
      const req = {
        params: { id: testExam._id.toString() },
        user: { _id: studentId, role: "student" },
        ip: "127.0.0.1",
      };
      const res = mockRes();
      await joinLiveExamLobby(req, res);

      expect(res.statusCode === 200, "Join lobby returned HTTP 200");
      const updatedAttempt = await LiveExamAttempt.findById(testAttempt._id);
      expect(updatedAttempt.status === "in_lobby", "Attempt status successfully transitioned to in_lobby");
    }

    console.log("\nTest 3: startLiveExamAttempt allows unstarted attempt to start cleanly without 403");
    {
      // Set status back to 'disqualified' to test direct start call resilience
      await LiveExamAttempt.findByIdAndUpdate(testAttempt._id, { status: "disqualified" });

      const req = {
        params: { id: testExam._id.toString() },
        body: { webcamStatus: "none" },
        user: { _id: studentId, role: "student" },
        ip: "127.0.0.1",
      };
      const res = mockRes();
      await startLiveExamAttempt(req, res);

      expect(res.statusCode === 200, "Start attempt returned HTTP 200 (not 403)");
      expect(Boolean(res.data.attemptId), "Valid attemptId returned in payload");
      expect(Boolean(res.data.serverDeadline), "Valid serverDeadline returned");

      const inProgressAttempt = await LiveExamAttempt.findById(testAttempt._id);
      expect(inProgressAttempt.status === "in_progress", "Attempt status is now in_progress");
      expect(inProgressAttempt.startedAt !== null, "startedAt timestamp is set");
    }

    console.log("\nTest 4: Submitting attempt prevents future re-starts");
    {
      // Mark as submitted
      await LiveExamAttempt.findByIdAndUpdate(testAttempt._id, {
        status: "submitted",
        resultId: new mongoose.Types.ObjectId(),
      });

      const req = {
        params: { id: testExam._id.toString() },
        body: { webcamStatus: "none" },
        user: { _id: studentId, role: "student" },
      };
      const res = mockRes();
      await startLiveExamAttempt(req, res);

      expect(res.statusCode === 400, "Rejects re-starting submitted attempt with HTTP 400");
      expect(res.data.message.includes("already submitted"), "Displays 'already submitted' message");
    }

    console.log("\nTest 5: updateLiveExam unblocks unsubmitted disqualified attempts when rescheduled into the future");
    {
      const candidate2Id = new mongoose.Types.ObjectId();
      const attempt2 = await LiveExamAttempt.create({
        liveExamId: testExam._id,
        studentId: candidate2Id,
        quizId: testQuiz._id,
        status: "disqualified",
        startedAt: null,
        resultId: null,
      });

      const req = {
        params: { id: testExam._id.toString() },
        body: {
          scheduledStartTime: new Date(Date.now() + 60 * 1000).toISOString(),
          scheduledEndTime: new Date(Date.now() + 2700 * 1000).toISOString(),
          duration: 30,
        },
        user: { _id: adminId, fullName: "Admin Test", role: "admin" },
        ip: "127.0.0.1",
      };
      const res = mockRes();
      await updateLiveExam(req, res);

      expect(res.statusCode === 200, "updateLiveExam returned HTTP 200");
      const refreshedAttempt2 = await LiveExamAttempt.findById(attempt2._id);
      expect(refreshedAttempt2.status === "registered", "Unstarted disqualified attempt reset to registered on reschedule");

      // Cleanup candidate2 attempt
      await LiveExamAttempt.deleteOne({ _id: attempt2._id });
    }

    // Cleanup test fixtures
    await Quiz.deleteOne({ _id: testQuiz._id });
    await LiveExamination.deleteOne({ _id: testExam._id });
    await LiveExamAttempt.deleteOne({ _id: testAttempt._id });

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTests();
