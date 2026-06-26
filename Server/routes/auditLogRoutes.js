const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

const {
  getAuditLogs,
  createAuditLog,
} = require("../controllers/auditLogController");

// Admin fetches all logs
router.get("/", protect, adminOnly, getAuditLogs);

// Students (or any authenticated user) post start logs
router.post("/", protect, createAuditLog);

module.exports = router;
