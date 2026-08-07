const Section = require("../models/Section");
const quizService = require("../services/quizService");
const logAction = require("../utils/logger");

// Create a section
const createSection = async (req, res) => {
  try {
    const section = await quizService.createSection({
      ...req.body,
      createdBy: req.user?._id,
    });

    await logAction("CREATE_SECTION", req.user?.fullName || "Admin", `Section: ${section.title}`, "Section", req.ip);
    res.status(201).json(section);
  } catch (error) {
    console.error("Create Section Error:", error);
    res.status(500).json({ message: "Failed to create section.", error: error.message });
  }
};

// Get all reusable sections (standalone)
const getSections = async (req, res) => {
  try {
    const { standalone } = req.query;
    const filter = {};
    if (standalone === "true") {
      filter.isStandalone = true;
    }

    if (req.query.deleted === "true") {
      filter.isDeleted = true;
    } else {
      filter.isDeleted = { $ne: true }; // default to active sections only
    }

    const sections = await Section.find(filter)
      .populate("questions")
      .sort({ createdAt: -1 });

    const isStudent = req.user && req.user.role === "user";
    if (isStudent) {
      const sanitizeSectionQuestions = (section) => {
        if (!section) return section;
        const sec = section.toObject();
        const sanitizeQ = (q) => {
          if (!q) return;
          delete q.correctAnswer;
          delete q.explanation;
          if (q.explanations) {
            delete q.explanations.correct;
            delete q.explanations.incorrect;
            delete q.explanations.conceptSummary;
            delete q.explanations.didYouKnow;
          }
        };
        if (sec.questions && sec.questions.length > 0) {
          sec.questions.forEach(sanitizeQ);
        }
        if (sec.subsections) {
          ["easy", "medium", "hard"].forEach(level => {
            if (sec.subsections[level] && sec.subsections[level].length > 0) {
              sec.subsections[level].forEach(sanitizeQ);
            }
          });
        }
        return sec;
      };
      const sanitized = sections.map(sanitizeSectionQuestions);
      return res.json(sanitized);
    }

    res.json(sections);
  } catch (error) {
    console.error("Get Sections Error:", error);
    res.status(500).json({ message: "Failed to fetch sections.", error: error.message });
  }
};

// Get single section by ID (populated)
const getSectionById = async (req, res) => {
  try {
    const section = await quizService.populateSectionQuestions(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }
    const isStudent = req.user && req.user.role === "user";
    if (isStudent) {
      const secObj = section.toObject();
      const sanitizeQ = (q) => {
        if (!q) return;
        delete q.correctAnswer;
        delete q.explanation;
        if (q.explanations) {
          delete q.explanations.correct;
          delete q.explanations.incorrect;
          delete q.explanations.conceptSummary;
          delete q.explanations.didYouKnow;
        }
      };
      if (secObj.questions && secObj.questions.length > 0) {
        secObj.questions.forEach(sanitizeQ);
      }
      if (secObj.subsections) {
        ["easy", "medium", "hard"].forEach(level => {
          if (secObj.subsections[level] && secObj.subsections[level].length > 0) {
            secObj.subsections[level].forEach(sanitizeQ);
          }
        });
      }
      return res.json(secObj);
    }
    res.json(section);
  } catch (error) {
    console.error("Get Section Error:", error);
    res.status(500).json({ message: "Failed to fetch section.", error: error.message });
  }
};

// Update a section
const updateSection = async (req, res) => {
  try {
    const existing = await Section.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Section not found." });
    }

    const currentQuestions = existing.questions || [];
    const incomingQuestions = req.body.questions || [];
    const isQuestionsChanged = JSON.stringify(currentQuestions.map(id => String(id))) !== JSON.stringify(incomingQuestions.map(id => String(id)));

    const currentSubsections = existing.subsections || { easy: [], medium: [], hard: [] };
    const incomingSubsections = req.body.subsections || {};
    const isSubsectionsChanged = 
      JSON.stringify((currentSubsections.easy || []).map(id => String(id))) !== JSON.stringify((incomingSubsections.easy || []).map(id => String(id))) ||
      JSON.stringify((currentSubsections.medium || []).map(id => String(id))) !== JSON.stringify((incomingSubsections.medium || []).map(id => String(id))) ||
      JSON.stringify((currentSubsections.hard || []).map(id => String(id))) !== JSON.stringify((incomingSubsections.hard || []).map(id => String(id)));

    const hasChanged = isQuestionsChanged || isSubsectionsChanged ||
      (req.body.title !== undefined && existing.title !== req.body.title) ||
      (req.body.description !== undefined && existing.description !== req.body.description) ||
      (req.body.type !== undefined && existing.type !== req.body.type) ||
      (req.body.duration !== undefined && existing.duration !== Number(req.body.duration)) ||
      (req.body.marksPerQuestion !== undefined && existing.marksPerQuestion !== Number(req.body.marksPerQuestion)) ||
      (req.body.negativeMarking !== undefined && existing.negativeMarking !== Number(req.body.negativeMarking)) ||
      (req.body.questionLimit !== undefined && existing.questionLimit !== Number(req.body.questionLimit)) ||
      (req.body.randomizeOptions !== undefined && existing.randomizeOptions !== Boolean(req.body.randomizeOptions)) ||
      (req.body.isStandalone !== undefined && existing.isStandalone !== Boolean(req.body.isStandalone));

    const section = await Section.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (hasChanged) {
      await logAction("UPDATE_SECTION", req.user?.fullName || "Admin", `Section: ${section.title}`, "Section", req.ip);
    }
    res.json(section);
  } catch (error) {
    console.error("Update Section Error:", error);
    res.status(500).json({ message: "Failed to update section.", error: error.message });
  }
};

