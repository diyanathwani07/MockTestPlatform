const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const logAction = require("../utils/logger");
const { notifyUser } = require("../services/notificationService");

exports.purchaseExam = async (req, res) => {
  try {
    const { examId, gatewayTxnId } = req.body;
    if (!examId) return res.status(400).json({ message: "examId is required" });

    // Validate item exists and resolve title & paid status
    let item = await Quiz.findById(examId);
    if (!item) {
      const FlashcardSet = require("../models/FlashcardSet");
      item = await FlashcardSet.findById(examId);
    }
    if (!item) {
      return res.status(404).json({ message: "Exam or study material not found." });
    }

    // In production, unverified client calls cannot unlock paid content without a real payment gateway
    const isProduction = process.env.NODE_ENV === "production";
    const isExplicitDevSimulation = !isProduction && (process.env.ALLOW_PAYMENT_SIMULATION === "true" || process.env.ALLOW_PAYMENT_SIMULATION === undefined);

    if (item.isPaid && !isExplicitDevSimulation) {
      return res.status(402).json({
        success: false,
        message: "Payment verification failed. Real payment gateway verification is required in production."
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Idempotent purchase update: only append if not already present
    if (!user.purchasedExams.some(id => id.toString() === examId.toString())) {
      user.purchasedExams.push(examId);
      await user.save();
    }

    const title = item.title || `ID: ${examId}`;
    await logAction("PURCHASE_EXAM_SUCCESS", user.fullName, `${title} (Txn: ${gatewayTxnId || 'simulated'})`, "Purchase", req.ip);
    await notifyUser(req.user._id, {
      type: "PAYMENT_SUCCESS",
      title: "Purchase Successful",
      message: `You have successfully purchased "${title}".`,
      link: "/dashboard/exams",
      relatedId: examId
    });

    res.status(200).json({ 
      success: true, 
      status: "success", 
      message: "Payment confirmed. Access granted." 
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

    const practice = await PracticeQuiz.findById(practiceId);
    if (!practice) {
      return res.status(404).json({ message: "Practice quiz not found." });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const isExplicitDevSimulation = !isProduction && (process.env.ALLOW_PAYMENT_SIMULATION === "true" || process.env.ALLOW_PAYMENT_SIMULATION === undefined);

    if (practice.isPaid && !isExplicitDevSimulation) {
      return res.status(402).json({
        success: false,
        message: "Payment verification failed. Real payment gateway verification is required in production."
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Idempotent purchase update
    if (!user.purchasedPractice.some(id => id.toString() === practiceId.toString())) {
      user.purchasedPractice.push(practiceId);
      await user.save();
    }

    const title = practice.title || `ID: ${practiceId}`;
    await logAction("PURCHASE_PRACTICE_SUCCESS", user.fullName, `${title} (Txn: ${gatewayTxnId || 'simulated'})`, "Purchase", req.ip);
    await notifyUser(req.user._id, {
      type: "PAYMENT_SUCCESS",
      title: "Purchase Successful",
      message: `You have successfully purchased "${title}".`,
      link: "/dashboard/practice-list",
      relatedId: practiceId
    });

    res.status(200).json({ 
      success: true, 
      status: "success", 
      message: "Payment confirmed. Access granted." 
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
