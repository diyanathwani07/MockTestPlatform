const express = require("express");

const {
  saveResult,
  getUserResults,
  getLeaderboard,
  getSharedResult,
  getResultByShareId
} = require("../controllers/resultController");

const router = express.Router();

router.post("/save", saveResult);
router.get("/leaderboard", getLeaderboard);
router.get("/share/:shareId", getSharedResult);
router.get("/by-share/:shareId", getResultByShareId);
router.get("/:userId", getUserResults);

module.exports = router;