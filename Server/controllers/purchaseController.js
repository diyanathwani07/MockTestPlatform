const crypto = require("crypto");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const FlashcardSet = require("../models/FlashcardSet");
const ExamSeries = require("../models/ExamSeries");
const PurchaseTransaction = require("../models/PurchaseTransaction");
const { recordTransaction } = require("../services/ledgerService");
const logAction = require("../utils/logger");
const { notifyUser } = require("../services/notificationService");

/**
 * Student purchase of an Exam, Flashcard Set, or Exam Series
 */
exports.purchaseExam = async (req, res) => {
  try {
    const { examId, gatewayTxnId } = req.body;
    if (!examId) return res.status(400).json({ message: "examId is required" });

    // Validate item exists and resolve title, category, and paid status
    let item = await Quiz.findById(examId);
    let itemModel = "Quiz";
    let productCategory = "exam";

    if (!item) {
      item = await FlashcardSet.findById(examId);
      if (item) {
        itemModel = "FlashcardSet";
        productCategory = "flashcard";
      }
    }
    if (!item) {
      item = await ExamSeries.findById(examId);
      if (item) {
        itemModel = "ExamSeries";
        productCategory = "exam_series";
      }
    }
    if (!item) {
      return res.status(404).json({ message: "Exam or study material not found." });
    }

    const itemPrice = Number(item.price) || 0;
    const isPaid = !!item.isPaid && itemPrice > 0;

    // Client price tampering validation
    if (req.body.amount !== undefined && Number(req.body.amount) !== itemPrice) {
      return res.status(400).json({
        success: false,
        code: "AMOUNT_MISMATCH",
        message: `Amount mismatch. Price is ₹${itemPrice}.`
      });
    }

    // In production, unverified client calls cannot unlock paid content without a real payment gateway
    const isProduction = process.env.NODE_ENV === "production";
    const isExplicitDevSimulation = !isProduction && (process.env.ALLOW_PAYMENT_SIMULATION === "true" || process.env.ALLOW_PAYMENT_SIMULATION === undefined);

    if (isPaid && !isExplicitDevSimulation) {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "Payment verification failed. Real payment gateway verification is required in production."
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Replay attack prevention on gatewayTxnId
    let cleanTxnId = null;
    if (gatewayTxnId && typeof gatewayTxnId === "string" && gatewayTxnId.trim() !== "") {
      cleanTxnId = gatewayTxnId.trim();
      const existingTxn = await PurchaseTransaction.findOne({ gatewayTxnId: cleanTxnId });
      if (existingTxn) {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_TRANSACTION",
          message: "This transaction reference has already been processed."
        });
      }
    }

    // Idempotent purchase update: only append if not already present
    const alreadyPurchased = user.purchasedExams.some(id => id.toString() === examId.toString());
    if (!alreadyPurchased) {
      user.purchasedExams.push(examId);
      await user.save();
    }

    // Record Unified Purchase Transaction
    const provenance = !isPaid
      ? "free_access"
      : isExplicitDevSimulation
      ? "dev_simulation"
      : "verified_payment";

    const paymentVerificationStatus = !isPaid
      ? "not_applicable"
      : isExplicitDevSimulation
      ? "simulated"
      : "verified";

    const orderId = `ORD-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    await recordTransaction({
      orderId,
      studentId: user._id,
      itemId: item._id,
      itemModel,
      itemTitleSnapshot: item.title,
      productCategory,
      amount: isPaid ? itemPrice : 0,
      currency: "INR",
      originalPriceSnapshot: item.originalPrice || itemPrice,
      discountSnapshot: (item.originalPrice && item.originalPrice > itemPrice) ? (item.originalPrice - itemPrice) : 0,
      gateway: !isPaid ? "free_checkout" : "phonepe",
      gatewayTxnId: cleanTxnId,
      paymentStatus: "paid",
      provenance,
      paymentVerificationStatus,
      paymentTimestamp: new Date(),
      metadata: { ip: req.ip, itemModel }
    });

    const title = item.title || `ID: ${examId}`;
    await logAction("PURCHASE_EXAM_SUCCESS", user.fullName, `${title} (Txn: ${cleanTxnId || 'simulated'})`, "Purchase", req.ip);
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
    if (error.code === "DUPLICATE_GATEWAY_TRANSACTION") {
      return res.status(409).json({ success: false, code: "DUPLICATE_TRANSACTION", message: error.message });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Student purchase of a Practice Quiz
 */
exports.purchasePractice = async (req, res) => {
  try {
    const { practiceId, gatewayTxnId } = req.body;
    if (!practiceId) return res.status(400).json({ message: "practiceId is required" });

    const practice = await PracticeQuiz.findById(practiceId);
    if (!practice) {
      return res.status(404).json({ message: "Practice quiz not found." });
    }

    const practicePrice = Number(practice.price) || 0;
    const isPaid = !!practice.isPaid && practicePrice > 0;

    // Client price tampering validation
    if (req.body.amount !== undefined && Number(req.body.amount) !== practicePrice) {
      return res.status(400).json({
        success: false,
        code: "AMOUNT_MISMATCH",
        message: `Amount mismatch. Practice quiz price is ₹${practicePrice}.`
      });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const isExplicitDevSimulation = !isProduction && (process.env.ALLOW_PAYMENT_SIMULATION === "true" || process.env.ALLOW_PAYMENT_SIMULATION === undefined);

    if (isPaid && !isExplicitDevSimulation) {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "Payment verification failed. Real payment gateway verification is required in production."
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Replay attack prevention on gatewayTxnId
    let cleanTxnId = null;
    if (gatewayTxnId && typeof gatewayTxnId === "string" && gatewayTxnId.trim() !== "") {
      cleanTxnId = gatewayTxnId.trim();
      const existingTxn = await PurchaseTransaction.findOne({ gatewayTxnId: cleanTxnId });
      if (existingTxn) {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_TRANSACTION",
          message: "This transaction reference has already been processed."
        });
      }
    }

    // Idempotent purchase update
    const alreadyPurchased = user.purchasedPractice.some(id => id.toString() === practiceId.toString());
    if (!alreadyPurchased) {
      user.purchasedPractice.push(practiceId);
      await user.save();
    }

    // Record Unified Purchase Transaction
    const provenance = !isPaid
      ? "free_access"
      : isExplicitDevSimulation
      ? "dev_simulation"
      : "verified_payment";

    const paymentVerificationStatus = !isPaid
      ? "not_applicable"
      : isExplicitDevSimulation
      ? "simulated"
      : "verified";

    const orderId = `ORD-PRAC-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    await recordTransaction({
      orderId,
      studentId: user._id,
      itemId: practice._id,
      itemModel: "PracticeQuiz",
      itemTitleSnapshot: practice.title,
      productCategory: "practice",
      amount: isPaid ? practicePrice : 0,
      currency: "INR",
      originalPriceSnapshot: practicePrice,
      discountSnapshot: 0,
      gateway: !isPaid ? "free_checkout" : "phonepe",
      gatewayTxnId: cleanTxnId,
      paymentStatus: "paid",
      provenance,
      paymentVerificationStatus,
      paymentTimestamp: new Date(),
      metadata: { ip: req.ip, itemModel: "PracticeQuiz" }
    });

    const title = practice.title || `ID: ${practiceId}`;
    await logAction("PURCHASE_PRACTICE_SUCCESS", user.fullName, `${title} (Txn: ${cleanTxnId || 'simulated'})`, "Purchase", req.ip);
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
    if (error.code === "DUPLICATE_GATEWAY_TRANSACTION") {
      return res.status(409).json({ success: false, code: "DUPLICATE_TRANSACTION", message: error.message });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Admin Grant Access: allows authorized finance or superadmin staff to grant a product to a student
 */
exports.adminGrantAccess = async (req, res) => {
  try {
    const { studentId, productCategory, itemId, note } = req.body;
    if (!studentId || !productCategory || !itemId) {
      return res.status(400).json({ message: "studentId, productCategory, and itemId are required." });
    }

    const user = await User.findById(studentId);
    if (!user) return res.status(404).json({ message: "Student not found." });

    let item, itemModel, resolvedCategory = productCategory;
    if (productCategory === "exam") {
      item = await Quiz.findById(itemId);
      itemModel = "Quiz";
    } else if (productCategory === "practice") {
      item = await PracticeQuiz.findById(itemId);
      itemModel = "PracticeQuiz";
    } else if (productCategory === "exam_series") {
      item = await ExamSeries.findById(itemId);
      itemModel = "ExamSeries";
    } else if (productCategory === "flashcard") {
      item = await FlashcardSet.findById(itemId);
      itemModel = "FlashcardSet";
    }

    if (!item) {
      return res.status(404).json({ message: "Target item not found." });
    }

    // Update student entitlement array
    if (resolvedCategory === "practice") {
      if (!user.purchasedPractice.some(id => id.toString() === itemId.toString())) {
        user.purchasedPractice.push(itemId);
        await user.save();
      }
    } else {
      if (!user.purchasedExams.some(id => id.toString() === itemId.toString())) {
        user.purchasedExams.push(itemId);
        await user.save();
      }
    }

    // Record Unified Transaction in Ledger
    const orderId = `GRANT-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const txn = await recordTransaction({
      orderId,
      studentId: user._id,
      itemId: item._id,
      itemModel,
      itemTitleSnapshot: item.title,
      productCategory: resolvedCategory,
      amount: 0, // Admin grants are ₹0 collected revenue
      originalPriceSnapshot: item.price || 0,
      discountSnapshot: item.price || 0,
      gateway: "admin_grant",
      paymentStatus: "paid",
      provenance: "admin_grant",
      paymentVerificationStatus: "admin_authorized",
      paymentTimestamp: new Date(),
      grantedBy: req.user._id,
      adminNotes: note || `Admin grant by ${req.user.fullName || "Admin"}`
    });

    await logAction("ADMIN_GRANT_ACCESS", req.user.fullName || "Admin", `Granted ${resolvedCategory}: ${item.title} to student ${user.fullName}`, "RevenueManagement", req.ip);

    res.status(200).json({
      success: true,
      message: `Access to "${item.title}" granted successfully.`,
      transaction: txn
    });
  } catch (error) {
    console.error("Admin Grant Access Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Logged-in student's own transaction history (isolated strictly to studentId)
 */
exports.getMyTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const filter = { studentId: req.user._id };
    const total = await PurchaseTransaction.countDocuments(filter);
    const transactions = await PurchaseTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    console.error("Get My Transactions Error:", error);
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
