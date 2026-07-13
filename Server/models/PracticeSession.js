const mongoose = require("mongoose");

const practiceSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    practiceQuizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PracticeQuiz",
      required: true,
    },
    questionsOrder: {
      type: [Number], // Indicated indexes of questions in the original array
      required: true,
    },
    optionsOrder: {
      type: Map, // key: questionIndex or question ID, value: Array of option indices [2, 0, 1, 3]
      of: [Number],
      required: true,
    },
  },
  { timestamps: true }
);

// Unique index so a user only has one active session per practice quiz
practiceSessionSchema.index({ userId: 1, practiceQuizId: 1 }, { unique: true });

module.exports = mongoose.model("PracticeSession", practiceSessionSchema);
