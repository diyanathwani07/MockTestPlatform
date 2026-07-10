const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    phone: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    district: {
      type: String,
    },

    state: {
      type: String,
    },
    dateOfBirth: {
      type: String,
    },
    gender: {
      type: String,
    },
    bio: {
      type: String,
    },
    location: {
      type: String,
    },
    avatar: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    department: {
      type: String,
      enum: ["Technical Team", "Content Team", "Calling Team", "YouTube Team", "Faculty", "Operations Team", null],
      default: null,
    },
    permissions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["Active", "Suspended"],
      default: "Active",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    practiceStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastPracticeDate: {
      type: Date,
    },
    totalXp: {
      type: Number,
      default: 0,
    },
    bookmarkedQuestions: [
      {
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: "PracticeQuiz" },
        questionId: { type: String, required: true },
        questionEnglish: { type: String, required: true },
        questionHindi: { type: String },
        options: { type: [String], required: true },
        correctAnswer: { type: String, required: true },
        explanations: {
          correct: { type: String },
          incorrect: { type: Map, of: String },
          conceptSummary: { type: String }
        }
      }
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);