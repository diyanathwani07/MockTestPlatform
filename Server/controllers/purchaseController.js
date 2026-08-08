const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const logAction = require("../utils/logger");
const { notifyUser } = require("../services/notificationService");

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

    // Try to find the exam details for logging
    const exam = await Quiz.findById(examId);
    const examTitle = exam ? exam.title : `Exam ID: ${examId}`;

    await logAction("PURCHASE_EXAM", user.fullName, examTitle, "Purchase", req.ip);

    // TODO: this currently fires on request success/failure, not a real payment gateway callback - revisit when PhonePe (or another gateway) webhook is actually integrated.
    await notifyUser(req.user._id, {
      type: "PAYMENT_SUCCESS",
      title: "Purchase successful",
      message: `You've unlocked "${examTitle}".`,
      link: "/my-exams",
      relatedId: exam?._id
    });

    res.status(200).json({ message: "Exam purchased successfully", success: true });
  } catch (error) {
    if (req.user && req.user._id) {
      // TODO: this currently fires on request success/failure, not a real payment gateway callback - revisit when PhonePe (or another gateway) webhook is actually integrated.
      await notifyUser(req.user._id, {
        type: "PAYMENT_FAILED",
        title: "Purchase failed",
        message: "Your purchase could not be completed. Please try again."
      });
    }
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

    // Try to find the practice details for logging
    const practice = await PracticeQuiz.findById(practiceId);
    const practiceTitle = practice ? practice.title : `Practice ID: ${practiceId}`;

    await logAction("PURCHASE_PRACTICE", user.fullName, practiceTitle, "Purchase", req.ip);

    // TODO: this currently fires on request success/failure, not a real payment gateway callback - revisit when PhonePe (or another gateway) webhook is actually integrated.
    await notifyUser(req.user._id, {
      type: "PAYMENT_SUCCESS",
      title: "Purchase successful",
      message: `You've unlocked "${practiceTitle}".`,
      link: "/my-exams",
      relatedId: practice?._id
    });

    res.status(200).json({ message: "Practice module purchased successfully", success: true });
  } catch (error) {
    if (req.user && req.user._id) {
      // TODO: this currently fires on request success/failure, not a real payment gateway callback - revisit when PhonePe (or another gateway) webhook is actually integrated.
      await notifyUser(req.user._id, {
        type: "PAYMENT_FAILED",
        title: "Purchase failed",
        message: "Your purchase could not be completed. Please try again."
      });
    }
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
