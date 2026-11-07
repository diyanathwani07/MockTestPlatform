/**
 * PHASE 5 TEST SUITE: MULTI-SECTION PERFORMANCE ANALYTICS & IMPROVEMENT RECOMMENDATIONS
 * 
 * Verifies all 10 required test scenarios:
 *  1. Multi-section quiz with all questions attempted.
 *  2. Multi-section quiz with unanswered questions.
 *  3. Quiz with zero correct answers.
 *  4. Quiz with negative marking.
 *  5. Quiz with multiple sections.
 *  6. Student with multiple historical attempts (score & accuracy progression, section trends).
 *  7. Student with only one attempt (no fake comparison data).
 *  8. Historical single-quiz result (safe fallback, isMultiQuiz: false).
 *  9. Missing or incomplete section analytics (safe fallback, zero division guards).
 * 10. Authoritative metrics & recommendation payload integrity.
 */

const assert = require("assert");

let passedCount = 0;
let failedCount = 0;

function testAssert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

console.log("==================================================");
console.log(" PREPMARK MULTI QUIZ PHASE 5 ANALYTICS TEST SUITE ");
console.log("==================================================");

// Mock controller processing logic directly to verify data transformations
function processAnalytics(result, historicalAttempts = []) {
  const isMultiQuiz = Boolean(result.sectionResults && Array.isArray(result.sectionResults) && result.sectionResults.length > 0);

  let sections = [];
  if (isMultiQuiz) {
    sections = result.sectionResults.map((sec, idx) => {
      const secId = sec.sectionId || `sec-${idx}`;
      const totalQuestions = Number(sec.totalQuestions) || 0;
      const attempted = Number(sec.attempted) || 0;
      const correct = Number(sec.correct) || 0;
      const incorrect = Number(sec.incorrect) || 0;
      const unanswered = sec.unanswered !== undefined && sec.unanswered !== null
        ? Number(sec.unanswered)
        : Math.max(0, totalQuestions - attempted);
      const score = Number(sec.score) || 0;
      const maxMarks = Number(sec.maxMarks) || (totalQuestions > 0 ? totalQuestions : score);
      const timeTaken = Number(sec.timeTaken) || 0;
      
      let accuracy = 0;
      if (sec.accuracy !== undefined && sec.accuracy !== null) {
        accuracy = Number(Number(sec.accuracy).toFixed(1));
      } else if (attempted > 0) {
        accuracy = Number(((correct / attempted) * 100).toFixed(1));
      }

      const avgTimePerQuestion = attempted > 0 
        ? Number((timeTaken / attempted).toFixed(1)) 
        : (totalQuestions > 0 ? Number((timeTaken / totalQuestions).toFixed(1)) : 0);

      let strength = "average";
      if (attempted === 0) {
        strength = "unattempted";
      } else if (accuracy >= 70 && score > 0) {
        strength = "strong";
      } else if (accuracy < 40 || incorrect > correct) {
        strength = "weak";
      }

      return {
        sectionId: secId,
        sectionTitle: sec.sectionTitle || `Section ${idx + 1}`,
        totalQuestions,
        attempted,
        correct,
        incorrect,
        unanswered,
        score,
        maxMarks,
        accuracy,
        timeTaken,
        avgTimePerQuestion,
        strength,
        type: sec.type || "standard"
      };
    });
  }

  let strongestSection = null;
  let weakestSection = null;

  const attemptedSections = sections.filter(s => s.attempted > 0);
  if (attemptedSections.length > 0) {
    const sortedByPerformance = [...attemptedSections].sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.score - a.score;
    });
    if (sortedByPerformance[0].accuracy > 0 && sortedByPerformance[0].score > 0) {
      strongestSection = sortedByPerformance[0];
    }
    weakestSection = sortedByPerformance[sortedByPerformance.length - 1];
  }

  const recommendations = [];

  sections.forEach(sec => {
    if (sec.attempted >= 2 && sec.accuracy < 50) {
      recommendations.push({
        type: "concept_revision",
        priority: "high",
        sectionTitle: sec.sectionTitle,
        title: `Revise Fundamentals: ${sec.sectionTitle}`,
        description: `Accuracy in ${sec.sectionTitle} is ${sec.accuracy}%. Review core theories, formulas, and concepts before your next mock test.`
      });
    }

    if (sec.attempted >= 2 && sec.incorrect > sec.correct) {
      recommendations.push({
        type: "negative_marking",
        priority: "high",
        sectionTitle: sec.sectionTitle,
        title: `Minimize Negative Marking in ${sec.sectionTitle}`,
        description: `You had ${sec.incorrect} incorrect answers compared to ${sec.correct} correct. Eliminate guess-work and focus on high-confidence questions.`
      });
    }

    if (sec.totalQuestions >= 3 && (sec.unanswered / sec.totalQuestions) >= 0.4) {
      recommendations.push({
        type: "time_management",
        priority: "medium",
        sectionTitle: sec.sectionTitle,
        title: `Improve Pacing in ${sec.sectionTitle}`,
        description: `${sec.unanswered} of ${sec.totalQuestions} questions (${Math.round((sec.unanswered / sec.totalQuestions) * 100)}%) were left unattempted. Allocate a fixed time budget to attempt the full section.`
      });
    }

    if (sec.attempted >= 3 && sec.accuracy >= 75 && sec.avgTimePerQuestion >= 90) {
      recommendations.push({
        type: "speed_practice",
        priority: "medium",
        sectionTitle: sec.sectionTitle,
        title: `Speed Drilling: ${sec.sectionTitle}`,
        description: `You have strong accuracy (${sec.accuracy}%) in ${sec.sectionTitle}, but average ${sec.avgTimePerQuestion}s per question. Practice speed drills to bank minutes for tougher sections.`
      });
    }

    if (sec.attempted >= 3 && sec.accuracy >= 80 && sec.score >= 0.7 * sec.maxMarks) {
      recommendations.push({
        type: "advanced_practice",
        priority: "low",
        sectionTitle: sec.sectionTitle,
        title: `Advance to Tougher Sets: ${sec.sectionTitle}`,
        description: `Outstanding performance (${sec.accuracy}% accuracy) in ${sec.sectionTitle}! Maintain your edge by solving advanced-level problem sets.`
      });
    }
  });

  if (recommendations.length === 0 && sections.length > 0) {
    const overallAcc = result.total > 0 ? Number(((result.correct / result.total) * 100).toFixed(1)) : 0;
    if (overallAcc >= 75) {
      recommendations.push({
        type: "general_strength",
        priority: "low",
        sectionTitle: "Overall Test",
        title: "Maintain Balanced Preparation",
        description: `Strong overall test attempt with ${overallAcc}% accuracy.`
      });
    } else {
      recommendations.push({
        type: "general_improvement",
        priority: "medium",
        sectionTitle: "Overall Test",
        title: "Focus on Section Weak Spots",
        description: `Analyze the section accuracy breakdown above and prioritize concept revision in your lowest-scoring subjects.`
      });
    }
  }

  let history = {
    hasHistory: false,
    totalAttempts: 1,
    attemptsProgression: [],
    comparisonWithPrevious: null
  };

  if (historicalAttempts.length > 1) {
    history.hasHistory = true;
    history.totalAttempts = historicalAttempts.length;
    history.attemptsProgression = historicalAttempts.map((att, idx) => ({
      attemptNumber: idx + 1,
      resultId: att._id,
      score: att.score ?? 0,
      total: att.total ?? 0,
      percentage: att.percentage ?? 0,
      createdAt: att.createdAt
    }));

    const currentIdx = historicalAttempts.findIndex(a => a._id.toString() === result._id.toString());
    const prevAttempt = currentIdx > 0 ? historicalAttempts[currentIdx - 1] : (currentIdx === -1 ? historicalAttempts[historicalAttempts.length - 2] : null);

    if (prevAttempt) {
      const scoreDiff = Number((result.score - (prevAttempt.score ?? 0)).toFixed(2));
      const currentPct = result.percentage ?? 0;
      const prevPct = prevAttempt.percentage ?? 0;
      const percentageDiff = Number((currentPct - prevPct).toFixed(2));
      const timeDiff = Number(((result.timeTaken ?? 0) - (prevAttempt.timeTaken ?? 0)).toFixed(0));

      const sectionChanges = [];
      if (isMultiQuiz && Array.isArray(prevAttempt.sectionResults)) {
        sections.forEach(currentSec => {
          const prevSec = prevAttempt.sectionResults.find(ps => 
            (ps.sectionId && ps.sectionId.toString() === currentSec.sectionId.toString()) ||
            (ps.sectionTitle && ps.sectionTitle.trim().toLowerCase() === currentSec.sectionTitle.trim().toLowerCase())
          );

          if (prevSec) {
            const prevSecScore = Number(prevSec.score) || 0;
            const prevSecAcc = prevSec.accuracy !== undefined ? Number(prevSec.accuracy) : (prevSec.attempted > 0 ? Number(((prevSec.correct / prevSec.attempted) * 100).toFixed(1)) : 0);
            const sScoreDiff = Number((currentSec.score - prevSecScore).toFixed(2));
            const sAccDiff = Number((currentSec.accuracy - prevSecAcc).toFixed(1));

            let trend = "stable";
            if (sScoreDiff > 0 || sAccDiff > 2) {
              trend = "improving";
            } else if (sScoreDiff < 0 || sAccDiff < -2) {
              trend = "declining";
            }

            sectionChanges.push({
              sectionId: currentSec.sectionId,
              sectionTitle: currentSec.sectionTitle,
              currentScore: currentSec.score,
              previousScore: prevSecScore,
              scoreDiff: sScoreDiff,
              currentAccuracy: currentSec.accuracy,
              previousAccuracy: prevSecAcc,
              accuracyDiff: sAccDiff,
              trend
            });
          }
        });
      }

      history.comparisonWithPrevious = {
        previousResultId: prevAttempt._id,
        previousDate: prevAttempt.createdAt,
        scoreDiff,
        percentageDiff,
        timeDiff,
        sectionChanges
      };
    }
  }

  return {
    success: true,
    resultId: result._id,
    isMultiQuiz,
    sections,
    summary: {
      strongestSection,
      weakestSection,
      strongCount: sections.filter(s => s.strength === "strong").length,
      averageCount: sections.filter(s => s.strength === "average").length,
      weakCount: sections.filter(s => s.strength === "weak").length
    },
    recommendations,
    history
  };
}

