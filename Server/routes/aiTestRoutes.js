const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getPremiumStatus, generateAITest } = require("../controllers/aiTestController");

const { aiLimiter } = require("../middleware/rateLimiter");

// Entitlement check endpoint
router.get("/premium-status", protect, getPremiumStatus);

// Generate custom AI test endpoint
router.post("/generate", protect, aiLimiter, generateAITest);

module.exports = router;
