const mongoose = require("mongoose");

const quizFolderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Folder title is required"],
      trim: true,
      maxlength: [160, "Folder title cannot exceed 160 characters"]
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    thumbnail: {
      type: String,
      default: ""
    },
    // Null denotes Root level
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuizFolder",
      default: null,
      index: true
    },
    // Ancestors array: [RootId, SubId] for O(1) breadcrumbs and subtree checks
    ancestors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "QuizFolder"
      }
    ],
    // Numerical weight for AppX live reshuffling (lower number displays first: -50, 0, 10...)
    sortOrder: {
      type: Number,
      default: 0,
      index: true
    },
    // Status
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    },
    // AppX Course & Test Series monetization & validity fields
    isCourse: {
      type: Boolean,
      default: true
    },
    price: {
      type: Number,
      default: 0
    },
    mrp: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    validityType: {
      type: String,
      enum: ["lifetime", "days", "date"],
      default: "lifetime"
    },
    validityDays: {
      type: Number,
      default: 365
    },
    validityDate: {
      type: Date,
      default: null
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    detailedDescription: {
      type: String,
      default: ""
    },
    instructions: {
      type: String,
      default: ""
    },
    // Optional link to ExamSeries (e.g. BPSC, CTET, SuperTET)
    examSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSeries",
      default: null,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

// Compound index for instant sorted folder contents retrieval
quizFolderSchema.index({ parentId: 1, sortOrder: 1, createdAt: -1 });

const QuizFolder = mongoose.model("QuizFolder", quizFolderSchema);

module.exports = QuizFolder;
