const mongoose = require("mongoose");

const practiceQuestionSchema = new mongoose.Schema({
  questionEnglish: {
    type: String,
    required: true,
  },
  questionHindi: {
    type: String,
    default: "",
  },
  options: {
    type: [String],
    validate: {
      validator: (arr) => arr.length === 4,
      message: "Each question must have exactly 4 options.",
    },
    required: true,
  },
  correctAnswer: {
    type: String,
    required: true,
  },
  explanations: {
    correct: { type: String, default: "" }, // explanation for the correct answer
    incorrect: { type: Map, of: String, default: {} }, // option text -> explanation for that incorrect option
    conceptSummary: { type: String, default: "" }, // general concept summary
    didYouKnow: { type: String, default: "" } // interesting facts
  },
  aiGenerated: { 
    type: Boolean, 
    default: false 
  }
});

const practiceQuizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    questions: [practiceQuestionSchema],
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    randomSelection: {
      type: Boolean,
      default: false,
    },
    questionsPerAttempt: {
      type: Number,
      default: 20,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PracticeQuiz", practiceQuizSchema);
