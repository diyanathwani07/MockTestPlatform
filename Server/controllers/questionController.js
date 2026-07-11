const Question = require("../models/Question");
const logAction = require("../utils/logger");

const createQuestion = async (req, res) => {
  try {
    const question = await Question.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    await logAction("CREATE_QUESTION", req.user?.fullName || "Admin", question._id.toString(), "Question", req.ip);
    res.status(201).json(question);
  } catch (error) {
    console.error("Create Question Error:", error);
    res.status(500).json({ message: "Failed to create question.", error: error.message });
  }
};

const bulkCreateQuestions = async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "questions array is required." });
    }

    const docs = questions.map((q) => ({ ...q, createdBy: req.user?._id }));
    const created = await Question.insertMany(docs);
    res.status(201).json({ count: created.length, questions: created });
  } catch (error) {
    console.error("Bulk Create Questions Error:", error);
    res.status(500).json({ message: "Failed to bulk create questions.", error: error.message });
  }
};

const getQuestions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.bankId) filter.questionBankId = req.query.bankId;
    if (req.query.tags) {
      const tags = req.query.tags.split(",").map((t) => t.trim());
      filter.tags = { $in: tags };
    }
    if (req.query.search) {
      filter.$or = [
        { questionEnglish: { $regex: req.query.search, $options: "i" } },
        { questionHindi: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const questions = await Question.find(filter).sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    console.error("Get Questions Error:", error);
    res.status(500).json({ message: "Failed to fetch questions." });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: "Question not found." });
    res.json(question);
  } catch (error) {
    console.error("Get Question Error:", error);
    res.status(500).json({ message: "Failed to fetch question." });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!question) return res.status(404).json({ message: "Question not found." });
    await logAction("UPDATE_QUESTION", req.user?.fullName || "Admin", question._id.toString(), "Question", req.ip);
    res.json(question);
  } catch (error) {
    console.error("Update Question Error:", error);
    res.status(500).json({ message: "Failed to update question." });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: "Question not found." });
    await logAction("DELETE_QUESTION", req.user?.fullName || "Admin", question._id.toString(), "Question", req.ip);
    res.json({ message: "Question deleted successfully." });
  } catch (error) {
    console.error("Delete Question Error:", error);
    res.status(500).json({ message: "Failed to delete question." });
  }
};

module.exports = {
  createQuestion,
  bulkCreateQuestions,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};
