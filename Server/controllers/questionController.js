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

    const resultList = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const q of questions) {
      const fields = {
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
      };

      if (q._id) {
        const existing = await Question.findById(q._id);
        if (existing) {
          const isOptionsChanged = JSON.stringify(existing.options) !== JSON.stringify(fields.options);
          const isExplanationsChanged = JSON.stringify(existing.explanations) !== JSON.stringify(fields.explanations);
          const isTagsChanged = JSON.stringify(existing.tags) !== JSON.stringify(fields.tags);
          const hasChanged = isOptionsChanged || isExplanationsChanged || isTagsChanged ||
            existing.questionEnglish !== fields.questionEnglish ||
            existing.questionHindi !== fields.questionHindi ||
            existing.correctAnswer !== fields.correctAnswer ||
            existing.explanation !== fields.explanation ||
            existing.difficulty !== fields.difficulty ||
            existing.subject !== fields.subject ||
            String(existing.questionBankId) !== String(fields.questionBankId);

          if (hasChanged) {
            const updated = await Question.findByIdAndUpdate(q._id, { $set: fields }, { new: true });
            resultList.push(updated);
            updatedCount++;
          } else {
            resultList.push(existing);
          }
        } else {
          const created = await Question.create(fields);
          resultList.push(created);
          createdCount++;
        }
      } else {
        const created = await Question.create(fields);
        resultList.push(created);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      await logAction("BULK_CREATE_QUESTIONS", req.user?.fullName || "Admin", `Imported ${createdCount} questions`, "Question", req.ip);
    }
    if (updatedCount > 0) {
      await logAction("BULK_UPDATE_QUESTIONS", req.user?.fullName || "Admin", `Updated ${updatedCount} questions`, "Question", req.ip);
    }

    res.status(200).json(resultList);
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
      return res.json(sanitized);
    }
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
    const isStudent = req.user && req.user.role === "user";
    if (isStudent) {
      const raw = question.toObject();
      delete raw.correctAnswer;
      delete raw.explanation;
      if (raw.explanations) {
        delete raw.explanations.correct;
        delete raw.explanations.incorrect;
        delete raw.explanations.conceptSummary;
        delete raw.explanations.didYouKnow;
      }
      return res.json(raw);
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
    // Fetch the old question first for audit comparison
    const oldQuestion = await Question.findById(req.params.id);
    if (!oldQuestion) {
      return res.status(404).json({ message: "Question not found." });
    }

    const adminName = req.user?.fullName || "Admin";
    const qSnippet = oldQuestion.questionEnglish.substring(0, 50);

    // Check if correct answer is changing
    if (req.body.correctAnswer && req.body.correctAnswer !== oldQuestion.correctAnswer) {
      await logAction(
        "CHANGE_CORRECT_ANSWER",
        adminName,
        `Q: "${qSnippet}..." | Old Answer: "${oldQuestion.correctAnswer}" → New Answer: "${req.body.correctAnswer}"`,
        "Question Bank",
        req.ip
      );
    }

    // Check if options changed
    if (req.body.options && JSON.stringify(req.body.options) !== JSON.stringify(oldQuestion.options)) {
      await logAction(
        "EDIT_QUESTION_OPTIONS",
        adminName,
        `Q: "${qSnippet}..." | Options modified`,
        "Question Bank",
        req.ip
      );
    }

    if (req.body.explanation !== undefined) {
      req.body.explanations = {
        ...(oldQuestion.explanations?.toObject ? oldQuestion.explanations.toObject() : (oldQuestion.explanations || {})),
        correct: req.body.explanation
      };
    }

    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await logAction("UPDATE_QUESTION", adminName, `Question: ${question.questionEnglish.substring(0, 30)}...`, "Question", req.ip);
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

// Get distinct subjects
const getSubjects = async (req, res) => {
  try {
    const subjects = await Question.distinct("subject", { isDeleted: { $ne: true } });
    const filteredSubjects = subjects.filter(subject => subject && subject.trim() !== "");
    res.json(filteredSubjects);
  } catch (error) {
    console.error("Get Subjects Error:", error);
    res.status(500).json({ message: "Failed to fetch subjects.", error: error.message });
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
  getSubjects,
};
