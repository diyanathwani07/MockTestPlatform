const mongoose = require("mongoose");

const aiPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: "" },
  originalPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  durationValue: { type: Number, required: true },
  durationUnit: { type: String, enum: ["days", "months"], default: "days" },
  aiCredits: { type: Number, required: true },
  maxAITests: { type: Number, default: 0 },
  features: [{ type: String }],
  allowedExamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "ExamSeries" }],
  isFeatured: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "inactive", "draft"], default: "draft" },
  displayOrder: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model("AiPlan", aiPlanSchema);
