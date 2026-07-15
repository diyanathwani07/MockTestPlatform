const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["standard", "coding"], default: "standard" },
    duration: { type: Number, default: 0 },
    marksPerQuestion: { type: Number, default: 1 },
    negativeMarking: { type: Number, default: 0 },
    questionLimit: { type: Number, default: 0 },
    randomizeOptions: { type: Boolean, default: false },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    subsections: {
      easy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
      medium: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
      hard: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    },
    isStandalone: { type: Boolean, default: false },
    clonedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Section", sectionSchema);