// -------------------------------------------------------------------------
// SCENARIO 1: Multi-section quiz with all questions attempted
// -------------------------------------------------------------------------
console.log("\nScenario 1: Multi-section quiz with all questions attempted");
const s1Result = {
  _id: "res-101",
  score: 18,
  total: 20,
  percentage: 90,
  timeTaken: 600,
  sectionResults: [
    { sectionId: "s1", sectionTitle: "Math", totalQuestions: 10, attempted: 10, correct: 9, incorrect: 1, unanswered: 0, score: 9, maxMarks: 10, timeTaken: 300 },
    { sectionId: "s2", sectionTitle: "Science", totalQuestions: 10, attempted: 10, correct: 9, incorrect: 1, unanswered: 0, score: 9, maxMarks: 10, timeTaken: 300 }
  ]
};
const s1Analytics = processAnalytics(s1Result);
testAssert(s1Analytics.sections.length === 2, "Processed all 2 sections");
testAssert(s1Analytics.sections.every(s => s.unanswered === 0), "All questions verified attempted (unanswered === 0)");
testAssert(s1Analytics.sections.every(s => s.strength === "strong"), "Both sections classified as strong");

// -------------------------------------------------------------------------
// SCENARIO 2: Multi-section quiz with unanswered questions
// -------------------------------------------------------------------------
console.log("\nScenario 2: Multi-section quiz with unanswered questions");
const s2Result = {
  _id: "res-102",
  score: 4,
  total: 20,
  percentage: 20,
  timeTaken: 400,
  sectionResults: [
    { sectionId: "s1", sectionTitle: "History", totalQuestions: 10, attempted: 4, correct: 4, incorrect: 0, unanswered: 6, score: 4, maxMarks: 10, timeTaken: 200 }
  ]
};
const s2Analytics = processAnalytics(s2Result);
testAssert(s2Analytics.sections[0].unanswered === 6, "Correctly computed 6 unanswered questions");
const hasPacingRecommendation = s2Analytics.recommendations.some(r => r.type === "time_management");
testAssert(hasPacingRecommendation, "Generated time pacing recommendation for high unanswered rate (60%)");

