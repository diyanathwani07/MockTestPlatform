const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const flashcardController = require("../controllers/flashcardController");

// Public/Student routes (but protected by auth)
router.get("/sets", protect, flashcardController.getFlashcardSets);
router.get("/sets/:id", protect, flashcardController.getFlashcardSetDetails);
router.get("/sets/:setId/cards", protect, flashcardController.getCardsInSet);

router.get("/progress/:setId", protect, flashcardController.getProgressForSet);
router.post("/progress/:setId/:cardId", protect, flashcardController.updateProgress);

// Admin Routes
router.get("/admin/sets", protect, adminOnly, flashcardController.getAllFlashcardSetsAdmin);
router.post("/admin/sets", protect, adminOnly, flashcardController.createFlashcardSet);
router.put("/admin/sets/:id", protect, adminOnly, flashcardController.updateFlashcardSet);
router.delete("/admin/sets/:id", protect, adminOnly, flashcardController.deleteFlashcardSet);

router.post("/admin/sets/:setId/cards", protect, adminOnly, flashcardController.createCard);
router.put("/admin/cards/:cardId", protect, adminOnly, flashcardController.updateCard);
router.delete("/admin/cards/:cardId", protect, adminOnly, flashcardController.deleteCard);

module.exports = router;
