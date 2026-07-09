const mongoose = require("mongoose");

const practiceResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    practiceQuizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeQuiz",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      default: "Medium",
    },
    stats: {
      totalQuestions: { type: Number, required: true },
      firstTryCorrect: { type: Number, required: true },
      multipleTries: { type: Number, required: true },
      totalWrongAttempts: { type: Number, required: true },
      totalAttemptsAll: { type: Number, required: true },
      timeSpent: { type: Number, required: true }, // in seconds
      accuracy: { type: Number, required: true }, // percentage
    },
    // Array of Question Object IDs inside the PracticeQuiz that were answered incorrectly
    wrongQuestions: [
      {
        questionId: { type: String, required: true },
        questionEnglish: { type: String, required: true },
        questionHindi: { type: String },
        options: { type: [String], required: true },
        correctAnswer: { type: String, required: true },
        explanations: {
          correct: { type: String },
          incorrect: { type: Map, of: String },
          conceptSummary: { type: String }
        }
      }
    ],
    // Tracks which wrong question IDs have been resolved by correct revision attempts
    resolvedQuestions: {
      type: [String], // questionId strings
      default: [],
    },
    status: {
      type: String,
      default: "Completed",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PracticeResult", practiceResultSchema);
