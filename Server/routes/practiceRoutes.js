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
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, getPracticeQuizzes);
router.get("/:id", protect, getPracticeQuizById);

router.post("/", protect, adminOnly, createPracticeQuiz);
router.put("/:id", protect, adminOnly, updatePracticeQuiz);
router.delete("/:id", protect, adminOnly, deletePracticeQuiz);

router.post("/:id/generate-ai", protect, adminOnly, generateAIExplanations);

module.exports = router;
