const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed", "Reopened"],
      default: "Open",
    },
    attachment: {
      type: String,
      default: "",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    currentlyViewing: [
      {
        agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        agentName: String,
        lastActive: { type: Date, default: Date.now },
      }
    ],
    replies: [
      {
        senderType: {
          type: String,
          enum: ["Admin", "Student"],
          required: true,
        },
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", 
          required: false, 
        },
        message: {
          type: String,
          required: true,
        },
        attachment: {
          type: String,
          default: "",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    feedbackRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedbackComment: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
