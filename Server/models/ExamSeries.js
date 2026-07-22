const mongoose = require("mongoose");

const examSeriesSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    icon: { type: String, default: "" },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamSeries", examSeriesSchema);
