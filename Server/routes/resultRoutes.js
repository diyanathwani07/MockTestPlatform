const express = require("express");

const {
  saveResult,
  getUserResults,
  getLeaderboard
} = require("../controllers/resultController");

const router = express.Router();

router.post("/save", saveResult);
router.get("/leaderboard", getLeaderboard);
router.get("/:userId", getUserResults);

module.exports = router;