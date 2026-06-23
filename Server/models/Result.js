const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
    },

    quizTitle: {
      type: String,
      default: null,
    },

    subject: {
      type: String,
      default: null,
    },

    examName: {
      type: String,
      default: null,
    },

    reaction: {
      type: String,
      default: null,
    },

    feedbackMessage: {
      type: String,
      default: null,
    },

    score: {
      type: Number,
      required: true,
    },

    total: {
      type: Number,
      required: true,
    },

    correct: {
      type: Number,
      required: true,
    },

    incorrect: {
      type: Number,
      required: true,
    },

    percentage: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Result", resultSchema);