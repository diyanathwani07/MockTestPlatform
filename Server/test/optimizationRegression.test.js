const assert = require("assert");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Quiz = require("../models/Quiz");
const Section = require("../models/Section");
const Question = require("../models/Question");
const User = require("../models/User");
const Notification = require("../models/Notification");
const NotificationDevice = require("../models/NotificationDevice");

const { previewQuiz, countQuizQuestions } = require("../services/quizService");
const { notifyAllStudents, notifyUser } = require("../services/notificationService");

async function runTests() {
  console.log("==================================================");
  console.log(" PREPMARK DB & NOTIFICATION OPTIMIZATION TESTS   ");
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

    // ----------------------------------------------------
    // TEST SUITE 1: Section Query Loop Optimization in previewQuiz
    // ----------------------------------------------------
    console.log("--- TEST SUITE 1: previewQuiz & Modular Sections ---");

    // Create 3 questions
    const q1 = await Question.create({
      questionEnglish: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
      explanation: "Basic math",
      difficulty: "easy",
      createdBy: adminId,
    });
    const q2 = await Question.create({
      questionEnglish: "Capital of France?",
      options: ["Berlin", "London", "Paris", "Rome"],
      correctAnswer: "Paris",
      explanation: "Geography",
      difficulty: "medium",
      createdBy: adminId,
    });
    const q3 = await Question.create({
      questionEnglish: "Speed of light in m/s?",
      options: ["3e8", "1e6", "3e5", "9e8"],
      correctAnswer: "3e8",
      explanation: "Physics",
      difficulty: "hard",
      createdBy: adminId,
    });

    // Create 3 Sections
    const sec1 = await Section.create({
      title: "Section A - Math",
      questions: [q1._id],
      duration: 600,
      marksPerQuestion: 2,
      createdBy: adminId,
    });

    const sec2 = await Section.create({
      title: "Section B - Geography",
      questions: [q2._id],
      duration: 600,
      marksPerQuestion: 2,
      createdBy: adminId,
    });

    const sec3 = await Section.create({
      title: "Section C - Physics Coding/Subsections",
      type: "coding",
      subsections: {
        easy: [],
        medium: [],
        hard: [q3._id],
      },
      duration: 900,
      marksPerQuestion: 3,
      createdBy: adminId,
    });

    // Non-existent section ID to test missing/deleted section resilience
    const ghostSectionId = new mongoose.Types.ObjectId();

    // Create a modular quiz referencing the sections in custom order (sec2 first, then sec1, then sec3, then ghost)
    const testQuiz = await Quiz.create({
      title: "Modular Optimization Test Quiz",
      subject: "General Studies",
      duration: 45,
      isModular: true,
      sections: [
        { sectionId: sec2._id, mode: "linked", order: 0 },
        { sectionId: sec1._id, mode: "linked", order: 1 },
        { sectionId: ghostSectionId, mode: "linked", order: 2 },
        { sectionId: sec3._id, mode: "linked", order: 3 },
      ],
      createdBy: adminId,
    });

    // Measure previewQuiz execution and correctness
    const populated = await previewQuiz(testQuiz._id);

    expect(Array.isArray(populated.sections), "previewQuiz returns array of sections");
    expect(populated.sections.length === 3, "Gracefully filters out missing ghost section (3 sections returned)");
    expect(populated.sections[0]._id.toString() === sec2._id.toString(), "Preserves section order (Section B first)");
    expect(populated.sections[1]._id.toString() === sec1._id.toString(), "Preserves section order (Section A second)");
    expect(populated.sections[2]._id.toString() === sec3._id.toString(), "Preserves section order (Section C third)");
    expect(populated.sections[0].questions[0].questionEnglish === "Capital of France?", "Questions populated correctly in bulk");
    expect(populated.sections[2].subsections.hard[0].questionEnglish === "Speed of light in m/s?", "Subsections populated correctly in bulk");

    // Test countQuizQuestions
    const totalCount = await countQuizQuestions(testQuiz);
    expect(totalCount === 3, `countQuizQuestions returns 3 total questions (got ${totalCount})`);

    // ----------------------------------------------------
    // TEST SUITE 2: Empty & Legacy Quizzes
    // ----------------------------------------------------
    console.log("\n--- TEST SUITE 2: Empty & Legacy Quizzes ---");
    const emptyQuiz = await Quiz.create({
      title: "Empty Sections Quiz",
      subject: "General Studies",
      duration: 30,
      isModular: true,
      sections: [],
      createdBy: adminId,
    });

    const emptyPopulated = await previewQuiz(emptyQuiz._id);
    expect(emptyPopulated.sections.length === 0, "Handles empty modular sections array without error");

    const emptyCount = await countQuizQuestions(emptyQuiz);
    expect(emptyCount === 0, "Handles empty questions count correctly (0)");

    // ----------------------------------------------------
    // TEST SUITE 3: Notification Batching & Memory Safety
    // ----------------------------------------------------
    console.log("\n--- TEST SUITE 3: Notification Batching ---");

    // Create 15 mock users to verify batch insertion
    const mockUsers = [];
    for (let i = 0; i < 15; i++) {
      mockUsers.push({
        fullName: `Batch Student ${i}`,
        email: `batch_student_${Date.now()}_${i}@test.com`,
        password: "hashedpassword123",
        role: "user",
        status: "Active",
      });
    }
    const createdUsers = await User.insertMany(mockUsers);
    const userIds = createdUsers.map((u) => u._id);

    // Call notifyAllStudents with batching
    const notifications = await notifyAllStudents({
      type: "NEW_QUIZ_PUBLISHED",
      title: "Batch Notification Test",
      message: "Testing batch delivery and DB insert",
      link: `/quiz/${testQuiz._id}`,
      relatedId: testQuiz._id,
    });

    expect(notifications.length >= 15, `notifyAllStudents inserted notifications (received ${notifications.length})`);

    // Verify unread count and DB persistence for one of the created users
    const sampleNotification = await Notification.findOne({
      userId: userIds[0],
      title: "Batch Notification Test",
    });
    expect(Boolean(sampleNotification), "Notification was persisted in DB for target recipient");
    expect(sampleNotification.isRead === false, "Notification initialized with isRead: false");
    expect(sampleNotification.type === "NEW_QUIZ_PUBLISHED", "Notification type preserved");

    // Test single notifyUser
    const singleNotification = await notifyUser(userIds[0], {
      type: "TICKET_REPLY",
      title: "Support Update",
      message: "Your ticket was updated",
    });
    expect(Boolean(singleNotification), "notifyUser succeeds and returns document");

    // ----------------------------------------------------
    // Cleanup Test Data
    // ----------------------------------------------------
    await Question.deleteMany({ _id: { $in: [q1._id, q2._id, q3._id] } });
    await Section.deleteMany({ _id: { $in: [sec1._id, sec2._id, sec3._id] } });
    await Quiz.deleteMany({ _id: { $in: [testQuiz._id, emptyQuiz._id] } });
    await Notification.deleteMany({ userId: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
