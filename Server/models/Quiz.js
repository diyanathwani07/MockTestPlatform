const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
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
  explanation: {
    type: String,
    default: "",
  },
});

const sectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    enum: ["standard", "coding"],
    default: "standard"
  },
  duration: {
    type: Number,
    default: 0, // 0 means use global timer, otherwise section timer in seconds
  },
  marksPerQuestion: {
    type: Number,
    default: 1,
  },
  negativeMarking: {
    type: Number,
    default: 0,
  },
  questionLimit: {
    type: Number,
    default: 0, // 0 means show all
  },
  randomizeOptions: {
    type: Boolean,
    default: false,
  },
  questions: {
    type: [questionSchema], // For standard sections
    default: [],
  },
  subsections: {
    // For coding sections (Easy, Medium, Hard)
    easy: { type: [questionSchema], default: [] },
    medium: { type: [questionSchema], default: [] },
    hard: { type: [questionSchema], default: [] }
  }
});

const quizSchema = new mongoose.Schema(
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
    examName: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
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
    // --- NEW FEATURE FIELDS ---
    enablePerQuestionTimer: {
      type: Boolean,
      default: false,
    },
    timePerQuestion: {
      type: Number,
      default: 0, // in seconds
    },
    lockPreviousQuestions: {
      type: Boolean,
      default: false,
    },
    // -----------------------------
    status: { 
      type: String, 
      default: 'Draft' 
    },
    scheduledDate: { 
      type: Date, 
      default: null 
    },
    // -----------------------------
    published: {
      type: Boolean,
      default: false,
    },
    sections: {
      type: [sectionSchema],
      default: [],
    },
    // Keep legacy questions array for backward compatibility
    questions: {
      type: [questionSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Quiz", quizSchema);