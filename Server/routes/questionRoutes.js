const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const {
  createQuestion,
  bulkCreateQuestions,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/questionController");

// Public/General read queries (or protected/general student routes)
router.get("/", protect, getQuestions);
router.get("/:id", protect, getQuestionById);

// Admin-only write endpoints
router.post("/", protect, adminOnly, createQuestion);
router.post("/bulk", protect, adminOnly, bulkCreateQuestions);
router.put("/:id", protect, adminOnly, updateQuestion);
router.delete("/:id", protect, adminOnly, deleteQuestion);

module.exports = router;
