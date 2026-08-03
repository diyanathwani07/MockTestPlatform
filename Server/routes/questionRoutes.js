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
  restoreQuestion,
  permanentlyDeleteQuestion,
  getSubjects,
} = require("../controllers/questionController");

// Public/General read queries (or protected/general student routes)
router.get("/", protect, getQuestions);
router.get("/subjects", protect, getSubjects);
router.get("/:id", protect, getQuestionById);

// Admin-only write endpoints
router.post("/", protect, adminOnly, createQuestion);
router.post("/bulk", protect, adminOnly, bulkCreateQuestions);
router.put("/:id", protect, adminOnly, updateQuestion);
router.delete("/:id", protect, adminOnly, deleteQuestion);
router.put("/:id/restore", protect, adminOnly, restoreQuestion);
router.delete("/:id/permanent", protect, adminOnly, permanentlyDeleteQuestion);

module.exports = router;
