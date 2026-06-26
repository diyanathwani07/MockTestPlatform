const express = require("express");
const router = express.Router();
const Preset = require("../models/Preset");

// @route   GET /api/presets
// @desc    Get all presets
// @access  Public (or Admin protected, keeping it open for now as CreateQuiz is admin only)
router.get("/", async (req, res) => {
  try {
    const presets = await Preset.find().sort({ createdAt: -1 });
    res.json(presets);
  } catch (error) {
    console.error("Error fetching presets:", error);
    res.status(500).json({ message: "Server error while fetching presets" });
  }
});

// @route   POST /api/presets
// @desc    Create a new preset
router.post("/", async (req, res) => {
  try {
    const { presetName, examName, duration, marksPerQuestion, negativeMarking } = req.body;

    if (!presetName || !examName || !duration) {
      return res.status(400).json({ message: "Preset name, exam name, and duration are required." });
    }

    const newPreset = new Preset({
      presetName,
      examName,
      duration,
      marksPerQuestion: marksPerQuestion || 1,
      negativeMarking: negativeMarking || 0,
    });

    const savedPreset = await newPreset.save();
    res.status(201).json(savedPreset);
  } catch (error) {
    console.error("Error saving preset:", error);
    res.status(500).json({ message: "Server error while saving preset" });
  }
});

// @route   DELETE /api/presets/:id
// @desc    Delete a preset
router.delete("/:id", async (req, res) => {
  try {
    const preset = await Preset.findById(req.params.id);
    if (!preset) {
      return res.status(404).json({ message: "Preset not found" });
    }
    await preset.deleteOne();
    res.json({ message: "Preset removed" });
  } catch (error) {
    console.error("Error deleting preset:", error);
    res.status(500).json({ message: "Server error while deleting preset" });
  }
});

module.exports = router;
