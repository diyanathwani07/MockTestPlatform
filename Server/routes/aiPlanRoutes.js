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

// Student/Admin listing endpoints
router.get("/", protect, getAiPlans);
router.post("/subscribe", protect, subscribeToPlan);
router.get("/dashboard-metrics", protect, adminOnly, getDashboardMetrics);
router.get("/:id", protect, getAiPlanById);

// Admin-only management endpoints
router.post("/", protect, adminOnly, createAiPlan);
router.put("/:id", protect, adminOnly, updateAiPlan);
router.patch("/:id/status", protect, adminOnly, updatePlanStatus);
router.delete("/:id", protect, adminOnly, deleteAiPlan);

module.exports = router;
