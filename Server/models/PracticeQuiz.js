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
      validator: (arr) => arr.length >= 2 && arr.length <= 6,
      message: "Each question must have between 2 and 6 options.",
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
    examName: {
      type: String,
      default: "",
      trim: true,
    },
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
    duration: {
      type: Number,
      default: 0,
    },
    marksPerQuestion: {
      type: Number,
      default: 1,
    },
    negativeMarking: {
      type: Number,
      default: 0,
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
    },
    linkedExamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
    },
    isModular: {
      type: Boolean,
      default: false,
    },
    sections: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    detailedDescription: { type: String, default: "" },
    plans: {
      type: [{
        planName: { type: String, default: "" },
        durationMonths: { type: Number, required: true },
        originalPrice: { type: Number, default: 0 },
        discountPercent: { type: Number, default: 0 },
        price: { type: Number, required: true }, // Selling price
        discountLabel: { type: String, default: "" },
        isActive: { type: Boolean, default: true }
      }],
      default: []
    },
    thumbnail: { type: String, default: "" },
    category: { type: String, default: "" },
  },
  { timestamps: true }
);

// Helpers to detect format
practiceQuizSchema.statics.isModularSection = function (section) {
  return section && section.sectionId != null;
};

practiceQuizSchema.methods.hasModularSections = function () {
  return (
    this.isModular ||
    (this.sections.length > 0 &&
      this.sections.every((s) => mongoose.model("PracticeQuiz").isModularSection(s)))
  );
};

module.exports = mongoose.model("PracticeQuiz", practiceQuizSchema);
