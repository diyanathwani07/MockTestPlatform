const express = require("express");
const router = express.Router();
const { protect, optionalProtect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

const {
  getExamStructures,
  createExamStructure,
  updateExamStructure,
  deleteExamStructure,
} = require("../controllers/examStructureController");

// GET is accessible by authenticated/optional users for student-facing panels
router.get("/", optionalProtect, getExamStructures);

// Admin-only management endpoints
router.post("/", protect, adminOnly, createExamStructure);
router.put("/:id", protect, adminOnly, updateExamStructure);
router.delete("/:id", protect, adminOnly, deleteExamStructure);

module.exports = router;
