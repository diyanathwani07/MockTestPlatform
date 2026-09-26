const mongoose = require("mongoose");

const flashcardSetSchema = new mongoose.Schema(
  {
    examSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSeries",
      required: true,
    },
    examStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamStructure",
      default: null,
    },
    subjectName: { type: String, default: "" },
    chapter: { type: String, default: "" },
    topic: { type: String, default: "" },
    year: { type: Number, default: null },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
    },

    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },
    isShuffled: { type: Boolean, default: false },
    
    totalCards: { type: Number, default: 0 },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FlashcardSet", flashcardSetSchema);