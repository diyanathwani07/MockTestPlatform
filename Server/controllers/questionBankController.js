const QuestionBank = require("../models/QuestionBank");
const Question = require("../models/Question");
const logAction = require("../utils/logger");

const createQuestionBank = async (req, res) => {
  try {
    const bank = await QuestionBank.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    await logAction("CREATE_QUESTION_BANK", req.user?.fullName || "Admin", bank.name, "QuestionBank", req.ip);
    res.status(201).json(bank);
  } catch (error) {
    console.error("Create QuestionBank Error:", error);
    res.status(500).json({ message: "Failed to create question bank." });
  }
};

const getQuestionBanks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;

    const banks = await QuestionBank.find(filter).sort({ createdAt: -1 });
    res.json(banks);
  } catch (error) {
    console.error("Get QuestionBanks Error:", error);
    res.status(500).json({ message: "Failed to fetch question banks." });
  }
};

const getQuestionBankById = async (req, res) => {
  try {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ message: "Question bank not found." });

    const questions = await Question.find({ questionBankId: bank._id });
    res.json({ ...bank.toObject(), questions });
  } catch (error) {
    console.error("Get QuestionBank Error:", error);
    res.status(500).json({ message: "Failed to fetch question bank." });
  }
};

const updateQuestionBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!bank) return res.status(404).json({ message: "Question bank not found." });
    res.json(bank);
  } catch (error) {
    console.error("Update QuestionBank Error:", error);
    res.status(500).json({ message: "Failed to update question bank." });
  }
};

const deleteQuestionBank = async (req, res) => {
  try {
    const bank = await QuestionBank.findByIdAndDelete(req.params.id);
    if (!bank) return res.status(404).json({ message: "Question bank not found." });

    await Question.updateMany({ questionBankId: bank._id }, { $set: { questionBankId: null } });
    res.json({ message: "Question bank deleted. Questions remain but are unlinked from the bank." });
  } catch (error) {
    console.error("Delete QuestionBank Error:", error);
    res.status(500).json({ message: "Failed to delete question bank." });
  }
};

module.exports = {
  createQuestionBank,
  getQuestionBanks,
  getQuestionBankById,
  updateQuestionBank,
  deleteQuestionBank,
};
