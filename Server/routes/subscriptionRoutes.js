const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getMySubscriptionHistory } = require("../controllers/subscriptionController");

// GET logged-in user's subscription history
router.get("/my", protect, getMySubscriptionHistory);

module.exports = router;
