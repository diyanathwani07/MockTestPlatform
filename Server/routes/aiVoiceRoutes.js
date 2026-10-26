const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const { aiLimiter } = require("../middleware/rateLimiter");
const {
  createSchedule,
  generateScheduleAudio,
  retryScheduleAudio,
  getAudioStatus,
  getSchedules,
  getScheduleById,
  cancelSchedule,
  deleteSchedule,
  getCallHistory,
  acceptSchedule,
  rejectSchedule,
  endCallSession,
  getSessionAudio,
  getVoiceMetrics
} = require("../controllers/aiVoiceController");

// Schedule management endpoints (authenticated)
router.post("/schedule", protect, aiLimiter, createSchedule);
router.get("/schedule", protect, getSchedules);
router.get("/schedule/:id", protect, getScheduleById);
router.patch("/schedule/:id/cancel", protect, cancelSchedule);
router.delete("/schedule/:id", protect, deleteSchedule);

// Audio generation & status endpoints (authenticated)
router.post("/schedule/:id/generate-audio", protect, aiLimiter, generateScheduleAudio);
router.post("/schedule/:id/retry-audio", protect, aiLimiter, retryScheduleAudio);
router.get("/schedule/:id/audio-status", protect, getAudioStatus);

// User Accept & Reject actions (Phase 4)
router.post("/schedule/:id/accept", protect, acceptSchedule);
router.post("/schedule/:id/reject", protect, rejectSchedule);

// Voice Session Lifecycle & Audio Streaming (Phase 5)
router.post("/session/:callId/end", protect, endCallSession);
router.get("/session/:callId/audio", protect, getSessionAudio);

// Operational Telemetry & Health Metrics (Phase 7 & 8)
router.get("/metrics", protect, adminOnly, getVoiceMetrics);

// Call history endpoint (authenticated)
router.get("/history", protect, getCallHistory);

module.exports = router;
