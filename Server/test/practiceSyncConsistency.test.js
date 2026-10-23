const assert = require("assert");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Quiz = require("../models/Quiz");
const Section = require("../models/Section");
const Question = require("../models/Question");
const PracticeQuiz = require("../models/PracticeQuiz");
const { syncToPracticeQuiz, previewQuiz } = require("../services/quizService");

async function runTests() {
  console.log("==================================================");
  console.log(" PREPMARK PRACTICE SYNC DATA CONSISTENCY TESTS   ");
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

    const adminId = new mongoose.Types.ObjectId();

    // 1. Create a question with rich explanations (conceptSummary, didYouKnow, incorrect map)
    const q1 = await Question.create({
      questionEnglish: "Which planet is known as the Red Planet?",
      questionHindi: "किस ग्रह को लाल ग्रह कहा जाता है?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: "Mars",
      explanation: "Fallback general explanation",
      explanations: {
        correct: "Mars appears red due to iron oxide (rust) on its surface.",
        incorrect: {
          Venus: "Venus is known as the Morning/Evening Star.",
          Jupiter: "Jupiter is the largest planet in the Solar System.",
          Saturn: "Saturn is known for its prominent ring system.",
        },
        conceptSummary: "Planetary characteristics and terrestrial geology.",
        didYouKnow: "Olympus Mons on Mars is the tallest volcano in the solar system.",
      },
      difficulty: "easy",
      createdBy: adminId,
    });

    // 2. Create Section
    const section1 = await Section.create({
      title: "Astronomy Basics",
      questions: [q1._id],
      duration: 600,
      marksPerQuestion: 2,
      createdBy: adminId,
    });

    // 3. Create Modular Quiz
    const quiz1 = await Quiz.create({
      title: "Solar System Practice Sync Test",
      subject: "Science",
      examName: "General Competition",
      duration: 30,
      isModular: true,
      sections: [{ sectionId: section1._id, mode: "linked", order: 0 }],
      createdBy: adminId,
    });

    console.log("Test 1: syncToPracticeQuiz preserves rich explanations from source");
    await syncToPracticeQuiz(quiz1._id, "both");

    const practiceDoc1 = await PracticeQuiz.findOne({ linkedExamId: quiz1._id });
    expect(Boolean(practiceDoc1), "Practice quiz created with linkedExamId");
    expect(practiceDoc1.questions.length === 1, "Practice quiz contains 1 question");

    const pq = practiceDoc1.questions[0];
    expect(
      pq.explanations.conceptSummary === "Planetary characteristics and terrestrial geology.",
      "conceptSummary is preserved from source Question"
    );
    expect(
      pq.explanations.didYouKnow === "Olympus Mons on Mars is the tallest volcano in the solar system.",
      "didYouKnow is preserved from source Question"
    );
    expect(
      pq.explanations.correct === "Mars appears red due to iron oxide (rust) on its surface.",
      "explanations.correct is preserved from source Question"
    );
    expect(
      pq.explanations.incorrect.get("Venus") === "Venus is known as the Morning/Evening Star.",
      "explanations.incorrect map is preserved from source Question"
    );

    console.log("\nTest 2: Repeated synchronization does not wipe out or lose existing data");
    // Run sync again
    await syncToPracticeQuiz(quiz1._id, "both");

    const practiceDoc2 = await PracticeQuiz.findOne({ linkedExamId: quiz1._id });
    const pq2 = practiceDoc2.questions[0];
    expect(
      pq2.explanations.conceptSummary === "Planetary characteristics and terrestrial geology.",
      "conceptSummary survives repeated synchronization"
    );
    expect(
      pq2.explanations.didYouKnow === "Olympus Mons on Mars is the tallest volcano in the solar system.",
      "didYouKnow survives repeated synchronization"
    );

    console.log("\nTest 3: Fallback to plain explanation if explanations.correct is missing");
    const q2 = await Question.create({
      questionEnglish: "What is H2O?",
      options: ["Water", "Hydrogen", "Oxygen", "Helium"],
      correctAnswer: "Water",
      explanation: "Water is chemical compound H2O.",
      explanations: {
        correct: "",
        incorrect: {},
        conceptSummary: "",
        didYouKnow: "",
      },
      createdBy: adminId,
    });
    const section2 = await Section.create({
      title: "Chemistry Basics",
      questions: [q2._id],
      duration: 300,
      createdBy: adminId,
    });
    const quiz2 = await Quiz.create({
      title: "Chemistry Fallback Quiz",
      subject: "Chemistry",
      duration: 15,
      isModular: true,
      sections: [{ sectionId: section2._id, mode: "linked", order: 0 }],
      createdBy: adminId,
    });

    await syncToPracticeQuiz(quiz2._id, "both");
    const practiceDoc3 = await PracticeQuiz.findOne({ linkedExamId: quiz2._id });
    const pq3 = practiceDoc3.questions[0];
    expect(
      pq3.explanations.correct === "Water is chemical compound H2O.",
      "Falls back to q.explanation when explanations.correct is empty"
    );

    console.log("\nTest 4: publishAs: 'exam' removes linked practice quiz");
    await syncToPracticeQuiz(quiz1._id, "exam");
    const deletedCheck = await PracticeQuiz.findOne({ linkedExamId: quiz1._id });
    expect(deletedCheck === null, "Practice quiz cleanly removed when publishAs changed to 'exam'");

    // Cleanup
    await Question.deleteMany({ _id: { $in: [q1._id, q2._id] } });
    await Section.deleteMany({ _id: { $in: [section1._id, section2._id] } });
    await Quiz.deleteMany({ _id: { $in: [quiz1._id, quiz2._id] } });
    await PracticeQuiz.deleteMany({ linkedExamId: { $in: [quiz1._id, quiz2._id] } });

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
