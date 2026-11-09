const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const { getRevenueAnalytics, getRevenueTransactions } = require("../controllers/revenueController");

// GET /api/admin/revenue/analytics - Requires view_revenue or manage_revenue (or Superadmin)
router.get("/analytics", protect, requirePermission(["view_revenue", "manage_revenue"]), getRevenueAnalytics);

// GET /api/admin/revenue/transactions - Requires view_revenue or manage_revenue (or Superadmin)
router.get("/transactions", protect, requirePermission(["view_revenue", "manage_revenue"]), getRevenueTransactions);

module.exports = router;
