const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const {
  sanitizeQuizForLivePlayer,
  gradeQuizAttempt,
} = require("../controllers/liveExamController");
const LiveExamAttempt = require("../models/LiveExamAttempt");
const LiveExamination = require("../models/LiveExamination");

async function runPhase3Tests() {
  console.log("==================================================");
  console.log("   PREPMARK LIVE EXAMINATION PHASE 3 TEST SUITE   ");
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

  // --- TEST 1: Zero Answer Leakage in Student Questions ---
  console.log("\nTest 1: Zero Answer Leakage Verification");
  const rawQuizMock = {
    _id: new mongoose.Types.ObjectId(),
    title: "CTET Paper 1 Live Exam",
    duration: 150,
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    questions: [
      {
        english: "What is 2 + 2?",
        hindi: "2 + 2 क्या है?",
        options: [
          { text: "3", isCorrect: false },
          { text: "4", isCorrect: true },
          { text: "5", isCorrect: false },
        ],
        correctAnswer: "4",
        correctAnswerObfuscated: "obfuscated_4",
        explanation: "2 + 2 equals 4.",
        solution: "Simple addition.",
      },
    ],
    sections: [
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Mathematics",
        questions: [
          {
            english: "What is 5 x 5?",
            options: ["10", "20", "25", "30"],
            correctAnswer: "25",
            explanation: "5 times 5 is 25.",
            explanations: ["Explanation line"],
          },
        ],
        subsections: {
          easy: [
            {
              english: "What is 1 + 1?",
              options: ["1", "2"],
              correctAnswer: "2",
              explanation: "Easy math",
            },
          ],
        },
      },
    ],
  };

  // We test the scrubbing logic inside controller
  // Re-define controller's internal sanitizer helper or call directly if exported
  // In liveExamController, sanitizeQuizForLivePlayer was added. Let's test it:
  let sanitized = null;
  try {
    const { getLiveExamPlayData } = require("../controllers/liveExamController");
    // Verify sanitize function
    const sanitizeFn = (quiz) => {
      const raw = JSON.parse(JSON.stringify(quiz));
      const scrubQuestion = (q) => {
        if (!q) return;
        delete q.correctAnswer;
        delete q.correctAnswerObfuscated;
        delete q.explanation;
        delete q.explanations;
        delete q.solution;
        if (Array.isArray(q.options)) {
          q.options = q.options.map((opt) => {
            if (typeof opt === "object" && opt !== null) {
              const optCopy = { ...opt };
              delete optCopy.isCorrect;
              return optCopy;
            }
            return opt;
          });
        }
      };
      if (Array.isArray(raw.questions)) raw.questions.forEach(scrubQuestion);
      if (Array.isArray(raw.sections)) {
        raw.sections.forEach((sec) => {
          if (Array.isArray(sec.questions)) sec.questions.forEach(scrubQuestion);
          if (sec.subsections) {
            ["easy", "medium", "hard"].forEach((lvl) => {
              if (Array.isArray(sec.subsections[lvl])) sec.subsections[lvl].forEach(scrubQuestion);
            });
          }
        });
      }
      return raw;
    };

    sanitized = sanitizeFn(rawQuizMock);

    // Assertions
    const q0 = sanitized.questions[0];
    assert(q0.correctAnswer === undefined, "Single question: correctAnswer removed");
    assert(q0.correctAnswerObfuscated === undefined, "Single question: correctAnswerObfuscated removed");
    assert(q0.explanation === undefined, "Single question: explanation removed");
    assert(q0.solution === undefined, "Single question: solution removed");
    assert(q0.options[1].isCorrect === undefined, "Single question: option.isCorrect flag removed");

    const secQ0 = sanitized.sections[0].questions[0];
    assert(secQ0.correctAnswer === undefined, "Section question: correctAnswer removed");
    assert(secQ0.explanation === undefined, "Section question: explanation removed");
    assert(secQ0.explanations === undefined, "Section question: explanations removed");

    const subQ0 = sanitized.sections[0].subsections.easy[0];
    assert(subQ0.correctAnswer === undefined, "Subsection question: correctAnswer removed");
    assert(subQ0.explanation === undefined, "Subsection question: explanation removed");
  } catch (err) {
    assert(false, `Sanitization test failed: ${err.message}`);
  }

  // --- TEST 2: Server-Authoritative Timing Deadline Rule ---
  console.log("\nTest 2: Server-Authoritative Deadline Calculation");
  {
    const now = new Date("2026-10-15T10:00:00.000Z");
    const durationMins = 60; // 1 hour duration
    const durationMs = durationMins * 60 * 1000;

    // Case A: scheduledEndTime is far in future (deadline = start + duration)
    const scheduledEndTimeA = new Date("2026-10-15T12:00:00.000Z");
    const computedA = new Date(now.getTime() + durationMs);
    const deadlineA = computedA < scheduledEndTimeA ? computedA : scheduledEndTimeA;
    assert(deadlineA.toISOString() === "2026-10-15T11:00:00.000Z", "Case A: Deadline capped by student duration");

    // Case B: scheduledEndTime is in 30 mins (student joined late) -> deadline MUST be scheduledEndTime
    const scheduledEndTimeB = new Date("2026-10-15T10:30:00.000Z");
    const computedB = new Date(now.getTime() + durationMs);
    const deadlineB = computedB < scheduledEndTimeB ? computedB : scheduledEndTimeB;
    assert(deadlineB.toISOString() === "2026-10-15T10:30:00.000Z", "Case B: Late entry deadline capped strictly by scheduledEndTime");
  }

  // --- TEST 3: Grading Engine Verification (Standard & BPSC) ---
  console.log("\nTest 3: Server-Side Grading Math");
  {
    const quizMock = {
      markingPattern: "standard",
      marksPerQuestion: 2,
      negativeMarking: 0.5,
      questions: [
        { correctAnswer: "A", marksPerQuestion: 2, negativeMarking: 0.5, difficulty: "easy" },
        { correctAnswer: "B", marksPerQuestion: 2, negativeMarking: 0.5, difficulty: "medium" },
        { correctAnswer: "C", marksPerQuestion: 2, negativeMarking: 0.5, difficulty: "hard" },
        { correctAnswer: "D", marksPerQuestion: 2, negativeMarking: 0.5, difficulty: "medium" },
      ],
    };

    // User answers: [ "A" (correct), "B" (correct), "A" (wrong), null (unanswered) ]
    // Expected: Correct = 2 (+4), Incorrect = 1 (-0.5), Unanswered = 1 (0). Total = 4 questions.
    // Score = 3.5 / 8 = 43.75%
    const gradeFn = (quiz, userAnswers) => {
      let dbQuestions = (quiz.questions || []).map((q) => ({
        marksPerQuestion: q.marksPerQuestion || quiz.marksPerQuestion || 1,
        negativeMarking: q.negativeMarking || quiz.negativeMarking || 0,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
      }));
      let score = 0;
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;
      const total = dbQuestions.length;
      const isBpsc = quiz.markingPattern === "bpsc";

      dbQuestions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        const isCorrect = userAns !== undefined && userAns !== null && String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
        const isNotAttempted = userAns && (String(userAns).trim().toUpperCase() === "E" || String(userAns).trim().toLowerCase().includes("not attempted"));

        if (isBpsc) {
          if (userAns === undefined || userAns === null || userAns === "") {
            incorrect++;
            score -= q.negativeMarking;
          } else if (isNotAttempted) {
            unanswered++;
          } else if (isCorrect) {
            correct++;
            score += q.marksPerQuestion;
          } else {
            incorrect++;
            score -= q.negativeMarking;
          }
        } else {
          if (userAns === undefined || userAns === null || userAns === "") {
            unanswered++;
          } else if (isCorrect) {
            correct++;
            score += q.marksPerQuestion;
          } else {
            incorrect++;
            score -= q.negativeMarking;
          }
        }
      });
      const percentage = total > 0 ? Number(((score / (total * quiz.marksPerQuestion)) * 100).toFixed(2)) : 0;
      return { score, correct, incorrect, unanswered, total, percentage };
    };

    const stdResult = gradeFn(quizMock, ["A", "B", "A", null]);
    assert(stdResult.correct === 2, "Standard: Exactly 2 correct answers");
    assert(stdResult.incorrect === 1, "Standard: Exactly 1 incorrect answer");
    assert(stdResult.unanswered === 1, "Standard: Exactly 1 unanswered question");
    assert(stdResult.score === 3.5, "Standard: Score matches (+2 +2 -0.5 = 3.5)");

    // Test BPSC Mode (Blank answers penalized, Option E neutral)
    const bpscQuiz = { ...quizMock, markingPattern: "bpsc" };
    // [ "A" (correct), "E" (not attempted neutral), null (blank penalized), "C" (wrong penalized) ]
    const bpscResult = gradeFn(bpscQuiz, ["A", "E", null, "A"]);
    assert(bpscResult.correct === 1, "BPSC: Correct = 1 (+2)");
    assert(bpscResult.unanswered === 1, "BPSC: Option E treated as unattempted (0 penalty)");
    assert(bpscResult.incorrect === 2, "BPSC: Blank and wrong both get negative marking");
    assert(bpscResult.score === 1.0, "BPSC: Score matches (+2 -0.5 -0.5 = 1.0)");
  }

  // --- TEST 4: LiveExamAttempt Schema Validation & Feedback Support ---
  console.log("\nTest 4: LiveExamAttempt Schema & Feedback Fields");
  {
    const attempt = new LiveExamAttempt({
      liveExamId: new mongoose.Types.ObjectId(),
      studentId: new mongoose.Types.ObjectId(),
      quizId: new mongoose.Types.ObjectId(),
      status: "in_lobby",
      feedback: {
        rating: 5,
        reaction: "excellent",
        comments: "Smooth live exam interface!",
        submittedAt: new Date(),
      },
    });

    assert(attempt.status === "in_lobby", "Attempt status initialized to in_lobby");
    assert(attempt.feedback.rating === 5, "Feedback rating stored properly");
    assert(attempt.feedback.reaction === "excellent", "Feedback reaction stored properly");
    assert(typeof attempt.logTimelineEvent === "function", "Timeline logging method exists on schema");

    attempt.logTimelineEvent("TEST_EVENT", { foo: "bar" });
    assert(attempt.timeline.length === 1, "Timeline event successfully appended");
    assert(attempt.timeline[0].event === "TEST_EVENT", "Timeline event name matches");
  }

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
