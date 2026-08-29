const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getPremiumStatus, generateAITest } = require("../controllers/aiTestController");

// Entitlement check endpoint
router.get("/premium-status", protect, getPremiumStatus);

// Generate custom AI test endpoint
router.post("/generate", protect, generateAITest);

module.exports = router;
