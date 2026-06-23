const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/adminMiddleware");
const Result = require("../models/Result");

// GET all results (admin only) — populates user info
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const results = await Result.find()
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 });

    res.json(results);
  } catch (error) {
    console.error("Get Results Error:", error);
    res.status(500).json({ message: "Failed to fetch results." });
  }
});

module.exports = router;