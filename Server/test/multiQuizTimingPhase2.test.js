const assert = require("assert");
const { submitQuiz } = require("../controllers/quizController");
const quizService = require("../services/quizService");
const Result = require("../models/Result");

async function runUnitTests() {
  console.log("==================================================");
  console.log(" PREPMARK MULTI QUIZ TIMING ENGINE: UNIT TESTS   ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function testAssert(condition, testName) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
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

  const origPreview = quizService.previewQuiz;
  const origFindById = Result.findById;
  const origFindOne = Result.findOne;
  const origCreate = Result.create;

  try {
    const sec1Id = "672b1234567890abcdef0001";
    const sec2Id = "672b1234567890abcdef0002";
    const q1Id = "672b1234567890abcdef0011";
    const q2Id = "672b1234567890abcdef0012";
    const q3Id = "672b1234567890abcdef0021";

    const mockQuiz = {
      _id: "quiz_multi_123",
      title: "Multi Section Mock Exam",
      subject: "Science",
      duration: 3600, // 60 mins in seconds
      markingPattern: "standard",
      showResultAfterSubmission: true,
      sections: [
        {
          _id: sec1Id,
          title: "Physics",
          type: "standard",
          marksPerQuestion: 2,
          negativeMarking: 0.5,
          questions: [
            {
              _id: q1Id,
              questionEnglish: "Force unit?",
              correctAnswer: "Newton",
              options: ["Newton", "Joule"]
            },
            {
              _id: q2Id,
              questionEnglish: "Energy unit?",
              correctAnswer: "Joule",
              options: ["Newton", "Joule"]
            }
          ]
        },
        {
          _id: sec2Id,
          title: "Chemistry",
          type: "standard",
          marksPerQuestion: 2,
          negativeMarking: 0.5,
          questions: [
            {
              _id: q3Id,
              questionEnglish: "Water formula?",
              correctAnswer: "H2O",
              options: ["H2O", "CO2"]
            }
          ]
        }
      ]
    };

    quizService.previewQuiz = async () => mockQuiz;

    // --- TEST 1: Accurate Question & Section Timings Recorded ---
    console.log("Test 1: Multi-Quiz Submission with Verified Timings");
    let savedDoc = null;
    const mockAttempt = {
      _id: "attempt_1",
      userId: "user_123",
      quizId: "quiz_multi_123",
      status: "active",
      createdAt: new Date(Date.now() - 300000), // 300 seconds ago
      toObject: function() { return { ...this }; },
      save: async function() {
        savedDoc = this;
        return this;
      }
    };

    Result.findById = async () => mockAttempt;

    const req1 = {
      params: { attemptId: "attempt_1" },
      body: {
        userAnswers: ["Newton", "Joule", "H2O"],
        timeTaken: 150,
        sectionTimings: {
          [sec1Id]: 90,
          [sec2Id]: 60
        },
        questionTimings: {
          [q1Id]: { timeSpent: 50, visitCount: 2, sectionId: sec1Id },
          [q2Id]: { timeSpent: 40, visitCount: 1, sectionId: sec1Id },
          [q3Id]: { timeSpent: 60, visitCount: 1, sectionId: sec2Id }
        }
      },
      user: { _id: "user_123", role: "user" }
    };
    const res1 = createMockRes();

    await submitQuiz(req1, res1);

    testAssert(res1.statusCode === 200, "Multi quiz submitted successfully (HTTP 200)");
    testAssert(savedDoc !== null, "Attempt saved in database");
    testAssert(savedDoc.status === "submitted", "Attempt marked as submitted");
    testAssert(savedDoc.timeTaken === 150, `Overall timeTaken recorded as 150s (got: ${savedDoc.timeTaken})`);

    const sec1Res = savedDoc.sectionResults.find(s => s.sectionId.toString() === sec1Id);
    const sec2Res = savedDoc.sectionResults.find(s => s.sectionId.toString() === sec2Id);
    testAssert(sec1Res && sec1Res.timeTaken === 90, `Section 1 timeTaken is 90s (got: ${sec1Res?.timeTaken})`);
    testAssert(sec2Res && sec2Res.timeTaken === 60, `Section 2 timeTaken is 60s (got: ${sec2Res?.timeTaken})`);

    const q1Res = savedDoc.questions.find(q => q._id.toString() === q1Id);
    const q2Res = savedDoc.questions.find(q => q._id.toString() === q2Id);
    const q3Res = savedDoc.questions.find(q => q._id.toString() === q3Id);
    testAssert(q1Res && q1Res.timeSpent === 50 && q1Res.visitCount === 2, `Q1 timeSpent=50, visitCount=2 (got: ${q1Res?.timeSpent}, ${q1Res?.visitCount})`);
    testAssert(q2Res && q2Res.timeSpent === 40 && q2Res.visitCount === 1, `Q2 timeSpent=40, visitCount=1 (got: ${q2Res?.timeSpent}, ${q2Res?.visitCount})`);
    testAssert(q3Res && q3Res.timeSpent === 60 && q3Res.visitCount === 1, `Q3 timeSpent=60, visitCount=1 (got: ${q3Res?.timeSpent}, ${q3Res?.visitCount})`);

    // --- TEST 2: Clamping Against Server Elapsed Time & ID Whitelisting ---
    console.log("\nTest 2: Server-authoritative timing protection and forged ID rejection");
    const mockAttempt2 = {
      _id: "attempt_2",
      userId: "user_123",
      quizId: "quiz_multi_123",
      status: "active",
      createdAt: new Date(Date.now() - 60000), // Only 60 seconds ago on server
      toObject: function() { return { ...this }; },
      save: async function() {
        savedDoc = this;
        return this;
      }
    };
    Result.findById = async () => mockAttempt2;

    const fakeSecId = "fake_section_999";
    const fakeQId = "fake_question_999";

    const req2 = {
      params: { attemptId: "attempt_2" },
      body: {
        userAnswers: ["Newton", "Newton", "H2O"],
        timeTaken: 99999, // Cheating attempt: claims 99999 seconds when server only elapsed 60s
        sectionTimings: {
          [sec1Id]: 40,
          [fakeSecId]: 500 // Forged section ID
        },
        questionTimings: {
          [q1Id]: { timeSpent: 20, visitCount: 1, sectionId: sec1Id },
          [fakeQId]: { timeSpent: 900, visitCount: 10 } // Forged question ID
        }
      },
      user: { _id: "user_123", role: "user" }
    };
    const res2 = createMockRes();

    await submitQuiz(req2, res2);

    testAssert(savedDoc.timeTaken <= 90, `Excessive client time was clamped against authoritative server elapsed time (got: ${savedDoc.timeTaken})`);
    const containsFakeSec = savedDoc.sectionResults.some(s => s.sectionId === fakeSecId);
    testAssert(!containsFakeSec, "Forged section ID was rejected");
    const containsFakeQ = savedDoc.questions.some(q => q._id === fakeQId);
    testAssert(!containsFakeQ, "Forged question ID was not added to questions");

    // --- TEST 3: Legacy Single Quiz Submissions Unchanged ---
    console.log("\nTest 3: Backward compatibility for Single Quizzes (no section/question timings)");
    const mockSingleQuiz = {
      _id: "quiz_single_456",
      title: "Single Quiz",
      subject: "Math",
      duration: 30, // 30 minutes
      markingPattern: "standard",
      showResultAfterSubmission: true,
      questions: [
        {
          _id: "q_single_1",
          questionEnglish: "2 + 2?",
          correctAnswer: "4",
          options: ["3", "4", "5"]
        }
      ]
    };
    quizService.previewQuiz = async () => mockSingleQuiz;

    const mockAttempt3 = {
      _id: "attempt_3",
      userId: "user_123",
      quizId: "quiz_single_456",
      status: "active",
      createdAt: new Date(Date.now() - 45000),
      toObject: function() { return { ...this }; },
      save: async function() {
        savedDoc = this;
        return this;
      }
    };
    Result.findById = async () => mockAttempt3;

    const req3 = {
      params: { attemptId: "attempt_3" },
      body: {
        userAnswers: ["4"],
        timeTaken: 45
        // zero sectionTimings or questionTimings
      },
      user: { _id: "user_123", role: "user" }
    };
    const res3 = createMockRes();

    await submitQuiz(req3, res3);

    testAssert(savedDoc.score === 1, `Single quiz score computed properly: 1 (got: ${savedDoc.score})`);
    testAssert(savedDoc.timeTaken === 45, `Single quiz timeTaken preserved as 45s (got: ${savedDoc.timeTaken})`);
    testAssert(savedDoc.questions.length === 1 && savedDoc.questions[0].correctAnswer === "4", "Single quiz questions intact");

  } finally {
    quizService.previewQuiz = origPreview;
    Result.findById = origFindById;
    Result.findOne = origFindOne;
    Result.create = origCreate;
  }

  console.log("\n==================================================");
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runUnitTests();
