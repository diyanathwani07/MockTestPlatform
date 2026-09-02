const express = require("express");
const router = express.Router();
const { purchaseExam, purchasePractice, getMyExams, getMyPractice } = require("../controllers/purchaseController");
const { protect } = require("../middleware/authMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");

router.post("/exam", protect, paymentLimiter, purchaseExam);
router.post("/practice", protect, paymentLimiter, purchasePractice);
router.get("/my-exams", protect, getMyExams);
router.get("/my-practice", protect, getMyPractice);

module.exports = router;
