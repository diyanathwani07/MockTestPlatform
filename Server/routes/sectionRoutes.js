const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  cloneSection,
  addQuestionsToSection,
  removeQuestionsFromSection,
} = require("../controllers/sectionController");

// Public/General read routes
router.get("/", protect, getSections);
router.get("/:id", protect, getSectionById);

// Admin-only write routes
router.post("/", protect, adminOnly, createSection);
router.put("/:id", protect, adminOnly, updateSection);
router.delete("/:id", protect, adminOnly, deleteSection);

// Reusability & Modification Endpoints
router.post("/:id/clone", protect, adminOnly, cloneSection);
router.post("/:id/add-questions", protect, adminOnly, addQuestionsToSection);
router.post("/:id/remove-questions", protect, adminOnly, removeQuestionsFromSection);

module.exports = router;
