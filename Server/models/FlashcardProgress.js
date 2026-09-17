const mongoose = require("mongoose");

const flashcardProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    flashcardSetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FlashcardSet",
      required: true,
    },
    flashcardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flashcard",
      required: true,
    },
    status: {
      type: String,
      enum: ["Learning", "Known"],
      default: "Learning",
    },
    reviewCount: { type: Number, default: 0 },
    lastReviewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A student can have only one progress record per flashcard
flashcardProgressSchema.index({ studentId: 1, flashcardId: 1 }, { unique: true });

module.exports = mongoose.model("FlashcardProgress", flashcardProgressSchema);