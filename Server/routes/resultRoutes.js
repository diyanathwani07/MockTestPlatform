const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  saveResult,
  getUserResults,
  getLeaderboard,
  getSharedResult,
  getResultByShareId
} = require("../controllers/resultController");

const router = express.Router();

router.post("/save", protect, saveResult);
router.get("/leaderboard", getLeaderboard);
router.get("/share/:shareId", getSharedResult);
router.get("/by-share/:shareId", getResultByShareId);
router.get("/:userId", protect, getUserResults);

module.exports = router;