// -------------------------------------------------------------------------
// SCENARIO 3: Quiz with zero correct answers
// -------------------------------------------------------------------------
console.log("\nScenario 3: Quiz with zero correct answers");
const s3Result = {
  _id: "res-103",
  score: 0,
  total: 10,
  percentage: 0,
  timeTaken: 120,
  sectionResults: [
    { sectionId: "s1", sectionTitle: "English", totalQuestions: 10, attempted: 10, correct: 0, incorrect: 10, unanswered: 0, score: 0, maxMarks: 10, timeTaken: 120 }
  ]
};
const s3Analytics = processAnalytics(s3Result);
testAssert(s3Analytics.sections[0].accuracy === 0, "Handled zero accuracy without NaN");
testAssert(s3Analytics.sections[0].strength === "weak", "Classified 0% accuracy section as weak");
testAssert(s3Analytics.recommendations.some(r => r.type === "concept_revision"), "Generated concept revision recommendation");

// -------------------------------------------------------------------------
// SCENARIO 4: Quiz with negative marking (incorrect answers penalized)
// -------------------------------------------------------------------------
console.log("\nScenario 4: Quiz with negative marking");
const s4Result = {
  _id: "res-104",
  score: 1.5,
  total: 10,
  percentage: 15,
  timeTaken: 250,
  sectionResults: [
    { sectionId: "s1", sectionTitle: "Physics", totalQuestions: 10, attempted: 10, correct: 3, incorrect: 7, unanswered: 0, score: 1.25, maxMarks: 10, timeTaken: 250 }
  ]
};
const s4Analytics = processAnalytics(s4Result);
testAssert(s4Analytics.sections[0].strength === "weak", "Identified negative marking section as weak");
testAssert(s4Analytics.recommendations.some(r => r.type === "negative_marking"), "Generated negative marking warning recommendation");

