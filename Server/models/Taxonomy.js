const mongoose = require("mongoose");

const taxonomySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["year", "shift", "testType", "testFormat"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Prevent duplicate entries for the same type (e.g. two "PYQ" testTypes)
taxonomySchema.index({ type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Taxonomy", taxonomySchema);
