const mongoose = require("mongoose");

const presetSchema = new mongoose.Schema(
  {
    presetName: {
      type: String,
      required: true,
      trim: true,
    },
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    marksPerQuestion: {
      type: Number,
      required: true,
      default: 1,
    },
    negativeMarking: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preset", presetSchema);
