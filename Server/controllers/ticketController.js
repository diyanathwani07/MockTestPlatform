const Ticket = require("../models/Ticket");
const logAction = require("../utils/logger");

// @desc    Submit a new support ticket
// @route   POST /api/tickets
// @access  Private (User/Student)
const createTicket = async (req, res) => {
  try {
    const { subject, category, message } = req.body;

    if (!subject || !category || !message) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    let attachmentPath = "";
    if (req.file) {
      attachmentPath = `/uploads/${req.file.filename}`;
    }

    const ticket = await Ticket.create({
      userId: req.user._id,
      subject,
      category,
      message,
      attachment: attachmentPath,
    });

    await logAction("CREATE_TICKET", req.user.fullName || "User", `Ticket: ${subject}`, "Support", req.ip);

    res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Create Ticket Error:", error);
    res.status(500).json({ message: `Failed to submit ticket: ${error.message}` });
  }
};

// @desc    Get user's support tickets
// @route   GET /api/tickets/my-tickets
// @access  Private (User/Student)
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error("Get My Tickets Error:", error);
    res.status(500).json({ message: "Failed to fetch tickets." });
  }
};

// @desc    Get all support tickets (Admin)
// @route   GET /api/tickets
// @access  Private (Admin)
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 }); // Newest first
    res.json(tickets);
  } catch (error) {
    console.error("Get All Tickets Error:", error);
    res.status(500).json({ message: "Failed to fetch tickets." });
  }
};

// @desc    Update ticket status (Admin)
// @route   PUT /api/tickets/:id
// @access  Private (Admin)
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!["Open", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    ticket.status = status;
    await ticket.save();

    await logAction("UPDATE_TICKET", req.user.fullName || "Admin", `Status changed to ${status} for ticket: ${ticket.subject}`, "Support", req.ip);

    res.json({
      success: true,
      message: "Ticket status updated.",
      ticket,
    });
  } catch (error) {
    console.error("Update Ticket Error:", error);
    res.status(500).json({ message: "Failed to update ticket." });
  }
};

// @desc    Reply to a ticket (Admin or Student)
// @route   POST /api/tickets/:id/reply
// @access  Private
const replyToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: "Reply message cannot be empty." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Determine sender type (Admin vs Student)
    const senderType = req.user.role === "admin" || req.user.role === "superadmin" ? "Admin" : "Student";
    
    let attachmentPath = "";
    if (req.file) {
      attachmentPath = `/uploads/${req.file.filename}`;
    }

    // Add reply
    ticket.replies.push({
      senderType,
      senderId: req.user._id,
      message,
      attachment: attachmentPath,
    });

    // Optionally update ticket status to In Progress if Admin replies to an Open ticket
    if (senderType === "Admin" && ticket.status === "Open") {
      ticket.status = "In Progress";
    }

    await ticket.save();

    await logAction("TICKET_REPLY", req.user.fullName || "User", `Replied to ticket: ${ticket.subject}`, "Support", req.ip);

    res.status(201).json({
      success: true,
      message: "Reply added successfully.",
      ticket, // Returns updated ticket with new replies array
    });
  } catch (error) {
    console.error("Reply to Ticket Error:", error);
    res.status(500).json({ message: "Failed to add reply." });
  }
};

const reopenTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const ticketOwnerId = ticket.userId._id ? ticket.userId._id.toString() : ticket.userId.toString();
    const currentUserId = req.user._id.toString();

    if (ticketOwnerId !== currentUserId) {
      return res.status(403).json({ message: "Not authorized to reopen this ticket." });
    }

    ticket.status = "Open";
    await ticket.save();

    await logAction("REOPEN_TICKET", req.user.fullName || "User", `Reopened ticket: ${ticket.subject}`, "Support", req.ip);

    res.json({
      success: true,
      message: "Ticket has been reopened.",
      ticket,
    });
  } catch (error) {
    console.error("Reopen Ticket Error:", error);
    res.status(500).json({ message: "Failed to reopen ticket." });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAllTickets,
  updateTicketStatus,
  replyToTicket,
  reopenTicket,
};
