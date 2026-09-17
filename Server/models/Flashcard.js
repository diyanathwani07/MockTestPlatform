const mongoose = require("mongoose");

const flashcardSchema = new mongoose.Schema(
  {
    flashcardSetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FlashcardSet",
      required: true,
    },
    front: { type: String, required: true },
    back: { type: String, required: true },
    
    explanation: { type: String, default: "" },
    example: { type: String, default: "" },
    formula: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    tags: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Flashcard", flashcardSchema);