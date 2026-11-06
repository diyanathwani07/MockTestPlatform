const assert = require("assert");

console.log("==================================================");
console.log(" PREPMARK MULTI QUIZ RESULT UI: PHASE 4 TESTS     ");
console.log("==================================================");

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// Emulate Result.jsx helper logic
const formatTimingSafe = (seconds) => {
  if (seconds === undefined || seconds === null || seconds === "") return "Not available";
  const num = Number(seconds);
  if (isNaN(num)) return "Not available";
  if (num === 0) return "0s";
  const m = Math.floor(num / 60);
  const s = Math.round(num % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
};

// 1. Safe Timing Formatter & Non-Fabrication
it("formatTimingSafe returns 'Not available' when timing was never recorded (null/undefined/'')", () => {
  assert.strictEqual(formatTimingSafe(null), "Not available");
  assert.strictEqual(formatTimingSafe(undefined), "Not available");
  assert.strictEqual(formatTimingSafe(""), "Not available");
  assert.strictEqual(formatTimingSafe("unknown"), "Not available");
});

it("formatTimingSafe formats 0s, seconds only, and minutes+seconds correctly", () => {
  assert.strictEqual(formatTimingSafe(0), "0s");
  assert.strictEqual(formatTimingSafe(45), "45s");
  assert.strictEqual(formatTimingSafe(125), "2m 5s");
  assert.strictEqual(formatTimingSafe(3600), "60m 0s");
});

// 2. Multi Quiz Detection
it("isMultiQuiz reliably identifies Multi Quiz vs Single Quiz", () => {
  const multiQuizData = {
    sectionResults: [{ sectionId: "sec-1", sectionTitle: "Math", totalQuestions: 10 }]
  };
  const isMulti = Boolean(multiQuizData?.sectionResults && Array.isArray(multiQuizData.sectionResults) && multiQuizData.sectionResults.length > 0);
  assert.strictEqual(isMulti, true);

  const singleQuizData = {
    total: 10,
    score: 8,
    sectionResults: []
  };
  const isSingle = Boolean(singleQuizData?.sectionResults && Array.isArray(singleQuizData.sectionResults) && singleQuizData.sectionResults.length > 0);
  assert.strictEqual(isSingle, false);

  const legacyNoSectionData = {
    total: 10,
    score: 8
  };
  const isLegacy = Boolean(legacyNoSectionData?.sectionResults && Array.isArray(legacyNoSectionData.sectionResults) && legacyNoSectionData.sectionResults.length > 0);
  assert.strictEqual(isLegacy, false);
});

// 3. Historical Result Fallbacks
it("Historical Multi Quiz with missing maxPossibleMarks and timing falls back safely without fabricating", () => {
  const historicalData = {
    score: 15,
    total: 20,
    sectionResults: [
      { sectionId: "sec-1", sectionTitle: "Physics", totalQuestions: 10, correct: 8, incorrect: 2 },
      { sectionId: "sec-2", sectionTitle: "Chemistry", totalQuestions: 10, correct: 7, incorrect: 3 }
    ]
    // Missing: maxPossibleMarks, timeTaken, questionAnalytics
  };

  const isMultiQuiz = Boolean(historicalData?.sectionResults?.length > 0);
  assert.strictEqual(isMultiQuiz, true);

  const maxPossibleMarksDisplay = historicalData?.maxPossibleMarks ?? 
    (historicalData?.sectionResults?.reduce((acc, s) => acc + (s.maxMarks || 0), 0) || historicalData.total || "Not available");
  assert.strictEqual(maxPossibleMarksDisplay, 20); // falls back safely to total questions

  const timeDisplay = formatTimingSafe(historicalData.timeTaken);
  assert.strictEqual(timeDisplay, "Not available"); // never fabricates missing overall timing!

  historicalData.sectionResults.forEach(sec => {
    const secTime = formatTimingSafe(sec.timeTaken);
    assert.strictEqual(secTime, "Not available"); // never fabricates missing section timing!
    
    // Accuracy fallback when missing
    const secAcc = sec.accuracy !== undefined ? `${sec.accuracy}%` : (sec.correct + sec.incorrect > 0 ? `${(((sec.correct) / (sec.correct + sec.incorrect)) * 100).toFixed(1)}%` : "0%");
    assert.ok(secAcc.includes("%"));
  });
});

// 4. Section Questions Partitioning & Tab Filtering
it("Section tabs accurately isolate questions for the selected section", () => {
  const questions = [
    { id: "q1", sectionId: "sec-1", questionEnglish: "What is F?", status: "correct" },
    { id: "q2", sectionId: "sec-1", questionEnglish: "What is m?", status: "incorrect" },
    { id: "q3", sectionId: "sec-2", questionEnglish: "What is H2O?", status: "correct" },
    { id: "q4", sectionId: "sec-2", questionEnglish: "What is NaCl?", status: "unanswered" }
  ];

  const filterSection = (tabId) => {
    if (tabId === "all") return questions;
    return questions.filter(q => q.sectionId === tabId);
  };

  assert.strictEqual(filterSection("all").length, 4);
  assert.strictEqual(filterSection("sec-1").length, 2);
  assert.strictEqual(filterSection("sec-2").length, 2);
  assert.strictEqual(filterSection("sec-1")[0].id, "q1");
  assert.strictEqual(filterSection("sec-2")[0].id, "q3");
});

// 5. Status Filters within Sections
it("Status filters correctly partition All, Correct, Incorrect and Unanswered questions", () => {
  const sectionQuestions = [
    { id: "q1", status: "correct", marksObtained: 2 },
    { id: "q2", status: "incorrect", marksObtained: -0.5 },
    { id: "q3", status: "unanswered", marksObtained: 0 },
    { id: "q4", status: "correct", marksObtained: 2 }
  ];

  const filterByStatus = (status) => {
    if (status === "all") return sectionQuestions;
    return sectionQuestions.filter(q => q.status === status);
  };

  assert.strictEqual(filterByStatus("all").length, 4);
  assert.strictEqual(filterByStatus("correct").length, 2);
  assert.strictEqual(filterByStatus("incorrect").length, 1);
  assert.strictEqual(filterByStatus("unanswered").length, 1);
});

// 6. Question Timing & Marks Display
it("Question cards accurately render marks obtained, timeSpent, and visitCount without fabricating", () => {
  const questionWithAnalytics = {
    id: "q1",
    status: "correct",
    marksObtained: 2.5,
    timeSpent: 42,
    visitCount: 3
  };

  const marksText = (questionWithAnalytics.marksObtained > 0 ? `+${questionWithAnalytics.marksObtained}` : `${questionWithAnalytics.marksObtained}`) + " marks";
  assert.strictEqual(marksText, "+2.5 marks");
  assert.strictEqual(formatTimingSafe(questionWithAnalytics.timeSpent), "42s");
  assert.strictEqual(questionWithAnalytics.visitCount, 3);

  const legacyQuestionWithoutAnalytics = {
    id: "q_legacy",
    status: "incorrect",
    marksPerQuestion: 1,
    negativeMarking: 0.25
    // missing: marksObtained, timeSpent, visitCount
  };

  const legacyMarks = legacyQuestionWithoutAnalytics.marksObtained !== undefined 
    ? `${legacyQuestionWithoutAnalytics.marksObtained} marks` 
    : `-${legacyQuestionWithoutAnalytics.negativeMarking} mark`;
  assert.strictEqual(legacyMarks, "-0.25 mark");
  assert.strictEqual(formatTimingSafe(legacyQuestionWithoutAnalytics.timeSpent), "Not available");
  assert.strictEqual(legacyQuestionWithoutAnalytics.visitCount ?? "Not available", "Not available");
});

console.log("==================================================");
console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");
if (failed > 0) process.exit(1);
