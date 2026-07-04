const express = require("express");
const { chatSupport } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Route to handle chat messages
// Using 'protect' middleware to ensure only logged-in students can use the bot
router.post("/", protect, chatSupport);

module.exports = router;
