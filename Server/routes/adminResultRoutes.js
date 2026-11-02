const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const Result = require("../models/Result");

// GET all results (admin only) — optimized projection excluding heavy embedded arrays
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const results = await Result.find()
      .select("-questions -userAnswers -sectionResults -difficultyBreakdown")
      .populate("userId", "fullName email")
      .populate("quizId", "title subject")
      .sort({ createdAt: -1 })
      .lean();

    res.json(results);
  } catch (error) {
    console.error("Get Results Error:", error);
    res.status(500).json({ message: "Failed to fetch results." });
  }
});

module.exports = router;
