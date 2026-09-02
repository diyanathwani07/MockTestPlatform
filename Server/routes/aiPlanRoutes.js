const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const {
  getAiPlans,
  getAiPlanById,
  createAiPlan,
  updateAiPlan,
  updatePlanStatus,
  deleteAiPlan,
  subscribeToPlan,
  getDashboardMetrics
} = require("../controllers/aiPlanController");
const {
  getSubscribersOverview,
  getSubscribersList,
  getSubscriberHistory
} = require("../controllers/subscribersController");

// Subscribers Analytics & Listing Endpoints (Admin-only)
router.get("/subscribers", protect, adminOnly, getSubscribersOverview);
router.get("/subscribers/list", protect, adminOnly, getSubscribersList);
router.get("/subscribers/:studentId", protect, adminOnly, getSubscriberHistory);

const { paymentLimiter } = require("../middleware/rateLimiter");

// Student/Admin listing endpoints
router.get("/", protect, getAiPlans);
router.post("/subscribe", protect, paymentLimiter, subscribeToPlan);
router.get("/dashboard-metrics", protect, adminOnly, getDashboardMetrics);
router.get("/:id", protect, getAiPlanById);

// Admin-only management endpoints
router.post("/", protect, adminOnly, createAiPlan);
router.put("/:id", protect, adminOnly, updateAiPlan);
router.patch("/:id/status", protect, adminOnly, updatePlanStatus);
router.delete("/:id", protect, adminOnly, deleteAiPlan);

module.exports = router;
