const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const {
  getRevenueAnalytics,
  getRevenueTransactions,
  getRevenueCustomers,
  getExamsPracticeFinancials,
  getAiUsageAnalytics
} = require("../controllers/revenueController");

// Revenue RBAC permission guard
const revenueGuard = [protect, requirePermission(["view_revenue", "manage_revenue"])];

// GET /api/admin/revenue/analytics & /overview
router.get("/analytics", ...revenueGuard, getRevenueAnalytics);
router.get("/overview", ...revenueGuard, getRevenueAnalytics);

// GET /api/admin/revenue/transactions
router.get("/transactions", ...revenueGuard, getRevenueTransactions);

// GET /api/admin/revenue/customers
router.get("/customers", ...revenueGuard, getRevenueCustomers);

// GET /api/admin/revenue/exams-practice
router.get("/exams-practice", ...revenueGuard, getExamsPracticeFinancials);

// GET /api/admin/revenue/ai-usage
router.get("/ai-usage", ...revenueGuard, getAiUsageAnalytics);

module.exports = router;
