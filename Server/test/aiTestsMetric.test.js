const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
require("dotenv").config({ path: "Server/.env" });

const Quiz = require("../models/Quiz");
const AiPlan = require("../models/AiPlan");
const User = require("../models/User");
const { getDashboardMetrics } = require("../controllers/aiPlanController");

test("AI Plans Dashboard Metrics - aiTestsGenerated accurately counts student and admin AI tests", async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const testStudentId = new mongoose.Types.ObjectId();

  // 1. Create a student AI quiz (isAiGenerated: true, no aiSourceType)
  const studentQuiz = await Quiz.create({
    title: "AI Test: Physics - Kinematics",
    subject: "Physics",
    examName: "AI Generated Test",
    duration: 10,
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    quizType: "custom",
    isAiGenerated: true,
    createdBy: testStudentId,
    questions: [],
    isModular: false
  });

  // 2. Create an admin AI quiz (aiSourceType: 'prompt', isAiGenerated false/undefined)
  const adminQuiz = await Quiz.create({
    title: "Teacher Exam Special AI",
    subject: "Pedagogy",
    examName: "BPSC",
    duration: 15,
    marksPerQuestion: 1,
    negativeMarking: 0,
    quizType: "exam",
    aiSourceType: "prompt",
    isAiGenerated: false,
    createdBy: testStudentId,
    questions: [],
    isModular: false
  });

  // 3. Create a deleted AI quiz (should NOT be counted)
  const deletedQuiz = await Quiz.create({
    title: "AI Test: Deleted One",
    subject: "Math",
    duration: 5,
    quizType: "custom",
    isAiGenerated: true,
    isDeleted: true,
    createdBy: testStudentId,
    questions: [],
    isModular: false
  });

  try {
    let responseData = null;
    const req = { user: { role: "admin" } };
    const res = {
      json: (data) => { responseData = data; return res; },
      status: (code) => {
        return { json: (data) => { responseData = data; } };
      }
    };

    await getDashboardMetrics(req, res);

    assert.ok(responseData, "Response data should be returned");
    assert.ok(typeof responseData.aiTestsGenerated === "number", "aiTestsGenerated must be a number");
    assert.ok(responseData.aiTestsGenerated >= 2, `aiTestsGenerated (${responseData.aiTestsGenerated}) should be at least 2`);

  } finally {
    // Cleanup test records
    await Quiz.deleteMany({ _id: { $in: [studentQuiz._id, adminQuiz._id, deletedQuiz._id] } });
    await mongoose.connection.close();
  }
});