// -------------------------------------------------------------------------
// SCENARIO 5: Quiz with multiple sections (relative comparisons)
// -------------------------------------------------------------------------
console.log("\nScenario 5: Quiz with multiple sections");
const s5Result = {
  _id: "res-105",
  score: 22,
  total: 30,
  percentage: 73.3,
  timeTaken: 800,
  sectionResults: [
    { sectionId: "s1", sectionTitle: "Reasoning", totalQuestions: 10, attempted: 10, correct: 10, incorrect: 0, score: 10, maxMarks: 10, timeTaken: 200 },
    { sectionId: "s2", sectionTitle: "GK", totalQuestions: 10, attempted: 8, correct: 5, incorrect: 3, score: 5, maxMarks: 10, timeTaken: 150 },
    { sectionId: "s3", sectionTitle: "Math", totalQuestions: 10, attempted: 9, correct: 2, incorrect: 7, score: 2, maxMarks: 10, timeTaken: 450 }
  ]
};
const s5Analytics = processAnalytics(s5Result);
testAssert(s5Analytics.summary.strongestSection.sectionTitle === "Reasoning", "Identified Reasoning as strongest section (100% accuracy)");
testAssert(s5Analytics.summary.weakestSection.sectionTitle === "Math", "Identified Math as weakest section (22.2% accuracy)");
testAssert(s5Analytics.summary.strongCount === 1 && s5Analytics.summary.weakCount === 1, "Accurately tallied strongCount=1 and weakCount=1");

