const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { canManageNotifications } = require("../middleware/adminMiddleware");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  adminSendPush,
  adminTestMyDevice,
  getPushCandidates
} = require("../controllers/notificationController");

// Student Notification Endpoints
router.get("/", protect, getNotifications);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/read", protect, markAsRead);

// Admin Push Notification Endpoints (Protected by canManageNotifications)
router.post("/admin/send", protect, canManageNotifications, adminSendPush);
router.post("/admin/test-my-device", protect, canManageNotifications, adminTestMyDevice);
router.get("/admin/users", protect, canManageNotifications, getPushCandidates);

module.exports = router;
