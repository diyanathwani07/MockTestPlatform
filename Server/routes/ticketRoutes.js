const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");
const Ticket = require("../models/Ticket");
const {
  createTicket,
  getMyTickets,
  getAllTickets,
  updateTicketStatus,
  replyToTicket,
  reopenTicket,
  closeTicket,
  assignTicket,
  releaseTicket,
  heartbeatViewing
} = require("../controllers/ticketController");

// Student Routes
router.post("/", protect, upload.single("attachment"), createTicket);
router.get("/my-tickets", protect, getMyTickets);
router.put("/:id/reopen", protect, reopenTicket);
router.put("/:id/close", protect, closeTicket);

// Admin Routes
router.get("/", protect, adminOnly, getAllTickets);
router.put("/:id", protect, adminOnly, updateTicketStatus);
router.put("/:id/assign", protect, adminOnly, assignTicket);
router.put("/:id/unassign", protect, adminOnly, releaseTicket);
router.put("/:id/heartbeat", protect, adminOnly, heartbeatViewing);


// Shared Routes (Admin & Student)
router.get("/:id", protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("userId", "fullName email role")
      .populate("replies.sender", "fullName email role");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Verify access permission: requester must be admin/staff OR the ticket owner
    const isStaff = ["admin", "superadmin"].includes(req.user.role);
    const isOwner = ticket.userId?._id?.toString() === req.user._id?.toString() || ticket.userId?.toString() === req.user._id?.toString();

    if (!isStaff && !isOwner) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Get Ticket Details Error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Ticket not found." });
    }
    res.status(500).json({ message: "Failed to fetch ticket details." });
  }
});

router.post("/:id/reply", protect, upload.single("attachment"), replyToTicket);

module.exports = router;
