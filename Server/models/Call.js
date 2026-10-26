const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
      index: true
    },
    callType: {
      type: String,
      enum: ["TASK_REMINDER", "INTERACTIVE_AI"],
      default: "TASK_REMINDER"
    },
    status: {
      type: String,
      enum: ["INITIATED", "RINGING", "ONGOING", "COMPLETED", "MISSED", "REJECTED", "FAILED"],
      default: "INITIATED",
      index: true
    },
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0
    },
    terminationReason: {
      type: String,
      enum: ["USER_HANGUP", "REMOTE_HANGUP", "TIMEOUT", "ERROR", "REJECTED", null],
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook: auto-derive durationSeconds safely if startTime and endTime exist
callSchema.pre("save", function () {
  if (this.startTime && this.endTime && this.endTime > this.startTime) {
    this.durationSeconds = Math.max(0, Math.round((this.endTime.getTime() - this.startTime.getTime()) / 1000));
  }
});

callSchema.index({ user: 1, createdAt: -1 });
callSchema.index({ scheduleId: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Call", callSchema);
