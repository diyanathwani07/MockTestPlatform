const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const { getRevenueAnalytics } = require("../controllers/revenueController");

// GET /api/admin/revenue/analytics
router.get("/analytics", protect, adminOnly, getRevenueAnalytics);

module.exports = router;
