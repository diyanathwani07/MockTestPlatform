const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getPremiumStatus, generateAITest, generateFromMaterial } = require("../controllers/aiTestController");

const { aiLimiter } = require("../middleware/rateLimiter");

// Entitlement check endpoint
router.get("/premium-status", protect, getPremiumStatus);

const multer = require("multer");
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Generate custom AI test endpoint
router.post("/generate", protect, aiLimiter, generateAITest);

// Generate custom AI test from uploaded material endpoint
router.post("/generate-from-material", protect, aiLimiter, upload.single("material"), generateFromMaterial);

module.exports = router;
