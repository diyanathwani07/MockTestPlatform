const mongoose = require("mongoose");

const liveExamAttemptSchema = new mongoose.Schema(
  {
    liveExamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LiveExamination",
      required: true,
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "registered",
        "in_lobby",
        "ready",
        "in_progress",
        "submitted",
        "auto_submitted",
        "disqualified",
      ],
      default: "registered",
      index: true,
    },

    lobbyJoinedAt: {
      type: Date,
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    serverDeadline: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    lastPingAt: {
      type: Date,
      default: null,
    },

    webcamStatus: {
      type: String,
      enum: ["none", "pending", "granted", "denied", "unavailable"],
      default: "none",
    },

    connectionStatus: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },

    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },

    answeredCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    savedAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    resultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      default: null,
    },

    timeline: [
      {
        event: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: Strictly ensures one attempt per student per live exam
liveExamAttemptSchema.index({ liveExamId: 1, studentId: 1 }, { unique: true });

/**
 * Appends an audit event to the student's attempt timeline safely.
 */
liveExamAttemptSchema.methods.logTimelineEvent = function (event, metadata = {}) {
  this.timeline.push({
    event,
    timestamp: new Date(),
    metadata,
  });
};

module.exports = mongoose.model("LiveExamAttempt", liveExamAttemptSchema);
