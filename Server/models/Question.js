const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    questionEnglish: { type: String, required: true },
    questionHindi: { type: String, default: "" },
    options: {
      type: [String],
      validate: {
        validator: (arr) => arr.length >= 2,
        message: "At least 2 options required",
      },
      required: true,
    },
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: "" },
    explanations: {
      correct: { type: String, default: "" },
      incorrect: { type: Map, of: String, default: {} },
      conceptSummary: { type: String, default: "" },
      didYouKnow: { type: String, default: "" },
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    tags: { type: [String], default: [] },
    subject: { type: String, default: "" },
    aiGenerated: { type: Boolean, default: false },
    questionBankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionBank",
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
