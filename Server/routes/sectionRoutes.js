const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const {
  createSectionHandler,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  cloneSectionHandler,
  addQuestionsToSection,
  removeQuestionsFromSection,
} = require("../controllers/sectionController");

router.get("/", protect, getSections);
router.get("/:id", protect, getSectionById);
router.post("/", protect, adminOnly, createSectionHandler);
router.put("/:id", protect, adminOnly, updateSection);
router.delete("/:id", protect, adminOnly, deleteSection);
router.post("/:id/clone", protect, adminOnly, cloneSectionHandler);
router.post("/:id/add-questions", protect, adminOnly, addQuestionsToSection);
router.post("/:id/remove-questions", protect, adminOnly, removeQuestionsFromSection);

module.exports = router;
