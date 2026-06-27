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

    const ticket = await Ticket.create({
      userId: req.user._id,
      subject,
      category,
      message,
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

module.exports = {
  createTicket,
  getAllTickets,
  updateTicketStatus,
};
