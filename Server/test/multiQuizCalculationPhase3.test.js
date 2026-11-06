const assert = require("assert");
const { submitQuiz } = require("../controllers/quizController");
const { gradeQuizAttempt } = require("../controllers/liveExamController");
const quizService = require("../services/quizService");
const Result = require("../models/Result");

async function runPhase3CalculationTests() {
  console.log("==================================================");
  console.log(" PREPMARK MULTI QUIZ CALCULATION: PHASE 3 TESTS  ");
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
    // ========================================================
    // TEST 1: Multi-Section Scoring, Accuracy, MaxMarks & Answers
    // ========================================================
    console.log("Test 1: Multi-Section Calculations (Different Max Marks, Negative Marking)");

    const sec1Id = "672b1234567890abcdef0001";
    const sec2Id = "672b1234567890abcdef0002";
    const q1Id = "672b1234567890abcdef0011";
    const q2Id = "672b1234567890abcdef0012";
    const q3Id = "672b1234567890abcdef0021";
    const q4Id = "672b1234567890abcdef0022";

    const mockMultiQuiz = {
      _id: "quiz_multi_phase3",
      title: "Comprehensive Multi Quiz",
      subject: "Science & Engineering",
      duration: 3600,
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
              questionEnglish: "Power unit?",
              correctAnswer: "Watt",
              options: ["Watt", "Pascal"]
            }
          ]
        },
        {
          _id: sec2Id,
          title: "Advanced Math",
          type: "standard",
          marksPerQuestion: 3,
          negativeMarking: 1.0,
          questions: [
            {
              _id: q3Id,
              questionEnglish: "d/dx(x^2)?",
              correctAnswer: "2x",
              options: ["2x", "x"]
            },
            {
              _id: q4Id,
              questionEnglish: "Integral of 1/x dx?",
              correctAnswer: "ln(x)",
              options: ["ln(x)", "e^x"]
            }
          ]
        }
      ]
    };

    quizService.previewQuiz = async () => mockMultiQuiz;

    let savedDoc = null;
    let modifiedFields = [];
    const mockAttempt1 = {
      _id: "attempt_p3_1",
      userId: "user_p3",
      quizId: "quiz_multi_phase3",
      status: "active",
      createdAt: new Date(Date.now() - 300000), // 300s elapsed
      markModified: function(field) {
        modifiedFields.push(field);
      },
      toObject: function() { return { ...this }; },
      save: async function() {
        savedDoc = this;
        return this;
      }
    };
    Result.findById = async () => mockAttempt1;

    // Student Answers:
    // Q1: "Newton" (Correct) -> +2.0 marks
    // Q2: "Pascal" (Incorrect) -> -0.5 marks
    // Section 1: Correct=1, Incorrect=1, Unanswered=0, Score=1.5, MaxMarks=4, Accuracy=50%
    // Q3: "2x" (Correct) -> +3.0 marks
    // Q4: "" (Unanswered) -> 0 marks
    // Section 2: Correct=1, Incorrect=0, Unanswered=1, Score=3.0, MaxMarks=6, Accuracy=100%
    // Overall: Score = 4.5, MaxPossibleMarks = 10, Total = 4, Correct = 2, Incorrect = 1, Unanswered = 1
    const req1 = {
      params: { attemptId: "attempt_p3_1" },
      body: {
        userAnswers: ["Newton", "Pascal", "2x", ""],
        timeTaken: 180,
        sectionTimings: {
          [sec1Id]: 100,
          [sec2Id]: 80
        },
        questionTimings: {
          [q1Id]: { timeSpent: 55, visitCount: 2, sectionId: sec1Id },
          [q2Id]: { timeSpent: 45, visitCount: 1, sectionId: sec1Id },
          [q3Id]: { timeSpent: 60, visitCount: 1, sectionId: sec2Id },
          [q4Id]: { timeSpent: 20, visitCount: 1, sectionId: sec2Id }
        }
      },
      user: { _id: "user_p3", role: "user" }
    };
    const res1 = createMockRes();

    await submitQuiz(req1, res1);

    testAssert(res1.statusCode === 200, "Submission succeeded with HTTP 200");
    testAssert(savedDoc.score === 4.5, `Overall score is 4.5 (got: ${savedDoc.score})`);
    testAssert(savedDoc.maxPossibleMarks === 10, `Overall maxPossibleMarks is 10 (got: ${savedDoc.maxPossibleMarks})`);
    testAssert(savedDoc.correct === 2, `Overall correct count is 2 (got: ${savedDoc.correct})`);
    testAssert(savedDoc.incorrect === 1, `Overall incorrect count is 1 (got: ${savedDoc.incorrect})`);
    testAssert(savedDoc.total === 4, `Overall total questions is 4 (got: ${savedDoc.total})`);

    // Verify Section 1 Results
    const sec1 = savedDoc.sectionResults.find(s => s.sectionId.toString() === sec1Id);
    testAssert(sec1 && sec1.score === 1.5, `Sec 1 Score is 1.5 (got: ${sec1?.score})`);
    testAssert(sec1 && sec1.maxMarks === 4, `Sec 1 MaxMarks is 4 (got: ${sec1?.maxMarks})`);
    testAssert(sec1 && sec1.correct === 1, `Sec 1 Correct is 1 (got: ${sec1?.correct})`);
    testAssert(sec1 && sec1.incorrect === 1, `Sec 1 Incorrect is 1 (got: ${sec1?.incorrect})`);
    testAssert(sec1 && sec1.attempted === 2, `Sec 1 Attempted is 2 (got: ${sec1?.attempted})`);
    testAssert(sec1 && sec1.unanswered === 0, `Sec 1 Unanswered is 0 (got: ${sec1?.unanswered})`);
    testAssert(sec1 && sec1.accuracy === 50, `Sec 1 Accuracy is 50% (got: ${sec1?.accuracy})`);

    // Verify Section 2 Results
    const sec2 = savedDoc.sectionResults.find(s => s.sectionId.toString() === sec2Id);
    testAssert(sec2 && sec2.score === 3, `Sec 2 Score is 3 (got: ${sec2?.score})`);
    testAssert(sec2 && sec2.maxMarks === 6, `Sec 2 MaxMarks is 6 (got: ${sec2?.maxMarks})`);
    testAssert(sec2 && sec2.correct === 1, `Sec 2 Correct is 1 (got: ${sec2?.correct})`);
    testAssert(sec2 && sec2.incorrect === 0, `Sec 2 Incorrect is 0 (got: ${sec2?.incorrect})`);
    testAssert(sec2 && sec2.attempted === 1, `Sec 2 Attempted is 1 (got: ${sec2?.attempted})`);
    testAssert(sec2 && sec2.unanswered === 1, `Sec 2 Unanswered is 1 (got: ${sec2?.unanswered})`);
    testAssert(sec2 && sec2.accuracy === 100, `Sec 2 Accuracy is 100% (got: ${sec2?.accuracy})`);

    // Verify Section sum equals Overall Score
    const sumSectionScores = sec1.score + sec2.score;
    testAssert(sumSectionScores === savedDoc.score, `Sum of section scores (${sumSectionScores}) equals overall score (${savedDoc.score})`);

    // Verify Question-level status, marks, userAnswer and timing
    const q1Doc = savedDoc.questions.find(q => q._id.toString() === q1Id);
    const q2Doc = savedDoc.questions.find(q => q._id.toString() === q2Id);
    const q3Doc = savedDoc.questions.find(q => q._id.toString() === q3Id);
    const q4Doc = savedDoc.questions.find(q => q._id.toString() === q4Id);

    testAssert(q1Doc.status === "correct" && q1Doc.marksObtained === 2 && q1Doc.userAnswer === "Newton", "Q1 status='correct', marks=+2, userAnswer='Newton'");
    testAssert(q2Doc.status === "incorrect" && q2Doc.marksObtained === -0.5 && q2Doc.userAnswer === "Pascal", "Q2 status='incorrect', marks=-0.5, userAnswer='Pascal'");
    testAssert(q3Doc.status === "correct" && q3Doc.marksObtained === 3 && q3Doc.userAnswer === "2x", "Q3 status='correct', marks=+3, userAnswer='2x'");
    testAssert(q4Doc.status === "unanswered" && q4Doc.marksObtained === 0 && q4Doc.userAnswer === null, "Q4 status='unanswered', marks=0, userAnswer=null");

    // Verify Mongoose markModified was invoked for mixed fields
    testAssert(modifiedFields.includes("questions") && modifiedFields.includes("sectionResults"), "Mongoose markModified called to prevent strict mode field discarding");

    // ========================================================
    // TEST 2: Duplicate Submission Protection & Idempotency
    // ========================================================
    console.log("\nTest 2: Duplicate Submission Protection");
    const submittedAttempt = {
      _id: "attempt_submitted",
      userId: "user_p3",
      quizId: "quiz_multi_phase3",
      status: "submitted",
      toObject: function() { return { ...this }; }
    };
    Result.findById = async () => submittedAttempt;

    const dupReq = {
      params: { attemptId: "attempt_submitted" },
      body: { userAnswers: ["Newton"], timeTaken: 50 },
      user: { _id: "user_p3", role: "user" }
    };
    const dupRes = createMockRes();
    await submitQuiz(dupReq, dupRes);
    testAssert(dupRes.statusCode === 400 && dupRes.data?.message?.includes("already been submitted"), "Duplicate submission blocked with HTTP 400");

    // ========================================================
    // TEST 3: BPSC Marking Mode with Option E Neutrality
    // ========================================================
    console.log("\nTest 3: BPSC Marking Scheme (Blank Penalized, Option E Neutral)");
    const bpscQuiz = {
      ...mockMultiQuiz,
      markingPattern: "bpsc",
      sections: [
        {
          _id: sec1Id,
          title: "BPSC GS",
          type: "standard",
          marksPerQuestion: 1,
          negativeMarking: 0.25,
          questions: [
            { _id: q1Id, correctAnswer: "A", options: ["A", "B", "C", "D", "E — Not Attempted"] },
            { _id: q2Id, correctAnswer: "B", options: ["A", "B", "C", "D", "E — Not Attempted"] },
            { _id: q3Id, correctAnswer: "C", options: ["A", "B", "C", "D", "E — Not Attempted"] }
          ]
        }
      ]
    };
    quizService.previewQuiz = async () => bpscQuiz;

    const mockAttemptBpsc = {
      _id: "attempt_bpsc",
      userId: "user_p3",
      quizId: "quiz_multi_phase3",
      status: "active",
      createdAt: new Date(Date.now() - 100000),
      markModified: () => {},
      toObject: function() { return { ...this }; },
      save: async function() { savedDoc = this; return this; }
    };
    Result.findById = async () => mockAttemptBpsc;

    // Q1: "A" (Correct) -> +1
    // Q2: "E — Not Attempted" (Neutral) -> 0
    // Q3: "" (Blank, in BPSC gets penalized) -> -0.25
    // Net Score: 0.75
    const bpscReq = {
      params: { attemptId: "attempt_bpsc" },
      body: {
        userAnswers: ["A", "E — Not Attempted", ""],
        timeTaken: 50
      },
      user: { _id: "user_p3", role: "user" }
    };
    const bpscRes = createMockRes();
    await submitQuiz(bpscReq, bpscRes);

    testAssert(savedDoc.score === 0.75, `BPSC net score is 0.75 (got: ${savedDoc.score})`);
    const bpscQ2 = savedDoc.questions.find(q => q._id.toString() === q2Id);
    const bpscQ3 = savedDoc.questions.find(q => q._id.toString() === q3Id);
    testAssert(bpscQ2.status === "unanswered" && bpscQ2.marksObtained === 0, "BPSC Option E treated as unanswered (0 penalty)");
    testAssert(bpscQ3.status === "incorrect" && bpscQ3.marksObtained === -0.25, "BPSC blank treated as incorrect (-0.25 penalty)");

    // ========================================================
    // TEST 4: Live Examination Parity (gradeQuizAttempt)
    // ========================================================
    console.log("\nTest 4: Live Examination Grading Parity");
    const liveGraded = gradeQuizAttempt(mockMultiQuiz, ["Newton", "Pascal", "2x", ""]);

    testAssert(liveGraded.score === 4.5, `Live Exam overall score matches: 4.5 (got: ${liveGraded.score})`);
    testAssert(liveGraded.maxPossibleMarks === 10, `Live Exam maxPossibleMarks matches: 10 (got: ${liveGraded.maxPossibleMarks})`);
    testAssert(liveGraded.sectionResults.length === 2, "Live Exam sectionResults generated");
    const liveSec1 = liveGraded.sectionResults.find(s => s.sectionId.toString() === sec1Id);
    testAssert(liveSec1 && liveSec1.score === 1.5 && liveSec1.maxMarks === 4 && liveSec1.accuracy === 50, "Live Exam section 1 analytics match standard quiz calculation");
    testAssert(liveGraded.dbQuestions[0].status === "correct" && liveGraded.dbQuestions[1].status === "incorrect", "Live Exam question statuses match standard quiz calculation");

    // ========================================================
    // TEST 5: Single Quiz Backward Compatibility
    // ========================================================
    console.log("\nTest 5: Single Quiz Backward Compatibility");
    const singleQuiz = {
      _id: "quiz_single",
      title: "Single Quiz",
      subject: "GK",
      duration: 15,
      markingPattern: "standard",
      questions: [
        { _id: "q_s1", questionEnglish: "Capital of India?", correctAnswer: "New Delhi", options: ["New Delhi", "Mumbai"], marksPerQuestion: 1, negativeMarking: 0 }
      ]
    };
    quizService.previewQuiz = async () => singleQuiz;

    const mockAttemptSingle = {
      _id: "attempt_single",
      userId: "user_p3",
      quizId: "quiz_single",
      status: "active",
      createdAt: new Date(Date.now() - 50000),
      markModified: () => {},
      toObject: function() { return { ...this }; },
      save: async function() { savedDoc = this; return this; }
    };
    Result.findById = async () => mockAttemptSingle;

    const singleReq = {
      params: { attemptId: "attempt_single" },
      body: { userAnswers: ["New Delhi"], timeTaken: 25 },
      user: { _id: "user_p3", role: "user" }
    };
    const singleRes = createMockRes();
    await submitQuiz(singleReq, singleRes);

    testAssert(savedDoc.score === 1, `Single quiz score is 1 (got: ${savedDoc.score})`);
    testAssert(savedDoc.total === 1, `Single quiz total is 1 (got: ${savedDoc.total})`);
    testAssert(savedDoc.sectionResults.length === 0, "Single quiz produces empty sectionResults without phantom sections");
    testAssert(savedDoc.questions[0].status === "correct" && savedDoc.questions[0].marksObtained === 1, "Single quiz question status is 'correct'");

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

runPhase3CalculationTests();
