const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");
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

// Subscribers Analytics & Listing Endpoints (Requires manage_ai_subscribers)
router.get("/subscribers", protect, requirePermission("manage_ai_subscribers"), getSubscribersOverview);
router.get("/subscribers/list", protect, requirePermission("manage_ai_subscribers"), getSubscribersList);
router.get("/subscribers/:studentId", protect, requirePermission("manage_ai_subscribers"), getSubscriberHistory);

// Student/Admin listing endpoints
router.get("/", protect, getAiPlans);
router.post("/subscribe", protect, paymentLimiter, subscribeToPlan);
router.get("/dashboard-metrics", protect, requirePermission(["manage_ai_plans", "view_revenue", "manage_revenue"]), getDashboardMetrics);
router.get("/:id", protect, getAiPlanById);

// Admin-only management endpoints (Requires manage_ai_plans)
router.post("/", protect, requirePermission("manage_ai_plans"), createAiPlan);
router.put("/:id", protect, requirePermission("manage_ai_plans"), updateAiPlan);
router.patch("/:id/status", protect, requirePermission("manage_ai_plans"), updatePlanStatus);
router.delete("/:id", protect, requirePermission("manage_ai_plans"), deleteAiPlan);

module.exports = router;
