const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const {
  createQuestionBank,
  getQuestionBanks,
  getQuestionBankById,
  updateQuestionBank,
  deleteQuestionBank,
} = require("../controllers/questionBankController");

// Public/General read routes
router.get("/", protect, getQuestionBanks);
router.get("/:id", protect, getQuestionBankById);

// Admin-only write routes
router.post("/", protect, adminOnly, createQuestionBank);
router.put("/:id", protect, adminOnly, updateQuestionBank);
router.delete("/:id", protect, adminOnly, deleteQuestionBank);

module.exports = router;
