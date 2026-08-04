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
      .populate("assignedTo", "fullName email")
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
    
    if (!["Open", "In Progress", "Resolved", "Reopened"].includes(status)) {
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

    ticket.status = "Reopened";
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

const closeTicket = async (req, res) => {
  try {
    const { feedbackRating, feedbackComment } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const ticketOwnerId = ticket.userId._id ? ticket.userId._id.toString() : ticket.userId.toString();
    const currentUserId = req.user._id.toString();

    if (ticketOwnerId !== currentUserId) {
      return res.status(403).json({ message: "Not authorized to close this ticket." });
    }

    ticket.status = "Resolved";
    
    if (feedbackRating) {
      ticket.feedbackRating = Number(feedbackRating);
    }
    if (feedbackComment !== undefined) {
      ticket.feedbackComment = feedbackComment;
    }

    await ticket.save();

    await logAction("CLOSE_TICKET", req.user.fullName || "User", `Closed ticket with rating ${feedbackRating || 'none'}: ${ticket.subject}`, "Support", req.ip);

    res.json({
      success: true,
      message: "Ticket has been closed with feedback.",
      ticket,
    });
  } catch (error) {
    console.error("Close Ticket Error:", error);
    res.status(500).json({ message: "Failed to close ticket." });
  }
};

const assignTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const targetAgentId = req.body.assignedTo || req.user._id;
    ticket.assignedTo = targetAgentId;
    if (ticket.status === "Open") {
      ticket.status = "In Progress";
    }

    await ticket.save();
    await ticket.populate("assignedTo", "fullName email");

    const assignTargetName = ticket.assignedTo ? ticket.assignedTo.fullName : "Unknown";
    await logAction(
      "ASSIGN_TICKET", 
      req.user.fullName || "Admin", 
      `Assigned ticket: ${ticket.subject} to ${assignTargetName}`, 
      "Support", 
      req.ip
    );

    // Send email notification if assigned to another agent/admin
    if (ticket.assignedTo && ticket.assignedTo._id.toString() !== req.user._id.toString() && ticket.assignedTo.email) {
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        const mailOptions = {
          from: `"Teaching Pariksha Support" <${process.env.SMTP_EMAIL}>`,
          to: ticket.assignedTo.email,
          subject: `Support Ticket Assigned: ${ticket.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ECE9F7; border-radius: 12px; background-color: #ffffff; color: #333333;">
              <h2 style="color: #6E3FF3; margin-top: 0; border-bottom: 2px solid #6E3FF3; padding-bottom: 10px;">Support Ticket Assigned</h2>
              <p>Hello <strong>${ticket.assignedTo.fullName}</strong>,</p>
              <p>You have been assigned a support ticket by <strong>${req.user.fullName || "Admin"}</strong>.</p>
              <div style="background-color: #F8F7FF; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(110, 63, 243, 0.1);">
                <p style="margin: 0 0 8px 0;"><strong>Ticket ID:</strong> #${ticket._id}</p>
                <p style="margin: 0 0 8px 0;"><strong>Subject:</strong> ${ticket.subject}</p>
                <p style="margin: 0 0 8px 0;"><strong>Category:</strong> ${ticket.category}</p>
                <p style="margin: 0;"><strong>Status:</strong> ${ticket.status}</p>
              </div>
              <p>Please log in to the administrative panel to respond to this ticket and resolve the query.</p>
              <p style="color: #777777; font-size: 12px; margin-top: 30px; border-top: 1px solid #ECE9F7; padding-top: 10px;">
                This is an automated notification. Please do not reply directly to this email.
              </p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Notification email sent to agent: ${ticket.assignedTo.email}`);
      } catch (mailErr) {
        console.error("Failed to send assignment notification email:", mailErr);
        // Do not crash the response even if email delivery fails
      }
    }

    res.json({
      success: true,
      message: "Ticket assigned successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Assign Ticket Error:", error);
    res.status(500).json({ message: "Failed to assign ticket." });
  }
};

const releaseTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    ticket.assignedTo = null;
    if (ticket.status === "In Progress") {
      ticket.status = "Open";
    }

    await ticket.save();

    await logAction("UNASSIGN_TICKET", req.user.fullName || "Admin", `Released ticket: ${ticket.subject}`, "Support", req.ip);

    res.json({
      success: true,
      message: "Ticket unassigned successfully.",
      ticket,
    });
  } catch (error) {
    console.error("Release Ticket Error:", error);
    res.status(500).json({ message: "Failed to release/unassign ticket." });
  }
};

const heartbeatViewing = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const now = Date.now();
    const tenSecondsAgo = now - 10000;

    // Filter out expired views or views by the same agent (which we will re-add/update)
    let activeViews = ticket.currentlyViewing.filter(
      (view) => view.lastActive && view.lastActive.getTime() > tenSecondsAgo && view.agentId.toString() !== req.user._id.toString()
    );

    // Add current agent
    activeViews.push({
      agentId: req.user._id,
      agentName: req.user.fullName || "Admin",
      lastActive: now,
    });

    // DO AN ATOMIC UPDATE instead of ticket.save() to prevent concurrent field overwrite race conditions
    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { $set: { currentlyViewing: activeViews } },
      { new: true }
    );

    res.json({
      success: true,
      currentlyViewing: updatedTicket.currentlyViewing,
    });
  } catch (error) {
    console.error("Heartbeat Viewing Error:", error);
    res.status(500).json({ message: "Failed to update viewing status." });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAllTickets,
  updateTicketStatus,
  replyToTicket,
  reopenTicket,
  closeTicket,
  assignTicket,
  releaseTicket,
  heartbeatViewing,
};