// Delete a section (soft delete)
const deleteSection = async (req, res) => {
  try {
    const sectionId = req.params.id;
    // Safety check: verify no active modular quizzes reference this section
    const referencingQuizzes = await quizService.getQuizzesReferencingSection(sectionId);
    if (referencingQuizzes.length > 0) {
      return res.status(400).json({
        message: `Section cannot be deleted because it is linked in ${referencingQuizzes.length} quiz(zes).`,
        quizzes: referencingQuizzes.map(q => q.title),
      });
    }

    const section = await Section.findByIdAndUpdate(
      sectionId, 
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }

    await logAction("DELETE_SECTION", req.user?.fullName || "Admin", `Section: ${section.title}`, "Section", req.ip);
    res.json({ message: "Section moved to recycle bin." });
  } catch (error) {
    console.error("Delete Section Error:", error);
    res.status(500).json({ message: "Failed to delete section.", error: error.message });
  }
};

// Restore a soft-deleted section
const restoreSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(
      req.params.id, 
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }
    await logAction("RESTORE_SECTION", req.user?.fullName || "Admin", `Section: ${section.title}`, "Section", req.ip);
    res.json({ message: "Section restored successfully.", section });
  } catch (error) {
    console.error("Restore Section Error:", error);
    res.status(500).json({ message: "Failed to restore section." });
  }
};

// Permanently delete a section
const permanentlyDeleteSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }
    await logAction("PERMANENTLY_DELETE_SECTION", req.user?.fullName || "Admin", `Section: ${section.title}`, "Section", req.ip);
    res.json({ message: "Section permanently deleted." });
  } catch (error) {
    console.error("Permanent Delete Section Error:", error);
    res.status(500).json({ message: "Failed to permanently delete section." });
  }
};

// Clone a section (deep copy)
const cloneSection = async (req, res) => {
  try {
    const cloned = await quizService.cloneSection(req.params.id, req.user?._id);
    await logAction("CLONE_SECTION", req.user?.fullName || "Admin", `Cloned Section from ID: ${req.params.id} -> ${cloned.title}`, "Section", req.ip);
    res.status(201).json(cloned);
  } catch (error) {
    console.error("Clone Section Error:", error);
    res.status(500).json({ message: "Failed to clone section.", error: error.message });
  }
};

// Add questions to a section
const addQuestionsToSection = async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ message: "questionIds must be an array." });
    }

    const section = await Section.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }

    // Add without duplicates
    questionIds.forEach((id) => {
      if (!section.questions.includes(id)) {
        section.questions.push(id);
      }
    });

    await section.save();
    await logAction("ADD_QUESTIONS_TO_SECTION", req.user?.fullName || "Admin", `Added ${questionIds.length} questions to Section: ${section.title}`, "Section", req.ip);
    res.json(section);
  } catch (error) {
    console.error("Add Questions to Section Error:", error);
    res.status(500).json({ message: "Failed to add questions to section.", error: error.message });
  }
};

// Remove questions from a section
const removeQuestionsFromSection = async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ message: "questionIds must be an array." });
    }

    const section = await Section.findById(req.params.id);
    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }

    section.questions = section.questions.filter((id) => !questionIds.includes(id.toString()));
    await section.save();
    await logAction("REMOVE_QUESTIONS_FROM_SECTION", req.user?.fullName || "Admin", `Removed ${questionIds.length} questions from Section: ${section.title}`, "Section", req.ip);
    res.json(section);
  } catch (error) {
    console.error("Remove Questions from Section Error:", error);
    res.status(500).json({ message: "Failed to remove questions from section.", error: error.message });
  }
};

module.exports = {
  createSection,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  restoreSection,
  permanentlyDeleteSection,
  cloneSection,
  addQuestionsToSection,
  removeQuestionsFromSection,
};
