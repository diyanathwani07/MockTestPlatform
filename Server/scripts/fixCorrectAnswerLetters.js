require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Question = require("../models/Question");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");

const dryRun = !process.argv.includes("--apply");

const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };

function resolveAnswer(correctAnswer, options) {
  if (!correctAnswer) return null;
  const cleanAnswer = correctAnswer.trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(cleanAnswer)) {
    const idx = letterToIndex[cleanAnswer];
    if (options && Array.isArray(options) && options[idx] !== undefined) {
      // Return option text. If the option is an object (for bilingual format), resolve to string representation
      const opt = options[idx];
      let optText = "";
      if (opt && typeof opt === "object") {
        if (opt.english && opt.hindi) {
          optText = `${opt.english} / ${opt.hindi}`;
        } else {
          optText = opt.english || opt.hindi || "";
        }
      } else {
        optText = String(opt).trim();
      }
      return { resolved: optText, idx };
    }
  }
  return null;
}

async function run() {
  console.log(`=== DB Backfill: Resolve correctAnswer Letters to Option Text ===`);
  console.log(`Mode: ${dryRun ? "DRY-RUN (No database writes)" : "APPLY (Writing changes to database)"}\n`);

  try {
    await connectDB();
  } catch (err) {
    console.error("DB Connection Failed:", err);
    process.exit(1);
  }

  let totalScanned = 0;
  let totalFixed = 0;
  let totalSkipped = 0;
  let ambiguousWarnings = [];

  // Helper to check for ambiguous single-letter option texts
  function checkAmbiguous(resolvedText, id, context) {
    if (["A", "B", "C", "D"].includes(resolvedText.toUpperCase())) {
      ambiguousWarnings.push(`Ambiguous option text matches answer letter: "${resolvedText}" at ${context} ID: ${id}`);
    }
  }

  // 1. Process independent Question collection
  console.log("Processing Question collection...");
  try {
    const questions = await Question.find({});
    for (const q of questions) {
      totalScanned++;
      const resolved = resolveAnswer(q.correctAnswer, q.options);
      if (resolved) {
        checkAmbiguous(resolved.resolved, q._id, "Question");
        console.log(`[Question] Would update ID: ${q._id} | "${q.correctAnswer}" -> "${resolved.resolved}"`);
        if (!dryRun) {
          q.correctAnswer = resolved.resolved;
          await q.save();
        }
        totalFixed++;
      } else {
        totalSkipped++;
      }
    }
  } catch (err) {
    console.error("Error processing Question collection:", err);
  }

  // Helper to process embedded questions array
  function fixEmbeddedQuestions(qs, parentId, parentType) {
    let fixedCount = 0;
    if (!qs || !Array.isArray(qs)) return fixedCount;
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const resolved = resolveAnswer(q.correctAnswer, q.options);
      if (resolved) {
        checkAmbiguous(resolved.resolved, parentId, `${parentType} [Index ${i}]`);
        console.log(`[${parentType} - Embedded] Would update parent ID: ${parentId} [Index ${i}] | "${q.correctAnswer}" -> "${resolved.resolved}"`);
        q.correctAnswer = resolved.resolved;
        fixedCount++;
      }
    }
    return fixedCount;
  }

  // 2. Process Quiz collection (embedded legacy questions & sections)
  console.log("\nProcessing Quiz collection...");
  try {
    const quizzes = await Quiz.find({});
    for (const quiz of quizzes) {
      totalScanned++;
      let modified = false;

      // Legacy direct questions
      if (quiz.questions && quiz.questions.length > 0) {
        const fixed = fixEmbeddedQuestions(quiz.questions, quiz._id, "QuizDirect");
        if (fixed > 0) modified = true;
      }

      // Legacy direct sections questions
      if (quiz.sections && quiz.sections.length > 0) {
        for (let sIdx = 0; sIdx < quiz.sections.length; sIdx++) {
          const sec = quiz.sections[sIdx];
          if (sec.questions && sec.questions.length > 0) {
            const fixed = fixEmbeddedQuestions(sec.questions, quiz._id, `QuizSectionDirect [Sec ${sIdx}]`);
            if (fixed > 0) modified = true;
          }
          if (sec.subsections) {
            for (const diff of ["easy", "medium", "hard"]) {
              if (sec.subsections[diff] && sec.subsections[diff].length > 0) {
                const fixed = fixEmbeddedQuestions(sec.subsections[diff], quiz._id, `QuizSectionSubsection [Sec ${sIdx} - ${diff}]`);
                if (fixed > 0) modified = true;
              }
            }
          }
        }
      }

      if (modified) {
        totalFixed++;
        if (!dryRun) {
          await quiz.save();
        }
      } else {
        totalSkipped++;
      }
    }
  } catch (err) {
    console.error("Error processing Quiz collection:", err);
  }

  // 3. Process PracticeQuiz collection (embedded questions & sections)
  console.log("\nProcessing PracticeQuiz collection...");
  try {
    const practiceQuizzes = await PracticeQuiz.find({});
    for (const pq of practiceQuizzes) {
      totalScanned++;
      let modified = false;

      // Direct questions
      if (pq.questions && pq.questions.length > 0) {
        const fixed = fixEmbeddedQuestions(pq.questions, pq._id, "PracticeQuizDirect");
        if (fixed > 0) modified = true;
      }

      // Sections questions (stored as Mixed)
      if (pq.sections && pq.sections.length > 0) {
        for (let sIdx = 0; sIdx < pq.sections.length; sIdx++) {
          const sec = pq.sections[sIdx];
          if (sec.questions && sec.questions.length > 0) {
            const fixed = fixEmbeddedQuestions(sec.questions, pq._id, `PracticeQuizSectionDirect [Sec ${sIdx}]`);
            if (fixed > 0) modified = true;
          }
          if (sec.subsections) {
            for (const diff of ["easy", "medium", "hard"]) {
              if (sec.subsections[diff] && sec.subsections[diff].length > 0) {
                const fixed = fixEmbeddedQuestions(sec.subsections[diff], pq._id, `PracticeQuizSectionSubsection [Sec ${sIdx} - ${diff}]`);
                if (fixed > 0) modified = true;
              }
            }
          }
        }
        if (modified) {
          // Force Mongoose to recognize updates to Mixed type sections
          pq.markModified("sections");
        }
      }

      if (modified) {
        totalFixed++;
        if (!dryRun) {
          await pq.save();
        }
      } else {
        totalSkipped++;
      }
    }
  } catch (err) {
    console.error("Error processing PracticeQuiz collection:", err);
  }

  console.log("\n=== Backfill Summary ===");
  console.log(`Total Documents Scanned/Checked: ${totalScanned}`);
  console.log(`Total Documents Fixed: ${totalFixed}`);
  console.log(`Total Documents Skipped/Unchanged: ${totalSkipped}`);

  if (ambiguousWarnings.length > 0) {
    console.log(`\n⚠️ Warnings (${ambiguousWarnings.length} Ambiguous Single-Letter Option Matches):`);
    ambiguousWarnings.forEach(w => console.warn(w));
  } else {
    console.log("\nNo ambiguous single-letter option texts detected.");
  }

  mongoose.connection.close();
  console.log("\nDone.");
}

run();
