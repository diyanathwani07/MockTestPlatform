const AuditLog = require('../models/AuditLog');

const logAction = async (action, performedBy, details, module, ip) => {
  try {
    await AuditLog.create({ action, performedBy, details, module, ipAddress: ip });
  } catch (err) {
    console.error("Audit Logging Error:", err);
  }
};

module.exports = logAction;