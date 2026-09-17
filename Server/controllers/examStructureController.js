const ExamStructure = require("../models/ExamStructure");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");

// GET /api/exam-structures?examSeriesId=<id>
const getExamStructures = async (req, res) => {
  try {
    const filter = {};
    if (req.query.examSeriesId) {
      filter.examSeriesId = req.query.examSeriesId;
    }
    // Non-admin requests only see active structures
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
      filter.isActive = true;
    }

    const structures = await ExamStructure.find(filter).sort({ order: 1, createdAt: 1 });
    
    // For non-admin, also filter embedded subjects to isActive === true
    const result = structures.map(struct => {
      const obj = struct.toObject();
      if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
        obj.subjects = (obj.subjects || []).filter(s => s.isActive !== false);
      }
      return obj;
    });

    res.json(result);
  } catch (error) {
    console.error("Get Exam Structures Error:", error);
    res.status(500).json({ message: "Failed to fetch exam structures.", error: error.message });
  }
};

// POST /api/exam-structures
const createExamStructure = async (req, res) => {
  try {
    const { examSeriesId, name, order, subjects } = req.body;
    if (!examSeriesId || !name || !name.trim()) {
      return res.status(400).json({ message: "examSeriesId and name are required." });
    }

    const structure = await ExamStructure.create({
      examSeriesId,
      name: name.trim(),
      order: order || 0,
      subjects: subjects || [],
    });

    res.status(201).json(structure);
  } catch (error) {
    console.error("Create Exam Structure Error:", error);
    res.status(500).json({ message: "Failed to create exam structure.", error: error.message });
  }
};

// PUT /api/exam-structures/:id
const updateExamStructure = async (req, res) => {
  try {
    const { name, order, isActive, subjects } = req.body;
    const structure = await ExamStructure.findById(req.params.id);
    if (!structure) {
      return res.status(404).json({ message: "Exam Structure not found." });
    }

    if (name !== undefined) structure.name = name.trim();
    if (order !== undefined) structure.order = order;
    if (isActive !== undefined) structure.isActive = isActive;
    if (subjects !== undefined) structure.subjects = subjects;

    await structure.save();
    res.json(structure);
  } catch (error) {
    console.error("Update Exam Structure Error:", error);
    res.status(500).json({ message: "Failed to update exam structure.", error: error.message });
  }
};

// DELETE /api/exam-structures/:id
const deleteExamStructure = async (req, res) => {
  try {
    const structureId = req.params.id;
    // Check if any Quiz or PracticeQuiz references this structure
    const linkedQuiz = await Quiz.findOne({ examStructureId: structureId, isDeleted: { $ne: true } });
    const linkedPractice = await PracticeQuiz.findOne({ examStructureId: structureId, isDeleted: { $ne: true } });

    if (linkedQuiz || linkedPractice) {
      return res.status(400).json({
        message: "Cannot delete this exam structure because quizzes are currently linked to it. Deactivate it instead."
      });
    }

    await ExamStructure.findByIdAndDelete(structureId);
    res.json({ message: "Exam Structure deleted successfully." });
  } catch (error) {
    console.error("Delete Exam Structure Error:", error);
    res.status(500).json({ message: "Failed to delete exam structure.", error: error.message });
  }
};

module.exports = {
  getExamStructures,
  createExamStructure,
  updateExamStructure,
  deleteExamStructure,
};
