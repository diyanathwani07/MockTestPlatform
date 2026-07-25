const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");

exports.purchaseExam = async (req, res) => {
  try {
    const { examId } = req.body;
    if (!examId) return res.status(400).json({ message: "examId is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.purchasedExams.includes(examId)) {
      user.purchasedExams.push(examId);
      await user.save();
    }

    res.status(200).json({ message: "Exam purchased successfully", success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.purchasePractice = async (req, res) => {
  try {
    const { practiceId } = req.body;
    if (!practiceId) return res.status(400).json({ message: "practiceId is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.purchasedPractice.includes(practiceId)) {
      user.purchasedPractice.push(practiceId);
      await user.save();
    }

    res.status(200).json({ message: "Practice module purchased successfully", success: true });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getMyExams = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("purchasedExams");
    res.status(200).json(user.purchasedExams);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getMyPractice = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("purchasedPractice");
    res.status(200).json(user.purchasedPractice);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
