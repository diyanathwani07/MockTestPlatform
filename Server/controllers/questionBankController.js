const QuestionBank = require("../models/QuestionBank");
const Question = require("../models/Question");
const logAction = require("../utils/logger");

// Create a question bank
const createQuestionBank = async (req, res) => {
  try {
    const { name, subject, description, tags } = req.body;
    if (!name || !subject) {
      return res.status(400).json({ message: "Name and subject are required." });
    }

    const questionBank = await QuestionBank.create({
      name,
      subject,
      description,
      tags: tags || [],
      createdBy: req.user?._id,
    });

    await logAction("CREATE_QUESTION_BANK", req.user?.fullName || "Admin", `Question Bank: ${name}`, "QuestionBank", req.ip);
    res.status(201).json(questionBank);
  } catch (error) {
    console.error("Create Question Bank Error:", error);
    res.status(500).json({ message: "Failed to create question bank.", error: error.message });
  }
};

// Get all question banks
const getQuestionBanks = async (req, res) => {
  try {
    const questionBanks = await QuestionBank.find().sort({ createdAt: -1 });
    res.json(questionBanks);
  } catch (error) {
    console.error("Get Question Banks Error:", error);
    res.status(500).json({ message: "Failed to fetch question banks.", error: error.message });
  }
};

// Get single question bank by ID + associated questions
const getQuestionBankById = async (req, res) => {
  try {
    const questionBank = await QuestionBank.findById(req.params.id);
    if (!questionBank) {
      return res.status(404).json({ message: "Question bank not found." });
    }

    // Fetch questions associated with this bank
    const questions = await Question.find({ questionBankId: questionBank._id });

    const isStudent = req.user && req.user.role === "user";
    if (isStudent) {
      const sanitized = questions.map(q => {
        const raw = q.toObject();
        delete raw.correctAnswer;
        delete raw.explanation;
        if (raw.explanations) {
          delete raw.explanations.correct;
          delete raw.explanations.incorrect;
          delete raw.explanations.conceptSummary;
          delete raw.explanations.didYouKnow;
        }
        return raw;
      });
      return res.json({
        questionBank,
        questions: sanitized,
      });
    }

    res.json({
      questionBank,
      questions,
    });
  } catch (error) {
    console.error("Get Question Bank Error:", error);
    res.status(500).json({ message: "Failed to fetch question bank details.", error: error.message });
  }
};

// Update a question bank
const updateQuestionBank = async (req, res) => {
  try {
    const questionBank = await QuestionBank.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!questionBank) {
      return res.status(404).json({ message: "Question bank not found." });
    }

    await logAction("UPDATE_QUESTION_BANK", req.user?.fullName || "Admin", `Question Bank: ${questionBank.name}`, "QuestionBank", req.ip);
    res.json(questionBank);
  } catch (error) {
    console.error("Update Question Bank Error:", error);
    res.status(500).json({ message: "Failed to update question bank.", error: error.message });
  }
};

// Delete a question bank
const deleteQuestionBank = async (req, res) => {
  try {
    const questionBankId = req.params.id;
    const questionBank = await QuestionBank.findByIdAndDelete(questionBankId);
    if (!questionBank) {
      return res.status(404).json({ message: "Question bank not found." });
    }

    // Unset questionBankId ref in all child questions so they are not orphaned/deleted
    await Question.updateMany({ questionBankId }, { $set: { questionBankId: null } });

    await logAction("DELETE_QUESTION_BANK", req.user?.fullName || "Admin", `Question Bank: ${questionBank.name}`, "QuestionBank", req.ip);
    res.json({ message: "Question bank deleted successfully. Associated questions kept." });
  } catch (error) {
    console.error("Delete Question Bank Error:", error);
    res.status(500).json({ message: "Failed to delete question bank.", error: error.message });
  }
};

module.exports = {
  createQuestionBank,
  getQuestionBanks,
  getQuestionBankById,
  updateQuestionBank,
  deleteQuestionBank,
};
