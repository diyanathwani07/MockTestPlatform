const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const { voicePreviewLimiter } = require("../middleware/rateLimiter");
const {
  getVoiceSettings,
  updateVoiceSettings,
  testVoicePreview
} = require("../controllers/voiceSettingController");

// Public endpoint for student portal & admin to fetch active settings
router.get("/", getVoiceSettings);

// Admin-only endpoints for updating settings and live testing voice sample
router.put("/", protect, adminOnly, updateVoiceSettings);
router.post("/preview", protect, adminOnly, voicePreviewLimiter, testVoicePreview);
router.post("/test", protect, adminOnly, voicePreviewLimiter, testVoicePreview);

module.exports = router;
