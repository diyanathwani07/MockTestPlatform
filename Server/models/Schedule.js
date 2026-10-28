const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    taskTitle: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Task title cannot exceed 200 characters"]
    },
    taskDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Task description cannot exceed 1000 characters"]
    },
    reminderAudioText: {
      type: String,
      required: [true, "Reminder audio text is required"],
      trim: true,
      maxlength: [1000, "Reminder audio text cannot exceed 1000 characters"]
    },
    scheduledTime: {
      type: Date,
      required: [true, "Scheduled time is required"],
      index: true
    },
    timeZone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true
    },
    callType: {
      type: String,
      enum: ["TASK_REMINDER", "CUSTOM", "EXAM_REMINDER", "QUIZ_REMINDER"],
      default: "TASK_REMINDER"
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
      index: true
    },
    liveExam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LiveExamination",
      default: null,
      index: true
    },
    examSeries: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSeries",
      default: null,
      index: true
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reminderTimingType: {
      type: String,
      default: "CUSTOM"
    },
    examDateTime: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED", "FAILED"],
      default: "PENDING",
      index: true
    },
    language: {
      type: String,
      enum: ["en", "hi", "auto"],
      default: "auto",
      trim: true
    },
    voice: {
      type: String,
      default: null,
      trim: true
    },
    audioDurationSeconds: {
      type: Number,
      default: 0
    },
    preGeneratedAudioPath: {
      type: String,
      default: null
    },
    preGeneratedAudioStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "READY", "FAILED"],
      default: "PENDING",
      index: true
    },
    // Distributed dispatch & claim tracking fields (Phase 3)
    dispatchClaimId: {
      type: String,
      default: null
    },
    dispatchClaimedAt: {
      type: Date,
      default: null
    },
    dispatchClaimExpiresAt: {
      type: Date,
      default: null,
      index: true
    },
    dispatchAttempts: {
      type: Number,
      default: 0
    },
    dispatchedAt: {
      type: Date,
      default: null
    },
    lastDispatchError: {
      type: String,
      default: null
    },
    metadata: {
      type: Map,
      of: String,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index for hot queries: user schedules and upcoming cron sweeps
scheduleSchema.index({ user: 1, status: 1, scheduledTime: 1 });
scheduleSchema.index({ quiz: 1, user: 1, status: 1 });
scheduleSchema.index({ status: 1, scheduledTime: 1 });
scheduleSchema.index({ status: 1, scheduledTime: 1, preGeneratedAudioStatus: 1 });

module.exports = mongoose.model("Schedule", scheduleSchema);
