const mongoose = require("mongoose");
const crypto = require("crypto");

const liveExaminationSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz blueprint is required for a live examination."],
      index: true,
    },

    title: {
      type: String,
      required: [true, "Live examination title is required."],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters."],
    },

    instructions: {
      type: String,
      default: "",
      trim: true,
    },

    scheduledStartTime: {
      type: Date,
      required: [true, "Scheduled start time is required."],
      index: true,
    },

    scheduledEndTime: {
      type: Date,
      required: [true, "Scheduled end time is required."],
      index: true,
    },

    duration: {
      type: Number,
      required: [true, "Exam duration in minutes is required."],
      min: [1, "Duration must be at least 1 minute."],
    },

    entryWindowMinutes: {
      type: Number,
      default: 15,
      min: [0, "Entry window cannot be negative."],
    },

    allowLateEntry: {
      type: Boolean,
      default: true,
    },

    autoSubmitOnDeadline: {
      type: Boolean,
      default: true,
    },

    webcamRule: {
      type: String,
      enum: ["disabled", "optional", "mandatory"],
      default: "disabled",
    },

    resultReleaseMode: {
      type: String,
      enum: ["manual", "immediate", "scheduled"],
      default: "manual",
    },

    resultReleaseDate: {
      type: Date,
      default: null,
    },

    shareSlug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "lobby", "live", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    endedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Generates a URL-friendly readable slug with an unguessable entropy suffix.
 * Example: 'bpsc-tre-4-0-prt-mock-test-a8f3b9c2'
 */
liveExaminationSchema.statics.generateUniqueSlugAndToken = async function (title) {
  const baseSlug = (title || "live-exam")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "live-exam";

  let slug;
  let token;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    token = crypto.randomBytes(16).toString("hex"); // 32 unguessable hex chars
    const shortHash = crypto.randomBytes(4).toString("hex"); // 8 chars
    slug = `${baseSlug}-${shortHash}`;

    const existing = await this.findOne({
      $or: [{ shareSlug: slug }, { shareToken: token }],
    });

    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    token = crypto.randomBytes(20).toString("hex");
    slug = `live-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  return { shareSlug: slug, shareToken: token };
};

/**
 * Computes the real-time status dynamically based on current server clock.
 */
liveExaminationSchema.methods.getCalculatedStatus = function () {
  if (this.isDeleted) return "cancelled";
  if (this.status === "cancelled" || this.status === "completed") {
    return this.status;
  }

  const now = new Date();
  const startTime = new Date(this.scheduledStartTime);
  const endTime = new Date(this.scheduledEndTime);
  const lobbyStartTime = new Date(startTime.getTime() - (this.entryWindowMinutes || 15) * 60 * 1000);

  if (now >= endTime) {
    return "completed";
  }
  if (now >= startTime && now < endTime) {
    return "live";
  }
  if (now >= lobbyStartTime && now < startTime) {
    return "lobby";
  }
  return "scheduled";
};

module.exports = mongoose.model("LiveExamination", liveExaminationSchema);
