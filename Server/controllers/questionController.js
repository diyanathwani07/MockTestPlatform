const Question = require("../models/Question");
const QuestionBank = require("../models/QuestionBank");
const logAction = require("../utils/logger");

// Create a single question
const createQuestion = async (req, res) => {
  try {
    const {
      questionEnglish,
      questionHindi,
      options,
      correctAnswer,
      explanation,
      explanations,
      difficulty,
      tags,
      subject,
      aiGenerated,
      questionBankId,
    } = req.body;

    if (!questionEnglish || !options || !correctAnswer) {
      return res.status(400).json({ message: "questionEnglish, options, and correctAnswer are required." });
    }

    const question = await Question.create({
      questionEnglish,
      questionHindi,
      options,
      correctAnswer,
      explanation,
      explanations,
      difficulty,
      tags,
      subject,
      aiGenerated,
      questionBankId: questionBankId || null,
      createdBy: req.user?._id,
    });

    await logAction("CREATE_QUESTION", req.user?.fullName || "Admin", `Question: ${questionEnglish.substring(0, 30)}...`, "Question", req.ip);
    res.status(201).json(question);
  } catch (error) {
    console.error("Create Question Error:", error);
    res.status(500).json({ message: "Failed to create question.", error: error.message });
  }
};

// Bulk create/import questions
const bulkCreateQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "An array of questions is required." });
    }

    const preparedQuestions = questions.map((q) => ({
      questionEnglish: q.questionEnglish,
      questionHindi: q.questionHindi || "",
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      explanations: q.explanations || { correct: "", incorrect: {}, conceptSummary: "", didYouKnow: "" },
      difficulty: q.difficulty || "medium",
      tags: q.tags || [],
      subject: q.subject || "",
      aiGenerated: q.aiGenerated || false,
      questionBankId: q.questionBankId || null,
      createdBy: req.user?._id,
    }));

    const created = await Question.insertMany(preparedQuestions);
    await logAction("BULK_CREATE_QUESTIONS", req.user?.fullName || "Admin", `Imported ${created.length} questions`, "Question", req.ip);
    res.status(201).json(created);
  } catch (error) {
    console.error("Bulk Create Questions Error:", error);
    res.status(500).json({ message: "Failed to bulk create questions.", error: error.message });
  }
};

// Get all questions with filters
const getQuestions = async (req, res) => {
  try {
    const { subject, tags, difficulty, bankId, search } = req.query;
    const filter = {};

    if (subject) filter.subject = subject;
    if (difficulty) filter.difficulty = difficulty;
    if (bankId) filter.questionBankId = bankId;
    if (tags) {
      const tagList = tags.split(",").map(t => t.trim());
      filter.tags = { $in: tagList };
    }
    if (search) {
      filter.$or = [
        { questionEnglish: { $regex: search, $options: "i" } },
        { questionHindi: { $regex: search, $options: "i" } }
      ];
    }

    if (req.query.deleted === "true") {
      filter.isDeleted = true;
    } else {
      filter.isDeleted = { $ne: true };
    }

    const questions = await Question.find(filter).sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    console.error("Get Questions Error:", error);
    res.status(500).json({ message: "Failed to fetch questions.", error: error.message });
  }
};

// Get single question by ID
const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }
    res.json(question);
  } catch (error) {
    console.error("Get Question Error:", error);
    res.status(500).json({ message: "Failed to fetch question.", error: error.message });
  }
};

// Update a question
const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    await logAction("UPDATE_QUESTION", req.user?.fullName || "Admin", `Question: ${question.questionEnglish.substring(0, 30)}...`, "Question", req.ip);
    res.json(question);
  } catch (error) {
    console.error("Update Question Error:", error);
    res.status(500).json({ message: "Failed to update question.", error: error.message });
  }
};

// Delete a question (soft delete)
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }

    await logAction("DELETE_QUESTION", req.user?.fullName || "Admin", `Question: ${question.questionEnglish.substring(0, 30)}...`, "Question", req.ip);
    res.json({ message: "Question moved to recycle bin." });
  } catch (error) {
    console.error("Delete Question Error:", error);
    res.status(500).json({ message: "Failed to delete question.", error: error.message });
  }
};

// Restore a question
const restoreQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }
    await logAction("RESTORE_QUESTION", req.user?.fullName || "Admin", `Question: ${question.questionEnglish.substring(0, 30)}...`, "Question", req.ip);
    res.json({ message: "Question restored successfully.", question });
  } catch (error) {
    console.error("Restore Question Error:", error);
    res.status(500).json({ message: "Failed to restore question." });
  }
};

// Permanently delete a question
const permanentlyDeleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: "Question not found." });
    }
    await logAction("PERMANENTLY_DELETE_QUESTION", req.user?.fullName || "Admin", `Question: ${question.questionEnglish.substring(0, 30)}...`, "Question", req.ip);
    res.json({ message: "Question permanently deleted." });
  } catch (error) {
    console.error("Permanent Delete Question Error:", error);
    res.status(500).json({ message: "Failed to permanently delete question." });
  }
};

module.exports = {
  createQuestion,
  bulkCreateQuestions,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  restoreQuestion,
  permanentlyDeleteQuestion,
};
