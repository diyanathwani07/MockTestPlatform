const FlashcardSet = require("../models/FlashcardSet");
const Flashcard = require("../models/Flashcard");
const FlashcardProgress = require("../models/FlashcardProgress");
const AuditLog = require("../models/AuditLog");

// Admin: Create Flashcard Set
const createFlashcardSet = async (req, res) => {
  try {
    const set = new FlashcardSet({
      ...req.body,
      createdBy: req.user._id,
    });
    await set.save();

    await AuditLog.create({
      action: "Created Flashcard Set",
      performedBy: req.user?.email || req.user?.name || "Admin",
      details: `Created Flashcard Set: ${set.title}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      module: "Flashcards",
    });

    res.status(201).json(set);
  } catch (error) {
    res.status(500).json({ message: "Error creating flashcard set", error: error.message });
  }
};

// Admin: Update Flashcard Set
const updateFlashcardSet = async (req, res) => {
  try {
    const oldSet = await FlashcardSet.findById(req.params.id);
    if (!oldSet) return res.status(404).json({ message: "Set not found" });

    const set = await FlashcardSet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    let action = "Updated Flashcard Set";
    let details = `Updated Flashcard Set: ${set.title}`;
    
    const changes = [];
    if (req.body.status && req.body.status !== oldSet.status) {
      changes.push(`status to ${req.body.status}`);
      action = `Changed Status (${req.body.status})`;
    }
    if (req.body.isPaid !== undefined && req.body.isPaid !== oldSet.isPaid) {
      const pricing = req.body.isPaid ? "Paid" : "Free";
      changes.push(`pricing to ${pricing}`);
      if (changes.length === 1) action = `Changed Pricing (${pricing})`;
    }

    if (changes.length > 0) {
      details = `Updated Flashcard Set "${set.title}" - Changed ${changes.join(", ")}`;
    }

    await AuditLog.create({
      action,
      performedBy: req.user?.email || req.user?.name || "Admin",
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      module: "Flashcards",
    });

    res.json(set);
  } catch (error) {
    res.status(500).json({ message: "Error updating set", error: error.message });
  }
};

// Admin: Delete Flashcard Set
const deleteFlashcardSet = async (req, res) => {
  try {
    const set = await FlashcardSet.findByIdAndDelete(req.params.id);
    if (!set) return res.status(404).json({ message: "Set not found" });
    
    // Also delete all cards in set
    await Flashcard.deleteMany({ flashcardSetId: set._id });
    await FlashcardProgress.deleteMany({ flashcardSetId: set._id });

    await AuditLog.create({
      action: "Deleted Flashcard Set",
      performedBy: req.user?.email || req.user?.name || "Admin",
      details: `Deleted Flashcard Set: ${set.title}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      module: "Flashcards",
    });

    res.json({ message: "Flashcard set deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting set", error: error.message });
  }
};

// Admin: Get all Flashcard Sets (for admin table)
const getAllFlashcardSetsAdmin = async (req, res) => {
  try {
    const sets = await FlashcardSet.find()
      .populate("examSeriesId", "title")
      .populate("examStructureId", "name")
      .sort({ createdAt: -1 });
    res.json(sets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sets", error: error.message });
  }
};

// Student/Admin: Get Flashcard Sets by filters (Public)
const getFlashcardSets = async (req, res) => {
  try {
    const { examSeriesId, examStructureId, subjectName, chapter, topic } = req.query;
    const filter = { status: "Published" };
    if (examSeriesId) filter.examSeriesId = examSeriesId;
    if (examStructureId) filter.examStructureId = examStructureId;
    if (subjectName) filter.subjectName = subjectName;
    if (chapter) filter.chapter = chapter;
    if (topic) filter.topic = topic;

    const sets = await FlashcardSet.find(filter)
      .populate("examSeriesId", "title")
      .populate("examStructureId", "name")
      .sort({ createdAt: -1 });
    res.json(sets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sets", error: error.message });
  }
};

// Get Single Set Details
const getFlashcardSetDetails = async (req, res) => {
  try {
    const set = await FlashcardSet.findById(req.params.id)
      .populate("examSeriesId", "title")
      .populate("examStructureId", "name");
    if (!set) return res.status(404).json({ message: "Set not found" });
    res.json(set);
  } catch (error) {
    res.status(500).json({ message: "Error fetching set", error: error.message });
  }
};

// Cards Management
const getCardsInSet = async (req, res) => {
  try {
    const cards = await Flashcard.find({ flashcardSetId: req.params.setId }).sort({ order: 1, createdAt: 1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cards", error: error.message });
  }
};

const createCard = async (req, res) => {
  try {
    const card = new Flashcard({ ...req.body, flashcardSetId: req.params.setId });
    await card.save();
    
    // Update total cards count
    await FlashcardSet.findByIdAndUpdate(req.params.setId, { $inc: { totalCards: 1 } });
    
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ message: "Error adding card", error: error.message });
  }
};

const updateCard = async (req, res) => {
  try {
    const card = await Flashcard.findByIdAndUpdate(req.params.cardId, req.body, { new: true });
    if (!card) return res.status(404).json({ message: "Card not found" });
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: "Error updating card", error: error.message });
  }
};

const deleteCard = async (req, res) => {
  try {
    const card = await Flashcard.findByIdAndDelete(req.params.cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });
    
    await FlashcardSet.findByIdAndUpdate(card.flashcardSetId, { $inc: { totalCards: -1 } });
    await FlashcardProgress.deleteMany({ flashcardId: card._id });
    
    res.json({ message: "Card deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting card", error: error.message });
  }
};

// Progress Tracking
const updateProgress = async (req, res) => {
  try {
    const { setId, cardId } = req.params;
    const { status } = req.body; // "Learning" or "Known"
    const studentId = req.user.id;

    let progress = await FlashcardProgress.findOne({ studentId, flashcardId: cardId });
    if (progress) {
      progress.status = status;
      progress.reviewCount += 1;
      progress.lastReviewedAt = Date.now();
      await progress.save();
    } else {
      progress = new FlashcardProgress({
        studentId,
        flashcardSetId: setId,
        flashcardId: cardId,
        status,
        reviewCount: 1,
      });
      await progress.save();
    }

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: "Error updating progress", error: error.message });
  }
};

const getProgressForSet = async (req, res) => {
  try {
    const studentId = req.user.id;
    const progressList = await FlashcardProgress.find({ studentId, flashcardSetId: req.params.setId });
    res.json(progressList);
  } catch (error) {
    res.status(500).json({ message: "Error fetching progress", error: error.message });
  }
};

module.exports = {
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
  getAllFlashcardSetsAdmin,
  getFlashcardSets,
  getFlashcardSetDetails,
  getCardsInSet,
  createCard,
  updateCard,
  deleteCard,
  updateProgress,
  getProgressForSet
};
