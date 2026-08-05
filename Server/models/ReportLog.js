const mongoose = require("mongoose");

const reportLogSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      required: true,
    },
    monthYear: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    recipient: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReportLog", reportLogSchema);
