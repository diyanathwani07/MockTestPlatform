const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "#6E3FF3",
    },
    slackWebhookUrl: {
      type: String,
      default: "",
    },
    slackNotificationsPaused: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Department", departmentSchema);
