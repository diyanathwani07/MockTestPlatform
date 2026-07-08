const Result = require("../models/Result");
const crypto = require("crypto");

const saveResult = async (req, res) => {
  try {
    const {
      userId,
      quizId,
      quizTitle,
      subject,
      examName,
      reaction,
      feedbackMessage,
      score,
      total,
      correct,
      incorrect,
      percentage,
      timeTaken,
      sectionResults,
      difficultyBreakdown
    } = req.body;

    const shareId = crypto.randomBytes(4).toString("hex");

    const result = await Result.create({
      userId,
      quizId,
      quizTitle,
      subject,
      examName,
      reaction,
      feedbackMessage,
      score,
      total,
      correct,
      incorrect,
      percentage,
      timeTaken: timeTaken || 0,
      shareId,
      isPublic: true,
      sectionResults: sectionResults || [],
      difficultyBreakdown: difficultyBreakdown || {
        easy: { correct: 0, total: 0 },
        medium: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 }
      }
    });

    res.status(201).json({
      success: true,
      result,
    });
  } catch (error) {
    console.log("SAVE ERROR", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getUserResults = async (req, res) => {
  try {
    const { userId } = req.params;
    const results = await Result.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(results);
  } catch (error) {
    console.error("GET RESULTS ERROR", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    // Fetch all results, populate user info (name, maybe avatar)
    // In a real app we might aggregate by highest score per user, but for now we fetch top 100 results
    const results = await Result.find()
      .populate("userId", "fullName name email avatar")
      .sort({ score: -1, percentage: -1, createdAt: 1 })
      .limit(100);
      
    res.status(200).json(results);
  } catch (error) {
    console.error("GET LEADERBOARD ERROR", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getSharedResult = async (req, res) => {
  try {
    const { shareId } = req.params;
    const result = await Result.findOne({ shareId })
      .populate("userId", "fullName name");
      
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    if (!result.isPublic) {
      return res.status(403).json({ message: "This result is private." });
    }

    const safeResult = {
      quizTitle: result.quizTitle || result.examName || "Quiz",
      subject: result.subject,
      score: result.score,
      percentage: result.percentage,
      correct: result.correct,
      incorrect: result.incorrect,
      timeTaken: result.timeTaken,
      createdAt: result.createdAt,
      studentName: result.userId ? (result.userId.name || result.userId.fullName) : "Student",
    };

    res.status(200).json(safeResult);
  } catch (error) {
    console.error("GET SHARED RESULT ERROR", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getResultByShareId = async (req, res) => {
  try {
    const { shareId } = req.params;
    const result = await Result.findOne({ shareId }).populate("userId", "fullName name email");
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("GET RESULT BY SHARE ID ERROR", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { saveResult, getUserResults, getLeaderboard, getSharedResult, getResultByShareId };