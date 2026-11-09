const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const {
  getRevenueAnalytics,
  getRevenueTransactions,
  getSingleTransaction,
  updateTransactionStatus,
  getRevenueCustomers,
  getExamsPracticeFinancials,
  getAiUsageAnalytics,
  getRevenueReports
} = require("../controllers/revenueController");
const { adminGrantAccess } = require("../controllers/purchaseController");

// Revenue RBAC permission guards
const revenueViewGuard = [protect, requirePermission(["view_revenue", "manage_revenue"])];
const revenueManageGuard = [protect, requirePermission("manage_revenue")];

// 1. GET /api/admin/revenue/analytics & /overview
router.get("/analytics", ...revenueViewGuard, getRevenueAnalytics);
router.get("/overview", ...revenueViewGuard, getRevenueAnalytics);

// 2. GET /api/admin/revenue/reports
router.get("/reports", ...revenueViewGuard, getRevenueReports);

// 3. Transactions Endpoints
router.get("/transactions", ...revenueViewGuard, getRevenueTransactions);
router.get("/transactions/:id", ...revenueViewGuard, getSingleTransaction);
router.patch("/transactions/:id/status", ...revenueManageGuard, updateTransactionStatus);

// 4. Admin Direct Product Access Grant (Exams, Practice, Series, Flashcards)
router.post("/grant-access", ...revenueManageGuard, adminGrantAccess);

// 5. GET /api/admin/revenue/customers
router.get("/customers", ...revenueViewGuard, getRevenueCustomers);

// 6. GET /api/admin/revenue/exams-practice
router.get("/exams-practice", ...revenueViewGuard, getExamsPracticeFinancials);

// 7. GET /api/admin/revenue/ai-usage
router.get("/ai-usage", ...revenueViewGuard, getAiUsageAnalytics);

module.exports = router;
