const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

const {
  saveResult,
  getUserResults,
  getLeaderboard,
  getSharedResult,
  getResultByShareId,
  getResultById,
  updateResultFeedback,
  getAllAttempts,
  getScoreAnalytics
} = require("../controllers/resultController");

const router = express.Router();

router.get("/admin/all-attempts", protect, adminOnly, getAllAttempts);
router.get("/admin/score-analytics", protect, adminOnly, getScoreAnalytics);

router.post("/save", protect, saveResult);
router.put("/feedback/:resultId", protect, updateResultFeedback);
router.get("/leaderboard", getLeaderboard);
router.get("/share/:shareId", getSharedResult);
router.get("/by-share/:shareId", getResultByShareId);
router.get("/detail/:resultId", protect, getResultById);
router.get("/id/:resultId", protect, getResultById);
router.get("/:userId", protect, getUserResults);

module.exports = router;