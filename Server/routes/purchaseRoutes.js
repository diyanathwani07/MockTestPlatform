const express = require("express");
const router = express.Router();
const { purchaseExam, purchasePractice, getMyExams, getMyPractice } = require("../controllers/purchaseController");
const { protect } = require("../middleware/authMiddleware");

router.post("/exam", protect, purchaseExam);
router.post("/practice", protect, purchasePractice);
router.get("/my-exams", protect, getMyExams);
router.get("/my-practice", protect, getMyPractice);

module.exports = router;
