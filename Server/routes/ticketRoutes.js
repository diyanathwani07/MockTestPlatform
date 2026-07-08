const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { createTicket, getMyTickets, getAllTickets, updateTicketStatus, replyToTicket } = require("../controllers/ticketController");

// Student Routes
router.post("/", protect, upload.single("attachment"), createTicket);
router.get("/my-tickets", protect, getMyTickets);

// Admin Routes
router.get("/", protect, adminOnly, getAllTickets);
router.put("/:id", protect, adminOnly, updateTicketStatus);

// Shared Routes (Admin & Student)
router.post("/:id/reply", protect, upload.single("attachment"), replyToTicket);

module.exports = router;
