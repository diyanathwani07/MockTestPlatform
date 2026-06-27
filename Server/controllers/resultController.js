const Result = require("../models/Result");

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
    } = req.body;

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

module.exports = { saveResult, getUserResults, getLeaderboard };