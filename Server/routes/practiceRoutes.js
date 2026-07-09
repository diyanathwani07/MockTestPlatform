const express = require("express");
const router = express.Router();
const {
  getPracticeQuizzes,
  getPracticeQuizById,
  createPracticeQuiz,
  updatePracticeQuiz,
  deletePracticeQuiz,
  generateAIExplanations
} = require("../controllers/practiceController");
const {
  savePracticeResult,
  getPracticeHistory,
  getPracticeAnalytics,
  getWrongQuestions,
  resolveWrongQuestion,
  toggleBookmark,
  getBookmarks,
  getAiTutorExplanation
} = require("../controllers/practiceAnalyticsController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// Practice Quiz Management (Admin/All)
router.get("/", protect, getPracticeQuizzes);
router.get("/:id", protect, getPracticeQuizById);

router.post("/", protect, adminOnly, createPracticeQuiz);
router.put("/:id", protect, adminOnly, updatePracticeQuiz);
router.delete("/:id", protect, adminOnly, deletePracticeQuiz);

router.post("/:id/generate-ai", protect, adminOnly, generateAIExplanations);

// Advanced Learning Endpoints (Students)
router.post("/history", protect, savePracticeResult);
router.get("/history", protect, getPracticeHistory);
router.get("/analytics", protect, getPracticeAnalytics);
router.get("/wrong-questions", protect, getWrongQuestions);
router.post("/wrong-questions/resolve", protect, resolveWrongQuestion);
router.post("/bookmarks", protect, toggleBookmark);
router.get("/bookmarks", protect, getBookmarks);
router.post("/ai-explain", protect, getAiTutorExplanation);

module.exports = router;
