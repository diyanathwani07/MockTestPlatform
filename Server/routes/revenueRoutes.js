const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  checkRevenueKillSwitch,
  requireSuperAdmin,
  requireFinancialUnlock
} = require("../middleware/revenueSecurityMiddleware");
const {
  verifyFinancialUnlock,
  lockFinancialDashboard,
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

// ALL Revenue routes strictly require:
// 1. Authenticated session (protect)
// 2. Kill switch active (checkRevenueKillSwitch)
// 3. Strict Super Admin role only (requireSuperAdmin - no staff role or permission bypass allowed)
router.use(protect);
router.use(checkRevenueKillSwitch);
router.use(requireSuperAdmin);

// ==========================================
// Financial Security Lock Endpoints
// ==========================================
// Verification endpoint: checks credentials and generates 5-minute unlock token
router.post("/verify-unlock", verifyFinancialUnlock);

// Explicit Lock endpoint: terminates the financial session immediately
router.post("/lock", lockFinancialDashboard);

// ==========================================
// Protected Financial Data Endpoints
// (Requires active, unexpired Financial Unlock Token)
// ==========================================

// 1. GET /api/admin/revenue/analytics & /overview
router.get("/analytics", requireFinancialUnlock, getRevenueAnalytics);
router.get("/overview", requireFinancialUnlock, getRevenueAnalytics);

// 2. GET /api/admin/revenue/reports
router.get("/reports", requireFinancialUnlock, getRevenueReports);

// 3. Transactions Endpoints
router.get("/transactions", requireFinancialUnlock, getRevenueTransactions);
router.get("/transactions/:id", requireFinancialUnlock, getSingleTransaction);
router.patch("/transactions/:id/status", requireFinancialUnlock, updateTransactionStatus);

// 4. Admin Direct Product Access Grant (Exams, Practice, Series, Flashcards)
router.post("/grant-access", requireFinancialUnlock, adminGrantAccess);

// 5. GET /api/admin/revenue/customers
router.get("/customers", requireFinancialUnlock, getRevenueCustomers);

// 6. GET /api/admin/revenue/exams-practice
router.get("/exams-practice", requireFinancialUnlock, getExamsPracticeFinancials);

// 7. GET /api/admin/revenue/ai-usage
router.get("/ai-usage", requireFinancialUnlock, getAiUsageAnalytics);

module.exports = router;
