const express = require("express");
const router = express.Router();

const { protect, optionalProtect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

const {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  getDashboardStats,
  exportSectionAsQuiz,
  addSectionToQuiz,
  removeSectionFromQuiz,
  reorderSections,
  extractSectionHandler,
  duplicateQuizHandler,
  convertSingleToMulti,
  restoreQuiz,
  permanentlyDeleteQuiz,
  generateCustomQuiz,
  deleteCustomQuiz,
  submitQuiz,
  bulkImportQuizzes,
} = require("../controllers/quizController");

// Dashboard stats — admin only
router.get("/stats/dashboard", protect, adminOnly, getDashboardStats);

// Conversion utility — must be before /:id routes
router.post("/convert-single-to-multi", protect, adminOnly, convertSingleToMulti);

// Custom Quiz Generation & Deletion — user routes
router.post("/custom", protect, generateCustomQuiz);
router.delete("/custom/:id", protect, deleteCustomQuiz);

// Public/general quiz listing
router.get("/", optionalProtect, getQuizzes);
router.get("/:id", protect, getQuizById);
router.post("/:id/submit", protect, submitQuiz);
router.post("/attempts/:attemptId/submit", protect, submitQuiz);

// Admin-only write operations
router.post("/bulk-import", protect, adminOnly, bulkImportQuizzes);
router.post("/", protect, adminOnly, createQuiz);
router.post("/export-section", protect, adminOnly, exportSectionAsQuiz);
router.post("/:id/add-section", protect, adminOnly, addSectionToQuiz);
router.post("/:id/remove-section", protect, adminOnly, removeSectionFromQuiz);
router.post("/:id/reorder-sections", protect, adminOnly, reorderSections);
router.post("/:id/extract-section", protect, adminOnly, extractSectionHandler);
router.post("/:id/duplicate", protect, adminOnly, duplicateQuizHandler);
router.put("/:id", protect, adminOnly, updateQuiz);
router.delete("/:id", protect, adminOnly, deleteQuiz);
router.put("/:id/restore", protect, adminOnly, restoreQuiz);
router.delete("/:id/permanent", protect, adminOnly, permanentlyDeleteQuiz);

module.exports = router;
