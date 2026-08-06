const mongoose = require("mongoose");

// Legacy embedded question schema (kept for unmigrated data)
const legacyQuestionSchema = new mongoose.Schema({
  questionEnglish: { type: String, required: true },
  questionHindi: { type: String, default: "" },
  options: {
    type: [String],
    validate: {
      validator: (arr) => arr.length >= 2,
      message: "Each question must have at least 2 options.",
    },
    required: true,
  },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: "" },
});

// Legacy embedded section schema (kept for unmigrated data)
const legacySectionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  type: { type: String, enum: ["standard", "coding"], default: "standard" },
  duration: { type: Number, default: 0 },
  marksPerQuestion: { type: Number, default: 1 },
  negativeMarking: { type: Number, default: 0 },
  questionLimit: { type: Number, default: 0 },
  randomizeOptions: { type: Boolean, default: false },
  questions: { type: [legacyQuestionSchema], default: [] },
  subsections: {
    easy: { type: [legacyQuestionSchema], default: [] },
    medium: { type: [legacyQuestionSchema], default: [] },
    hard: { type: [legacyQuestionSchema], default: [] },
  },
});

// New modular section reference schema
const quizSectionRefSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    mode: { type: String, enum: ["linked", "cloned"], required: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    examName: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    duration: { type: Number, required: true },
    marksPerQuestion: { type: Number, required: true, default: 1 },
    negativeMarking: { type: Number, default: 0 },
    enablePerQuestionTimer: { type: Boolean, default: false },
    timePerQuestion: { type: Number, default: 0 },
    lockPreviousQuestions: { type: Boolean, default: false },
    breakBetweenSections: { type: Number, default: 0 },
    status: { type: String, enum: ["Draft", "Published", "Scheduled", "Deleted"], default: "Draft" },
    scheduledDate: { type: Date, default: null },
    published: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    quizType: { type: String, enum: ["exam", "practice", "custom"], default: "exam" },
    isModular: { type: Boolean, default: false },
    // Mixed: holds either legacy embedded sections OR modular section refs
    sections: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // Legacy top-level questions (kept for backward compatibility)
    questions: { type: [legacyQuestionSchema], default: [] },
    examSeriesId: { type: mongoose.Schema.Types.ObjectId, ref: "ExamSeries", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    isPracticePaid: { type: Boolean, default: false },
    practicePrice: { type: Number, default: 0 },
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
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Helpers to detect format
quizSchema.statics.isModularSection = function (section) {
  return section && section.sectionId != null;
};

quizSchema.methods.hasModularSections = function () {
  return (
    this.isModular ||
    (this.sections.length > 0 &&
      this.sections.every((s) => Quiz.isModularSection(s)))
  );
};

const Quiz = mongoose.model("Quiz", quizSchema);

module.exports = Quiz;
module.exports.legacyQuestionSchema = legacyQuestionSchema;
module.exports.legacySectionSchema = legacySectionSchema;
module.exports.quizSectionRefSchema = quizSectionRefSchema;
