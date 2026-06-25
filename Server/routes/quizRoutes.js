const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getDashboardStats,
} = require("../controllers/quizController");

// Dashboard stats — admin only
router.get("/stats/dashboard", protect, adminOnly, getDashboardStats);

// Public/general quiz listing (used by both admin panel and student quiz pages)
router.get("/", getQuizzes);
router.get("/:id", getQuizById);

// Admin-only write operations
router.post("/", createQuiz);
router.put("/:id", protect, adminOnly, updateQuiz);

router.delete("/:id", protect, adminOnly, deleteQuiz);

module.exports = router;