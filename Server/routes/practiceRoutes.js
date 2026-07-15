const express = require("express");
const router = express.Router();
const {
  getPracticeQuizzes,
  getPracticeQuizById,
  createPracticeQuiz,
  updatePracticeQuiz,
  deletePracticeQuiz,
  restorePracticeQuiz,
  permanentlyDeletePracticeQuiz,
  generateAIExplanations,
  getOrCreatePracticeSession,
  convertToExam
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

// ── STATIC ROUTES FIRST (must come before /:id to avoid conflicts) ──

// Practice Quiz list
router.get("/", protect, getPracticeQuizzes);
router.post("/", protect, adminOnly, createPracticeQuiz);

// Advanced Learning Endpoints (Students)
router.post("/history", protect, savePracticeResult);
router.get("/history", protect, getPracticeHistory);
router.get("/analytics", protect, getPracticeAnalytics);
router.get("/wrong-questions", protect, getWrongQuestions);
router.post("/wrong-questions/resolve", protect, resolveWrongQuestion);
router.post("/bookmarks", protect, toggleBookmark);
router.get("/bookmarks", protect, getBookmarks);
router.post("/ai-explain", protect, getAiTutorExplanation);

// ── DYNAMIC :id ROUTES AFTER (so static routes above are not swallowed) ──

router.get("/:id", protect, getPracticeQuizById);
router.get("/:id/session", protect, getOrCreatePracticeSession);  // ✅ was missing entirely

router.put("/:id", protect, adminOnly, updatePracticeQuiz);
router.delete("/:id", protect, adminOnly, deletePracticeQuiz);
router.put("/:id/restore", protect, adminOnly, restorePracticeQuiz);
router.delete("/:id/permanent", protect, adminOnly, permanentlyDeletePracticeQuiz);
router.post("/:id/generate-ai", protect, adminOnly, generateAIExplanations);
router.post("/:id/convert-to-exam", protect, adminOnly, convertToExam);

module.exports = router;