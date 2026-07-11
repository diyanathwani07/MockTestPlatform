/**
 * Migration script: converts embedded Quiz/PracticeQuiz data into modular
 * Question, Section, and Quiz collections.
 *
 * Usage:
 *   node scripts/migrateToModular.js          # dry-run (no writes)
 *   node scripts/migrateToModular.js --run    # execute migration
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const Question = require("../models/Question");
const Section = require("../models/Section");
const { createQuestionFromEmbedded } = require("../services/quizService");

const DRY_RUN = !process.argv.includes("--run");

const stats = {
  quizzesProcessed: 0,
  practiceQuizzesProcessed: 0,
  questionsCreated: 0,
  sectionsCreated: 0,
  quizzesMigrated: 0,
  practiceQuizzesMigrated: 0,
  errors: [],
};

const isAlreadyModular = (quiz) =>
  quiz.isModular ||
  (quiz.sections?.length > 0 && quiz.sections.every((s) => s.sectionId));

const extractQuestionsFromLegacySection = async (embeddedSection, extra) => {
  const questionIds = [];

  const processList = async (list, difficulty) => {
    for (const q of list || []) {
      const newQ = await createQuestionFromEmbedded(
        { ...q, difficulty: q.difficulty || difficulty },
        extra
      );
      questionIds.push(newQ._id);
      stats.questionsCreated++;
    }
  };

  if (embeddedSection.type === "coding") {
    const easyIds = [];
    const mediumIds = [];
    const hardIds = [];

    for (const q of embeddedSection.subsections?.easy || []) {
      const newQ = await createQuestionFromEmbedded({ ...q, difficulty: "easy" }, extra);
      easyIds.push(newQ._id);
      stats.questionsCreated++;
    }
    for (const q of embeddedSection.subsections?.medium || []) {
      const newQ = await createQuestionFromEmbedded({ ...q, difficulty: "medium" }, extra);
      mediumIds.push(newQ._id);
      stats.questionsCreated++;
    }
    for (const q of embeddedSection.subsections?.hard || []) {
      const newQ = await createQuestionFromEmbedded({ ...q, difficulty: "hard" }, extra);
      hardIds.push(newQ._id);
      stats.questionsCreated++;
    }

    return { questions: [], subsections: { easy: easyIds, medium: mediumIds, hard: hardIds } };
  }

  await processList(embeddedSection.questions, "medium");
  return { questions: questionIds, subsections: { easy: [], medium: [], hard: [] } };
};

const migrateQuiz = async (quiz) => {
  if (isAlreadyModular(quiz)) {
    console.log(`  [skip] Quiz "${quiz.title}" already modular`);
    return;
  }

  const extra = { subject: quiz.subject, createdBy: quiz.createdBy };
  const newSectionRefs = [];

  // Legacy top-level questions → single section
  if (quiz.questions?.length > 0 && (!quiz.sections || quiz.sections.length === 0)) {
    const questionIds = [];
    for (const q of quiz.questions) {
      const newQ = await createQuestionFromEmbedded(q, extra);
      questionIds.push(newQ._id);
      stats.questionsCreated++;
    }

    const section = await Section.create({
      title: quiz.title,
      description: quiz.description || "",
      questions: questionIds,
      isStandalone: true,
      createdBy: quiz.createdBy,
    });
    stats.sectionsCreated++;

    newSectionRefs.push({ sectionId: section._id, mode: "cloned", order: 0 });
  }

  // Legacy embedded sections
  if (quiz.sections?.length > 0 && !isAlreadyModular(quiz)) {
    for (let i = 0; i < quiz.sections.length; i++) {
      const embeddedSection = quiz.sections[i];
      if (embeddedSection.sectionId) continue;

      const { questions, subsections } = await extractQuestionsFromLegacySection(
        embeddedSection,
        extra
      );

      const section = await Section.create({
        title: embeddedSection.title,
        description: embeddedSection.description || "",
        type: embeddedSection.type || "standard",
        duration: embeddedSection.duration || 0,
        marksPerQuestion: embeddedSection.marksPerQuestion || 1,
        negativeMarking: embeddedSection.negativeMarking || 0,
        questionLimit: embeddedSection.questionLimit || 0,
        randomizeOptions: embeddedSection.randomizeOptions || false,
        questions,
        subsections,
        isStandalone: true,
        createdBy: quiz.createdBy,
      });
      stats.sectionsCreated++;

      newSectionRefs.push({ sectionId: section._id, mode: "cloned", order: i });
    }
  }

  if (newSectionRefs.length === 0) {
    console.log(`  [skip] Quiz "${quiz.title}" has no embedded data to migrate`);
    return;
  }

  if (!DRY_RUN) {
    quiz.sections = newSectionRefs;
    quiz.isModular = true;
    // Keep legacy questions as backup (Phase 3 will remove)
    await quiz.save();
  }

  stats.quizzesMigrated++;
  console.log(`  [ok] Quiz "${quiz.title}" → ${newSectionRefs.length} section ref(s)`);
};

const migratePracticeQuiz = async (practiceQuiz) => {
  const existing = await Quiz.findOne({
    title: practiceQuiz.title,
    quizType: "practice",
    createdBy: practiceQuiz.createdBy,
  });
  if (existing?.isModular) {
    console.log(`  [skip] Practice quiz "${practiceQuiz.title}" already migrated`);
    return;
  }

  const questionIds = [];
  for (const q of practiceQuiz.questions || []) {
    const newQ = await createQuestionFromEmbedded(q, {
      subject: practiceQuiz.subject,
      createdBy: practiceQuiz.createdBy,
    });
    questionIds.push(newQ._id);
    stats.questionsCreated++;
  }

  if (questionIds.length === 0) {
    console.log(`  [skip] Practice quiz "${practiceQuiz.title}" has no questions`);
    return;
  }

  const section = await Section.create({
    title: practiceQuiz.title,
    description: practiceQuiz.description || "",
    questions: questionIds,
    isStandalone: true,
    createdBy: practiceQuiz.createdBy,
  });
  stats.sectionsCreated++;

  if (!DRY_RUN) {
    await Quiz.create({
      title: practiceQuiz.title,
      subject: practiceQuiz.subject,
      description: practiceQuiz.description || "",
      duration: Math.max(30, questionIds.length * 2),
      marksPerQuestion: 1,
      quizType: "practice",
      isModular: true,
      sections: [{ sectionId: section._id, mode: "cloned", order: 0 }],
      published: true,
      status: "Published",
      createdBy: practiceQuiz.createdBy,
    });
  }

  stats.practiceQuizzesMigrated++;
  console.log(`  [ok] PracticeQuiz "${practiceQuiz.title}" → unified Quiz`);
};

const run = async () => {
  console.log(`\n=== Modular Quiz Migration ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===\n`);

  await connectDB();

  const beforeCounts = {
    questions: await Question.countDocuments(),
    sections: await Section.countDocuments(),
    quizzes: await Quiz.countDocuments(),
    practiceQuizzes: await PracticeQuiz.countDocuments(),
  };
  console.log("Before:", beforeCounts);

  const quizzes = await Quiz.find();
  console.log(`\nMigrating ${quizzes.length} exam quizzes...`);
  for (const quiz of quizzes) {
    stats.quizzesProcessed++;
    try {
      await migrateQuiz(quiz);
    } catch (err) {
      stats.errors.push({ type: "quiz", id: quiz._id, error: err.message });
      console.error(`  [error] Quiz "${quiz.title}": ${err.message}`);
    }
  }

  const practiceQuizzes = await PracticeQuiz.find();
  console.log(`\nMigrating ${practiceQuizzes.length} practice quizzes...`);
  for (const pq of practiceQuizzes) {
    stats.practiceQuizzesProcessed++;
    try {
      await migratePracticeQuiz(pq);
    } catch (err) {
      stats.errors.push({ type: "practiceQuiz", id: pq._id, error: err.message });
      console.error(`  [error] PracticeQuiz "${pq.title}": ${err.message}`);
    }
  }

  const afterCounts = DRY_RUN
    ? beforeCounts
    : {
        questions: await Question.countDocuments(),
        sections: await Section.countDocuments(),
        quizzes: await Quiz.countDocuments(),
        practiceQuizzes: await PracticeQuiz.countDocuments(),
      };

  console.log("\n=== Summary ===");
  console.log({
    dryRun: DRY_RUN,
    before: beforeCounts,
    after: afterCounts,
    stats,
  });

  if (DRY_RUN) {
    console.log("\nNo changes written. Re-run with --run to apply.\n");
  } else {
    console.log("\nMigration complete.\n");
  }

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
