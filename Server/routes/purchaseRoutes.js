const express = require("express");
const router = express.Router();
const {
  purchaseExam,
  purchasePractice,
  getMyExams,
  getMyPractice,
  getMyTransactions
} = require("../controllers/purchaseController");
const { protect } = require("../middleware/authMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");

// Student Purchase Endpoints
router.post("/exam", protect, paymentLimiter, purchaseExam);
router.post("/practice", protect, paymentLimiter, purchasePractice);

// Student Entitlement & History Queries
router.get("/my-exams", protect, getMyExams);
router.get("/my-practice", protect, getMyPractice);
router.get("/my-transactions", protect, getMyTransactions);

module.exports = router;
