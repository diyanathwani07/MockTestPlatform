const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Folder name is required"],
      trim: true,
      maxlength: [120, "Folder name cannot exceed 120 characters"]
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    // Null denotes a Root Folder
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
      index: true
    },
    // Ancestor IDs array for O(1) subtree retrieval and hierarchy validation
    ancestors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folder"
      }
    ],
    // Scope determines if the folder is platform-wide or tied to a specific exam series
    scope: {
      type: String,
      enum: ["global", "exam_specific"],
      required: [true, "Folder scope is required"],
      default: "global",
      index: true
    },
    // References ExamSeries when scope === 'exam_specific'; must be null when scope === 'global'
    examSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSeries",
      default: null,
      index: true
    },
    // Optional link to a specific ExamStructure or Subject for fine-grained syllabus mapping
    examStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamStructure",
      default: null
    },
    subjectName: {
      type: String,
      trim: true,
      default: null
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    color: {
      type: String,
      trim: true,
      default: "#8B5CF6"
    },
    icon: {
      type: String,
      trim: true,
      default: "folder"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator user reference is required"]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for child folders
folderSchema.virtual("children", {
  ref: "Folder",
  localField: "_id",
  foreignField: "parentId",
  match: { isDeleted: false }
});

// Virtual for study resources inside this folder
folderSchema.virtual("resources", {
  ref: "Resource",
  localField: "_id",
  foreignField: "folderId",
  match: { isDeleted: false }
});

// Compound indexes
folderSchema.index({ parentId: 1, order: 1 });
folderSchema.index({ scope: 1, examSeriesId: 1, isDeleted: 1 });
folderSchema.index({ isActive: 1, isDeleted: 1 });
folderSchema.index({ ancestors: 1 });

// Model-level validation for scope and examSeriesId
folderSchema.pre("validate", function() {
  if (this.scope === "global" && this.examSeriesId) {
    this.invalidate("examSeriesId", "Global folders must not be tied to an examSeriesId");
  }
  if (this.scope === "exam_specific" && !this.examSeriesId) {
    this.invalidate("examSeriesId", "Exam-specific folders require a valid examSeriesId");
  }
});

module.exports = mongoose.model("Folder", folderSchema);
