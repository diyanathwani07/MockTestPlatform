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

    timeTaken: {
      type: Number,
      default: 0,
    },

    shareId: {
      type: String,
      unique: true,
      sparse: true,
    },

    isPublic: {
      type: Boolean,
      default: true,
    },

    // --- NEW MULTI-SECTION ANALYTICS ---
    sectionResults: [
      {
        sectionId: { type: String },
        sectionTitle: String,
        score: Number,
        totalQuestions: Number,
        correct: Number,
        incorrect: Number,
        timeTaken: Number,
        accuracy: Number,
        type: { type: String } // standard or coding
      }
    ],

    difficultyBreakdown: {
      easy: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
      medium: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
      hard: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } }
    },
    // -----------------------------------
    questions: {
      type: Array,
      default: [],
    },
    userAnswers: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Result", resultSchema);