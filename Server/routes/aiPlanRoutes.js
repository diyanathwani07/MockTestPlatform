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
  checkRevenueKillSwitch,
  requireSuperAdmin,
  requireFinancialUnlock
} = require("../middleware/revenueSecurityMiddleware");
const {
  getSubscribersOverview,
  getSubscribersList,
  getSubscriberHistory
} = require("../controllers/subscribersController");

// Subscribers Analytics & Listing Endpoints (Strictly Super Admin + Financial Unlock Protected)
router.get("/subscribers", protect, checkRevenueKillSwitch, requireSuperAdmin, requireFinancialUnlock, getSubscribersOverview);
router.get("/subscribers/list", protect, checkRevenueKillSwitch, requireSuperAdmin, requireFinancialUnlock, getSubscribersList);
router.get("/subscribers/:studentId", protect, checkRevenueKillSwitch, requireSuperAdmin, requireFinancialUnlock, getSubscriberHistory);

// Student/Admin listing endpoints
router.get("/", protect, getAiPlans);
router.post("/subscribe", protect, paymentLimiter, subscribeToPlan);
router.get("/dashboard-metrics", protect, requirePermission("manage_ai_plans"), getDashboardMetrics);
router.get("/:id", protect, getAiPlanById);

// Admin-only management endpoints (Requires manage_ai_plans)
router.post("/", protect, requirePermission("manage_ai_plans"), createAiPlan);
router.put("/:id", protect, requirePermission("manage_ai_plans"), updateAiPlan);
router.patch("/:id/status", protect, requirePermission("manage_ai_plans"), updatePlanStatus);
router.delete("/:id", protect, requirePermission("manage_ai_plans"), deleteAiPlan);

module.exports = router;
