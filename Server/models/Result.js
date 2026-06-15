const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    userAnswers: Array,
    score: Number,
    total: Number,
    percentage: Number,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", resultSchema);