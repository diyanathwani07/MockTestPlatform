const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const logAction = require("../utils/logger");
const { notifyUser } = require("../services/notificationService");

exports.purchaseExam = async (req, res) => {
  try {
    const { examId, gatewayTxnId } = req.body;
    if (!examId) return res.status(400).json({ message: "examId is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const exam = await Quiz.findById(examId);
    const examTitle = exam ? exam.title : `Exam ID: ${examId}`;

    // SECURITY FIX: Do not grant access blindly. Verification is pending.
    await logAction("PURCHASE_EXAM_PENDING", user.fullName, `${examTitle} (Pending, Txn: ${gatewayTxnId || 'none'})`, "Purchase", req.ip);

    await notifyUser(req.user._id, {
      type: "PAYMENT_PENDING",
      title: "Purchase Pending Verification",
      message: `Your request to purchase "${examTitle}" has been recorded and is awaiting payment verification.`,
      link: "/my-exams",
      relatedId: exam?._id
    });

    res.status(200).json({ 
      success: false, 
      status: "verification_pending", 
      message: "Payment is pending verification. Access will be granted after payment confirmation." 
    });
  } catch (error) {
    console.error("Purchase Exam Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.purchasePractice = async (req, res) => {
  try {
    const { practiceId, gatewayTxnId } = req.body;
    if (!practiceId) return res.status(400).json({ message: "practiceId is required" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const practice = await PracticeQuiz.findById(practiceId);
    const practiceTitle = practice ? practice.title : `Practice ID: ${practiceId}`;

    // SECURITY FIX: Do not grant access blindly. Verification is pending.
    await logAction("PURCHASE_PRACTICE_PENDING", user.fullName, `${practiceTitle} (Pending, Txn: ${gatewayTxnId || 'none'})`, "Purchase", req.ip);

    await notifyUser(req.user._id, {
      type: "PAYMENT_PENDING",
      title: "Purchase Pending Verification",
      message: `Your request to purchase "${practiceTitle}" has been recorded and is awaiting payment verification.`,
      link: "/my-exams",
      relatedId: practice?._id
    });

    res.status(200).json({ 
      success: false, 
      status: "verification_pending", 
      message: "Payment is pending verification. Access will be granted after payment confirmation." 
    });
  } catch (error) {
    console.error("Purchase Practice Error:", error);
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
