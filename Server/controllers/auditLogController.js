const AuditLog = require("../models/AuditLog");
const logAction = require("../utils/logger");

// GET all audit logs (Admin only)
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    res.status(500).json({ message: "Failed to fetch audit logs." });
  }
};

// POST a new audit log (For students starting a quiz)
const createAuditLog = async (req, res) => {
  try {
    const { action, target, module } = req.body;
    
    // Only allow START_QUIZ from this endpoint to prevent abuse
    if (action !== "START_QUIZ") {
      return res.status(403).json({ message: "Invalid action type for client logging." });
    }

    const performedBy = req.user?.fullName || req.user?.name || "Student";
    const ip = req.ip;

    await logAction(action, performedBy, target, module, ip);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Create Audit Log Error:", error);
    res.status(500).json({ message: "Failed to create audit log." });
  }
};

module.exports = {
  getAuditLogs,
  createAuditLog
};