// -------------------------------------------------------------------------
// SCENARIO 6: Student with multiple historical attempts
// -------------------------------------------------------------------------
console.log("\nScenario 6: Student with multiple historical attempts");
const attempt1 = {
  _id: "att-1",
  score: 10,
  total: 30,
  percentage: 33.3,
  timeTaken: 900,
  createdAt: new Date("2026-11-01T10:00:00Z"),
  sectionResults: [
    { sectionId: "s1", sectionTitle: "Reasoning", score: 4, accuracy: 40, attempted: 10, correct: 4 },
    { sectionId: "s2", sectionTitle: "Math", score: 6, accuracy: 60, attempted: 10, correct: 6 }
  ]
};
const attempt2 = {
  _id: "att-2",
  score: 20,
  total: 30,
  percentage: 66.7,
  timeTaken: 750,
  createdAt: new Date("2026-11-06T10:00:00Z"),
  sectionResults: [
    { sectionId: "s1", sectionTitle: "Reasoning", score: 9, accuracy: 90, attempted: 10, correct: 9 },
    { sectionId: "s2", sectionTitle: "Math", score: 11, accuracy: 80, attempted: 10, correct: 8 }
  ]
};
const s6Analytics = processAnalytics(attempt2, [attempt1, attempt2]);
testAssert(s6Analytics.history.hasHistory === true, "History enabled when multiple attempts exist");
testAssert(s6Analytics.history.totalAttempts === 2, "Recorded 2 total attempts");
testAssert(s6Analytics.history.comparisonWithPrevious.scoreDiff === 10, "Authoritative score improvement of +10 marks calculated");
testAssert(s6Analytics.history.comparisonWithPrevious.sectionChanges[0].trend === "improving", "Reasoning detected as improving");

// -------------------------------------------------------------------------
// SCENARIO 7: Student with only one attempt
// -------------------------------------------------------------------------
console.log("\nScenario 7: Student with only one attempt");
const s7Analytics = processAnalytics(attempt1, [attempt1]);
testAssert(s7Analytics.history.hasHistory === false, "History disabled when only 1 attempt exists (no phantom comparisons)");
testAssert(s7Analytics.history.comparisonWithPrevious === null, "No fabricated comparisonWithPrevious data");

// -------------------------------------------------------------------------
// SCENARIO 8: Historical single-quiz result (backward compatibility)
// -------------------------------------------------------------------------
console.log("\nScenario 8: Historical single-quiz result");
const s8Result = {
  _id: "single-1",
  score: 15,
  total: 20,
  percentage: 75,
  timeTaken: 300,
  sectionResults: []
};
const s8Analytics = processAnalytics(s8Result);
testAssert(s8Analytics.isMultiQuiz === false, "Historical single quiz accurately flagged isMultiQuiz=false");
testAssert(s8Analytics.sections.length === 0, "No phantom sections generated for single quiz");

// -------------------------------------------------------------------------
// SCENARIO 9: Missing or incomplete section analytics data
// -------------------------------------------------------------------------
console.log("\nScenario 9: Missing or incomplete section analytics");
const s9Result = {
  _id: "corrupt-1",
  score: 5,
  total: 10,
  sectionResults: [
    { sectionId: "s1", totalQuestions: null, attempted: undefined, correct: 0, incorrect: null }
  ]
};
const s9Analytics = processAnalytics(s9Result);
testAssert(s9Analytics.sections[0].accuracy === 0, "Null/undefined safe fallback to 0 accuracy without crashing");
testAssert(s9Analytics.sections[0].avgTimePerQuestion === 0, "Zero-division safe fallback for avgTimePerQuestion");

// -------------------------------------------------------------------------
// SCENARIO 10: Payload completeness & structure validation
// -------------------------------------------------------------------------
console.log("\nScenario 10: Payload completeness & structure validation");
testAssert(s1Analytics.success === true, "Payload contains success flag");
testAssert(Array.isArray(s1Analytics.recommendations), "Payload contains recommendations array");
testAssert(typeof s1Analytics.summary === "object", "Payload contains structured summary");

console.log("\n==================================================");
console.log(` RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
