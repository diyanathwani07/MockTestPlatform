const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const examStructureSchema = new mongoose.Schema(
  {
    examSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSeries",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    subjects: { type: [subjectSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamStructure", examStructureSchema);
