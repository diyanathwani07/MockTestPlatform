const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  permissions: { type: [String], default: [] },
  isSystem: { type: Boolean, default: false },
  color: { type: String, default: "#6E3FF3" },
  full_access: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Role", roleSchema);
