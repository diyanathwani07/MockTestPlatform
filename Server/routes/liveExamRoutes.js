const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const {
  createLiveExam,
  getLiveExams,
  getLiveExamById,
  updateLiveExam,
  deleteLiveExam,
  endLiveExam,
  getLiveExamAttendance,
  exportLiveExamAttendance,
  getPublicLiveExamInfo,
  getStudentLiveExamState,
  joinLiveExamLobby,
  startLiveExamAttempt,
  getLiveExamPlayData,
  saveLiveExamProgress,
  submitLiveExamAttempt,
  submitLiveExamFeedback,
  getStudentLiveExamsFeed,
} = require("../controllers/liveExamController");

// Public route for shared link resolution (zero answer leakage)
router.get("/public/:slugOrToken", getPublicLiveExamInfo);

// Protected Student Live Exam Routes
router.get("/student-feed", protect, getStudentLiveExamsFeed);
router.get("/student-state/:slugOrToken", protect, getStudentLiveExamState);
router.post("/:id/join-lobby", protect, joinLiveExamLobby);
router.post("/:id/start-attempt", protect, startLiveExamAttempt);
router.get("/attempts/:attemptId/play-data", protect, getLiveExamPlayData);
router.post("/attempts/:attemptId/save-progress", protect, saveLiveExamProgress);
router.post("/attempts/:attemptId/submit", protect, submitLiveExamAttempt);
router.post("/attempts/:attemptId/feedback", protect, submitLiveExamFeedback);

// Protected Admin Routes
router.post("/", protect, adminOnly, createLiveExam);
router.get("/", protect, adminOnly, getLiveExams);
router.get("/:id", protect, adminOnly, getLiveExamById);
router.put("/:id", protect, adminOnly, updateLiveExam);
router.delete("/:id", protect, adminOnly, deleteLiveExam);
router.post("/:id/end", protect, adminOnly, endLiveExam);
router.get("/:id/attendance", protect, adminOnly, getLiveExamAttendance);
router.get("/:id/export", protect, adminOnly, exportLiveExamAttendance);


module.exports = router;
