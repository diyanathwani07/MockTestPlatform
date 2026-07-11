const Section = require("../models/Section");
const logAction = require("../utils/logger");
const {
  createSection,
  cloneSection,
  getQuizzesReferencingSection,
  countSectionQuestions,
} = require("../services/quizService");

const createSectionHandler = async (req, res) => {
  try {
    const section = await createSection({
      ...req.body,
      createdBy: req.user?._id,
    });
    await logAction("CREATE_SECTION", req.user?.fullName || "Admin", section.title, "Section", req.ip);
    res.status(201).json(section);
  } catch (error) {
    console.error("Create Section Error:", error);
    res.status(500).json({ message: error.message || "Failed to create section." });
  }
};

const getSections = async (req, res) => {
  try {
    const filter = {};
    if (req.query.standalone === "true") filter.isStandalone = true;
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }

    const sections = await Section.find(filter)
      .populate("questions", "questionEnglish difficulty")
      .sort({ updatedAt: -1 });

    const withCounts = sections.map((s) => ({
      ...s.toObject(),
      questionCount: countSectionQuestions(s),
    }));

    res.json(withCounts);
  } catch (error) {
    console.error("Get Sections Error:", error);
    res.status(500).json({ message: "Failed to fetch sections." });
  }
};

const getSectionById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate("questions")
      .populate("subsections.easy")
      .populate("subsections.medium")
      .populate("subsections.hard");

    if (!section) return res.status(404).json({ message: "Section not found." });
    res.json(section);
  } catch (error) {
    console.error("Get Section Error:", error);
    res.status(500).json({ message: "Failed to fetch section." });
  }
};

const updateSection = async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!section) return res.status(404).json({ message: "Section not found." });
    await logAction("UPDATE_SECTION", req.user?.fullName || "Admin", section.title, "Section", req.ip);
    res.json(section);
  } catch (error) {
    console.error("Update Section Error:", error);
    res.status(500).json({ message: "Failed to update section." });
  }
};

const deleteSection = async (req, res) => {
  try {
    const linkedQuizzes = await getQuizzesReferencingSection(req.params.id);
    if (linkedQuizzes.length > 0) {
      return res.status(409).json({
        message: "Cannot delete section: it is linked to one or more quizzes.",
        linkedQuizCount: linkedQuizzes.length,
        linkedQuizzes: linkedQuizzes.map((q) => ({ _id: q._id, title: q.title })),
      });
    }

    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) return res.status(404).json({ message: "Section not found." });
    await logAction("DELETE_SECTION", req.user?.fullName || "Admin", section.title, "Section", req.ip);
    res.json({ message: "Section deleted successfully." });
  } catch (error) {
    console.error("Delete Section Error:", error);
    res.status(500).json({ message: "Failed to delete section." });
  }
};

const cloneSectionHandler = async (req, res) => {
  try {
    const cloned = await cloneSection(req.params.id, req.user?._id);
    await logAction("CLONE_SECTION", req.user?.fullName || "Admin", cloned.title, "Section", req.ip);
    res.status(201).json(cloned);
  } catch (error) {
    console.error("Clone Section Error:", error);
    res.status(500).json({ message: error.message || "Failed to clone section." });
  }
};

const addQuestionsToSection = async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: "questionIds array is required." });
    }

    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: "Section not found." });

    const existing = new Set(section.questions.map((id) => id.toString()));
    for (const qid of questionIds) {
      if (!existing.has(qid.toString())) {
        section.questions.push(qid);
      }
    }
    await section.save();

    const populated = await Section.findById(section._id).populate("questions");
    res.json(populated);
  } catch (error) {
    console.error("Add Questions Error:", error);
    res.status(500).json({ message: "Failed to add questions to section." });
  }
};

const removeQuestionsFromSection = async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ message: "questionIds array is required." });
    }

    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ message: "Section not found." });

    const removeSet = new Set(questionIds.map((id) => id.toString()));
    section.questions = section.questions.filter((id) => !removeSet.has(id.toString()));
    await section.save();

    const populated = await Section.findById(section._id).populate("questions");
    res.json(populated);
  } catch (error) {
    console.error("Remove Questions Error:", error);
    res.status(500).json({ message: "Failed to remove questions from section." });
  }
};

module.exports = {
  createSectionHandler,
  getSections,
  getSectionById,
  updateSection,
  deleteSection,
  cloneSectionHandler,
  addQuestionsToSection,
  removeQuestionsFromSection,
};
