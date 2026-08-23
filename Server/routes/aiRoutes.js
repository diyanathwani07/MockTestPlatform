const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { fixGrammar } = require("../controllers/aiController");

router.post("/fix-grammar", protect, fixGrammar);
router.get("/test-key", (req, res) => {
  res.json({
    exists: !!process.env.GEMINI_API_KEY,
    length: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
    prefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 7) : ""
  });
});

module.exports = router;
