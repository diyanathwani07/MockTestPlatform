const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  details: { type: String, required: true },
  ipAddress: { type: String },
  module: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);