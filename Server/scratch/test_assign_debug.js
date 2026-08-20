require("dotenv").config();
const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const logAction = require("../utils/logger");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ role: "admin" });
    const ticket = await Ticket.findOne();
    
    ticket.assignedTo = user._id;
    if (ticket.status === "Open") {
      ticket.status = "In Progress";
    }

    await ticket.save();
    await ticket.populate("assignedTo", "fullName email");
    
    // Test the exact logAction call
    await logAction("ASSIGN_TICKET", user.fullName || "Admin", `Assigned ticket: ${ticket.subject} to self`, "Support", "127.0.0.1");
    console.log("Entire logic completed successfully!");
  } catch (err) {
    console.error("FAILED AT LOGACTION OR OTHER LOGIC:", err);
  } finally {
    await mongoose.connection.close();
  }
}
run();
