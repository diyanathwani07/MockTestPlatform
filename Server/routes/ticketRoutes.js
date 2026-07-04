const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const { createTicket, getMyTickets, getAllTickets, updateTicketStatus } = require("../controllers/ticketController");

// Student Routes
router.post("/", protect, createTicket);
router.get("/my-tickets", protect, getMyTickets);

// Admin Routes
router.get("/", protect, adminOnly, getAllTickets);
router.put("/:id", protect, adminOnly, updateTicketStatus);

module.exports = router;
