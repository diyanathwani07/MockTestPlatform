const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const AiPlan = require("../models/AiPlan");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const ExamSeries = require("../models/ExamSeries");
const FlashcardSet = require("../models/FlashcardSet");
const PurchaseTransaction = require("../models/PurchaseTransaction");
const { syncLegacySubscriptions } = require("../utils/subscriptionUtils");
const { transitionTransactionStatus } = require("../services/ledgerService");
const logAction = require("../utils/logger");

/**
 * Helper to compute date boundaries based on date preset or custom range
 */
function resolveDateFilter(query) {
  const { datePreset, from, to } = query;
  const now = new Date();
  const dateMatch = {};

  if (datePreset === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    dateMatch.createdAt = { $gte: startOfToday, $lte: endOfToday };
  } else if (datePreset === "7d" || datePreset === "last_7_days") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateMatch.createdAt = { $gte: sevenDaysAgo };
  } else if (datePreset === "30d" || datePreset === "last_30_days") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateMatch.createdAt = { $gte: thirtyDaysAgo };
  } else if (datePreset === "this_month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    dateMatch.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
  } else if (datePreset === "last_month") {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    dateMatch.createdAt = { $gte: startOfLastMonth, $lte: endOfLastMonth };
  } else if (datePreset === "this_year") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    dateMatch.createdAt = { $gte: startOfYear, $lte: endOfYear };
  } else if (datePreset === "last_year") {
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    dateMatch.createdAt = { $gte: startOfLastYear, $lte: endOfLastYear };
  } else if (from || to) {
    dateMatch.createdAt = {};
    if (from) dateMatch.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateMatch.createdAt.$lte = toDate;
    }
  }

  return dateMatch;
}

/**
 * GET /api/admin/revenue/analytics (and /overview)
 * Aggregated revenue metrics, trend over time, plan breakdown, category distribution, and recent transactions.
 * Now queries the Canonical Unified PurchaseTransaction Ledger!
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    // Non-blocking sync with throttle
    syncLegacySubscriptions().catch(() => {});
    const { period = "monthly" } = req.query;
    const dateMatch = resolveDateFilter(req.query);

    // Calculate Today's and This Month's start dates
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Unified Ledger Aggregation across ALL Monetization Streams
    const ledgerKpiAggregation = await PurchaseTransaction.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          paidTransactionsCount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] }
          },
          verifiedRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "verified_payment"] },
                    { $eq: ["$paymentVerificationStatus", "verified"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          simulatedRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "dev_simulation"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          adminGrantsAmount: {
            $sum: {
              $cond: [
                { $eq: ["$provenance", "admin_grant"] },
                "$originalPriceSnapshot",
                0
              ]
            }
          },
          adminGrantsCount: {
            $sum: {
              $cond: [{ $eq: ["$provenance", "admin_grant"] }, 1, 0]
            }
          },
          freeAccessCount: {
            $sum: {
              $cond: [{ $eq: ["$provenance", "free_access"] }, 1, 0]
            }
          },
          todayRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $gte: ["$createdAt", startOfToday] },
                    { $eq: ["$provenance", "verified_payment"] },
                    { $eq: ["$paymentVerificationStatus", "verified"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          thisMonthRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $gte: ["$createdAt", startOfMonth] },
                    { $eq: ["$provenance", "verified_payment"] },
                    { $eq: ["$paymentVerificationStatus", "verified"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          paidStudents: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "verified_payment"] },
                    { $eq: ["$paymentVerificationStatus", "verified"] }
                  ]
                },
                "$studentId",
                "$$REMOVE"
              ]
            }
          }
        }
      }
    ]);

    const kpiData = ledgerKpiAggregation[0] || {
      totalTransactions: 0,
      paidTransactionsCount: 0,
      verifiedRevenue: 0,
      simulatedRevenue: 0,
      adminGrantsAmount: 0,
      adminGrantsCount: 0,
      freeAccessCount: 0,
      todayRevenue: 0,
      thisMonthRevenue: 0,
      paidStudents: []
    };

    const verifiedRevenue = kpiData.verifiedRevenue || 0;
    const simulatedRevenue = kpiData.simulatedRevenue || 0;
    const totalRevenue = verifiedRevenue + simulatedRevenue; // Clean sum
    const paidTransactionsCount = kpiData.paidTransactionsCount || 0;
    const distinctPayingStudentsCount = (kpiData.paidStudents || []).length;

    // Active AI Subscriptions Revenue (for AI SaaS module)
    const activeSubAggregation = await Subscription.aggregate([
      {
        $match: {
          status: "active",
          expiryDate: { $gt: now }
        }
      },
      {
        $group: {
          _id: null,
          activeRevenue: { $sum: "$amount" },
          activeCount: { $sum: 1 }
        }
      }
    ]);
    const activeRevenue = activeSubAggregation[0]?.activeRevenue || 0;
    const activeSubscriptionsCount = activeSubAggregation[0]?.activeCount || 0;

    // ARPU = Total Revenue / Distinct Paying Students
    const arpu = distinctPayingStudentsCount > 0
      ? Math.round((totalRevenue / distinctPayingStudentsCount) * 100) / 100
      : 0;

    // 2. Revenue Over Time Aggregation (Monthly, Yearly, or Daily)
    let dateFormat = "%Y-%m";
    if (period === "yearly") dateFormat = "%Y";
    else if (period === "daily") dateFormat = "%Y-%m-%d";

    const trendAggregation = await PurchaseTransaction.aggregate([
      {
        $match: {
          status: "paid",
          provenance: { $in: ["verified_payment", "dev_simulation"] },
          ...dateMatch
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: {
            $sum: {
              $cond: [{ $eq: ["$provenance", "verified_payment"] }, "$amount", 0]
            }
          },
          totalVolume: { $sum: "$amount" },
          verifiedRevenue: {
            $sum: {
              $cond: [{ $eq: ["$provenance", "verified_payment"] }, "$amount", 0]
            }
          },
          simulatedRevenue: {
            $sum: {
              $cond: [{ $eq: ["$provenance", "dev_simulation"] }, "$amount", 0]
            }
          },
          count: { $sum: 1 },
          students: { $addToSet: "$studentId" }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: "$_id",
          revenue: 1,
          verifiedRevenue: 1,
          simulatedRevenue: 1,
          count: 1,
          distinctStudents: { $size: "$students" }
        }
      }
    ]);

    // 3. Category Breakdown Aggregation directly from Unified Ledger
    const categoryStats = await PurchaseTransaction.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$productCategory",
          totalVolume: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $in: ["$provenance", ["verified_payment", "dev_simulation"]] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          verifiedRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "verified_payment"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          simulatedRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "dev_simulation"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          adminGrantsAmount: {
            $sum: {
              $cond: [{ $eq: ["$provenance", "admin_grant"] }, "$originalPriceSnapshot", 0]
            }
          },
          transactionsCount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] }
          }
        }
      }
    ]);

    const categoryMap = {};
    categoryStats.forEach(stat => {
      categoryMap[stat._id] = stat;
    });

    // Counts of items and legacy entitlements
    const usersWithExamsCount = await User.countDocuments({ "purchasedExams.0": { $exists: true } });
    const usersWithPracticeCount = await User.countDocuments({ "purchasedPractice.0": { $exists: true } });
    const totalPaidExamsCount = await Quiz.countDocuments({ isPaid: true });
    const totalPaidPracticeCount = await PracticeQuiz.countDocuments({ isPaid: true });
    const totalSeriesCount = await ExamSeries.countDocuments({}).catch(() => 0);
    const totalFlashcardSetsCount = await FlashcardSet.countDocuments({ isPaid: true }).catch(() => 0);

    const aiPlanStats = categoryMap["ai_plan"] || {};
    const examStats = categoryMap["exam"] || {};
    const practiceStats = categoryMap["practice"] || {};
    const seriesStats = categoryMap["exam_series"] || {};
    const flashcardStats = categoryMap["flashcard"] || {};

    const categoryBreakdown = [
      {
        category: "AI Plans & Subscriptions",
        productCategory: "ai_plan",
        revenue: aiPlanStats.verifiedRevenue || 0,
        totalVolume: aiPlanStats.totalVolume || 0,
        verifiedRevenue: aiPlanStats.verifiedRevenue || 0,
        simulatedRevenue: aiPlanStats.simulatedRevenue || 0,
        adminGrantsAmount: aiPlanStats.adminGrantsAmount || 0,
        transactionsCount: aiPlanStats.transactionsCount || 0,
        hasHistoricalLedger: true,
        statusText: "Ledger Active"
      },
      {
        category: "Mock Exams",
        productCategory: "exam",
        revenue: examStats.verifiedRevenue || 0,
        totalVolume: examStats.totalVolume || 0,
        verifiedRevenue: examStats.verifiedRevenue || 0,
        simulatedRevenue: examStats.simulatedRevenue || 0,
        adminGrantsAmount: examStats.adminGrantsAmount || 0,
        transactionsCount: examStats.transactionsCount || 0,
        entitledStudentsCount: usersWithExamsCount,
        catalogCount: totalPaidExamsCount,
        hasHistoricalLedger: (examStats.transactionsCount || 0) > 0,
        statusText: (examStats.transactionsCount || 0) > 0
          ? "Ledger Active"
          : "Historical transaction data unavailable (Legacy entitlements preserved)"
      },
      {
        category: "Practice Modules",
        productCategory: "practice",
        revenue: practiceStats.verifiedRevenue || 0,
        totalVolume: practiceStats.totalVolume || 0,
        verifiedRevenue: practiceStats.verifiedRevenue || 0,
        simulatedRevenue: practiceStats.simulatedRevenue || 0,
        adminGrantsAmount: practiceStats.adminGrantsAmount || 0,
        transactionsCount: practiceStats.transactionsCount || 0,
        entitledStudentsCount: usersWithPracticeCount,
        catalogCount: totalPaidPracticeCount,
        hasHistoricalLedger: (practiceStats.transactionsCount || 0) > 0,
        statusText: (practiceStats.transactionsCount || 0) > 0
          ? "Ledger Active"
          : "Historical transaction data unavailable (Legacy entitlements preserved)"
      },
      {
        category: "Exam Series",
        productCategory: "exam_series",
        revenue: seriesStats.verifiedRevenue || 0,
        totalVolume: seriesStats.totalVolume || 0,
        verifiedRevenue: seriesStats.verifiedRevenue || 0,
        simulatedRevenue: seriesStats.simulatedRevenue || 0,
        adminGrantsAmount: seriesStats.adminGrantsAmount || 0,
        transactionsCount: seriesStats.transactionsCount || 0,
        entitledStudentsCount: 0,
        catalogCount: totalSeriesCount,
        hasHistoricalLedger: (seriesStats.transactionsCount || 0) > 0,
        statusText: (seriesStats.transactionsCount || 0) > 0
          ? "Ledger Active"
          : "Historical transaction data unavailable (Legacy entitlements preserved)"
      },
      {
        category: "Flashcards",
        productCategory: "flashcard",
        revenue: flashcardStats.verifiedRevenue || 0,
        totalVolume: flashcardStats.totalVolume || 0,
        verifiedRevenue: flashcardStats.verifiedRevenue || 0,
        simulatedRevenue: flashcardStats.simulatedRevenue || 0,
        adminGrantsAmount: flashcardStats.adminGrantsAmount || 0,
        transactionsCount: flashcardStats.transactionsCount || 0,
        entitledStudentsCount: 0,
        catalogCount: totalFlashcardSetsCount,
        hasHistoricalLedger: (flashcardStats.transactionsCount || 0) > 0,
        statusText: (flashcardStats.transactionsCount || 0) > 0
          ? "Ledger Active"
          : "Historical transaction data unavailable (Legacy entitlements preserved)"
      }
    ];

    // 4. Revenue By Plan (Consolidated and Deduplicated by Normalized Plan Name)
    const rawPlanAggregation = await PurchaseTransaction.aggregate([
      {
        $match: {
          productCategory: "ai_plan",
          status: "paid",
          ...dateMatch
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ["$itemTitleSnapshot", "$itemId"]
          },
          planId: { $first: "$itemId" },
          revenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$provenance", "verified_payment"] },
                    { $eq: ["$paymentVerificationStatus", "verified"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          simulatedRevenue: {
            $sum: {
              $cond: [{ $eq: ["$provenance", "dev_simulation"] }, "$amount", 0]
            }
          },
          subscribersCount: { $sum: 1 }
        }
      }
    ]);

    // Group and merge by normalized plan name so repeated test variations consolidate cleanly
    const planMap = new Map();
    for (const item of rawPlanAggregation) {
      const rawName = String(item._id || "AI Plan").trim();
      // Strip epoch timestamps, e.g. "Pro Monthly 1794222231432" -> "Pro Monthly"
      const cleanName = rawName.replace(/\s*\d{10,}$/, "").trim() || "AI Plan";

      if (!planMap.has(cleanName)) {
        planMap.set(cleanName, {
          planId: item.planId || cleanName,
          planName: cleanName,
          revenue: 0,
          simulatedRevenue: 0,
          subscribersCount: 0
        });
      }
      const existing = planMap.get(cleanName);
      existing.revenue += (item.revenue || 0);
      existing.simulatedRevenue += (item.simulatedRevenue || 0);
      existing.subscribersCount += (item.subscribersCount || 0);
    }

    const planAggregation = Array.from(planMap.values())
      .sort((a, b) => b.revenue - a.revenue);

    // 5. Recent Transactions from Unified Ledger (Latest 25)
    const recentTransactions = await PurchaseTransaction.find(dateMatch)
      .populate("studentId", "fullName email avatar phone")
      .populate("grantedBy", "fullName email")
      .sort({ createdAt: -1 })
      .limit(25);

    res.json({
      success: true,
      period,
      verificationNotice: {
        gatewayStatus: "SANDBOX_SIMULATED",
        message: "Unified ledger is active across AI Plans, Exams, Practice Tests, Series, and Flashcards. Verified bank gateway revenue will display upon production gateway activation.",
        verifiedCollectedRevenue: verifiedRevenue,
        simulatedRevenue,
        adminGrantsAmount: kpiData.adminGrantsAmount || 0
      },
      kpis: {
        totalRevenue,
        verifiedRevenue,
        simulatedRevenue,
        adminGrantsAmount: kpiData.adminGrantsAmount || 0,
        adminGrantsCount: kpiData.adminGrantsCount || 0,
        freeAccessCount: kpiData.freeAccessCount || 0,
        todayRevenue: kpiData.todayRevenue || 0,
        thisMonthRevenue: kpiData.thisMonthRevenue || 0,
        activeRevenue,
        paidSubscriptionsCount: paidTransactionsCount,
        activeSubscriptionsCount,
        distinctPayingStudentsCount,
        arpu,
        renewalRate: 0
      },
      revenueOverTime: trendAggregation,
      revenueByPlan: planAggregation,
      categoryBreakdown,
      recentSubscriptions: recentTransactions
    });
  } catch (error) {
    console.error("Get Revenue Analytics Error:", error);
    res.status(500).json({
      message: "Failed to generate revenue analytics.",
      error: error.message
    });
  }
};

/**
 * GET /api/admin/revenue/transactions
 * Paginated, searchable, multi-criteria filterable list of transactions from the unified ledger.
 */
const getRevenueTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = "",
      category = "all",
      status = "all",
      provenance = "all",
      gateway = "all",
      from,
      to
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skipNum = (pageNum - 1) * limitNum;

    const filter = {};

    // Category filter
    if (category && category !== "all") {
      filter.productCategory = category;
    }

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Provenance filter
    if (provenance && provenance !== "all") {
      filter.provenance = provenance;
    }

    // Gateway filter
    if (gateway && gateway !== "all") {
      filter.gateway = gateway;
    }

    // Date range filter
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // Search query (student name/email/phone, transactionId, orderId, gatewayTxnId, itemTitleSnapshot)
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      const matchedUsers = await User.find({
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ]
      }).select("_id");

      const userIds = matchedUsers.map(u => u._id);

      filter.$or = [
        { transactionId: searchRegex },
        { orderId: searchRegex },
        { gatewayTxnId: searchRegex },
        { itemTitleSnapshot: searchRegex },
        { studentId: { $in: userIds } }
      ];
    }

    const totalCount = await PurchaseTransaction.countDocuments(filter);
    const transactions = await PurchaseTransaction.find(filter)
      .populate("studentId", "fullName email avatar phone")
      .populate("grantedBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    // Map backwards-compatible fields for older Phase 2 UI tabs
    const mappedTransactions = transactions.map(t => {
      const obj = t.toObject();
      obj.purchaseId = obj.orderId || obj.transactionId;
      obj.paymentGateway = obj.gateway;
      return obj;
    });

    res.json({
      success: true,
      transactions: mappedTransactions,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      }
    });
  } catch (error) {
    console.error("Get Revenue Transactions Error:", error);
    res.status(500).json({
      message: "Failed to fetch revenue transactions.",
      error: error.message
    });
  }
};

/**
 * GET /api/admin/revenue/transactions/:id
 * Retrieve a single unified transaction's complete audit trail and details.
 */
const getSingleTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    let transaction = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      transaction = await PurchaseTransaction.findById(id)
        .populate("studentId", "fullName email phone avatar")
        .populate("grantedBy", "fullName email")
        .populate("subscriptionId");
    }

    if (!transaction) {
      transaction = await PurchaseTransaction.findOne({
        $or: [{ transactionId: id }, { orderId: id }]
      })
        .populate("studentId", "fullName email phone avatar")
        .populate("grantedBy", "fullName email")
        .populate("subscriptionId");
    }

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error("Get Single Transaction Error:", error);
    res.status(500).json({ message: "Failed to retrieve transaction.", error: error.message });
  }
};

/**
 * PATCH /api/admin/revenue/transactions/:id/status
 * Authorized administrative status transition (e.g., mark refunded or cancelled)
 */
const updateTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus, note = "" } = req.body;

    if (!newStatus) {
      return res.status(400).json({ message: "New status is required." });
    }

    let transaction = await PurchaseTransaction.findById(id);
    if (!transaction) {
      transaction = await PurchaseTransaction.findOne({ transactionId: id });
    }

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    const updated = await transitionTransactionStatus(transaction.transactionId, newStatus, req.user, note);

    await logAction(
      "TRANSACTION_STATUS_UPDATE",
      req.user.fullName || "Admin",
      `Changed status of Txn ${transaction.transactionId} from ${transaction.status} to ${newStatus}. Note: ${note}`,
      "RevenueManagement",
      req.ip
    );

    res.json({
      success: true,
      message: `Transaction status updated to ${newStatus}.`,
      transaction: updated
    });
  } catch (error) {
    console.error("Update Transaction Status Error:", error);
    res.status(400).json({ message: error.message });
  }
};

/**
 * GET /api/admin/revenue/customers
 * Financial customer directory: lists students who hold subscriptions, purchased exams, or practice tests.
 * Aggregates lifetime platform spending directly from the canonical ledger.
 */
const getRevenueCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "", status = "all" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skipNum = (pageNum - 1) * limitNum;

    // Build customer aggregation from PurchaseTransaction and User
    const customerSpendAggregation = await PurchaseTransaction.aggregate([
      {
        $group: {
          _id: "$studentId",
          totalSpent: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $in: ["$provenance", ["verified_payment", "dev_simulation"]] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          verifiedSpent: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "verified_payment"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          simulatedSpent: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "dev_simulation"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          adminGrantsSpent: {
            $sum: {
              $cond: [{ $eq: ["$provenance", "admin_grant"] }, "$originalPriceSnapshot", 0]
            }
          },
          transactionsCount: { $sum: 1 },
          lastTransactionDate: { $max: "$createdAt" }
        }
      }
    ]);

    const spendMap = {};
    customerSpendAggregation.forEach(c => {
      spendMap[c._id.toString()] = c;
    });

    const userQuery = {
      $or: [
        { _id: { $in: Object.keys(spendMap) } },
        { "purchasedExams.0": { $exists: true } },
        { "purchasedPractice.0": { $exists: true } },
        { activePlan: { $ne: null } }
      ]
    };

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      userQuery.$and = [
        {
          $or: [
            { fullName: searchRegex },
            { email: searchRegex },
            { phone: searchRegex }
          ]
        }
      ];
    }

    const totalCount = await User.countDocuments(userQuery);
    const users = await User.find(userQuery)
      .select("fullName email phone avatar createdAt activePlan purchasedExams purchasedPractice status isPremium premiumExpiresAt")
      .populate("activePlan", "name durationValue durationUnit sellingPrice")
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    const customers = users.map(user => {
      const spend = spendMap[user._id.toString()] || {
        totalSpent: 0,
        verifiedSpent: 0,
        simulatedSpent: 0,
        adminGrantsSpent: 0,
        transactionsCount: 0,
        lastTransactionDate: user.createdAt
      };

      return {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        avatar: user.avatar || "",
        activePlan: user.activePlan,
        isPremium: !!user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        purchasedExamsCount: (user.purchasedExams || []).length,
        purchasedPracticeCount: (user.purchasedPractice || []).length,
        totalSpent: spend.totalSpent,
        verifiedSpent: spend.verifiedSpent,
        simulatedSpent: spend.simulatedSpent,
        adminGrantsSpent: spend.adminGrantsSpent,
        transactionsCount: spend.transactionsCount,
        lastTransactionDate: spend.lastTransactionDate,
        createdAt: user.createdAt
      };
    });

    res.json({
      success: true,
      customers,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      }
    });
  } catch (error) {
    console.error("Get Revenue Customers Error:", error);
    res.status(500).json({
      message: "Failed to fetch revenue customer directory.",
      error: error.message
    });
  }
};

/**
 * GET /api/admin/revenue/exams-practice
 * Pricing and student entitlement summary for Paid Exams, Practice Tests, Series, and Flashcards.
 */
const getExamsPracticeFinancials = async (req, res) => {
  try {
    const paidQuizzes = await Quiz.find({ isPaid: true })
      .select("title subject price plans questions count duration createdAt")
      .sort({ createdAt: -1 });

    const paidPractice = await PracticeQuiz.find({ isPaid: true })
      .select("title subject price plans totalQuestions duration createdAt")
      .sort({ createdAt: -1 });

    const paidSeries = await ExamSeries.find({})
      .select("title slug description isPublished createdAt")
      .sort({ createdAt: -1 })
      .catch(() => []);

    const paidFlashcards = await FlashcardSet.find({ isPaid: true })
      .select("title subject price totalCards createdAt")
      .sort({ createdAt: -1 })
      .catch(() => []);

    // 1. Gather all catalog item ObjectIds
    const allItemIds = [
      ...paidQuizzes.map((q) => q._id),
      ...paidPractice.map((p) => p._id),
      ...paidSeries.map((s) => s._id),
      ...paidFlashcards.map((f) => f._id)
    ];

    // 2. Aggregate transactions from unified PurchaseTransaction ledger
    const txAggregation = await PurchaseTransaction.aggregate([
      { $match: { itemId: { $in: allItemIds } } },
      {
        $group: {
          _id: "$itemId",
          txCount: { $sum: 1 },
          verifiedRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "verified_payment"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          simulatedRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "paid"] },
                    { $eq: ["$provenance", "dev_simulation"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          }
        }
      }
    ]);

    const txMap = new Map();
    txAggregation.forEach((t) => {
      txMap.set(t._id.toString(), {
        txCount: t.txCount || 0,
        verifiedRevenue: t.verifiedRevenue || 0,
        simulatedRevenue: t.simulatedRevenue || 0
      });
    });

    // 3. Scan User collection for historical legacy entitlements without payment records
    const usersWithEntitlements = await User.find({
      $or: [
        { "purchasedExams.0": { $exists: true } },
        { "purchasedPractice.0": { $exists: true } }
      ]
    }).select("purchasedExams purchasedPractice");

    const legacyMap = new Map();
    let entitledQuizUsersCount = 0;
    let entitledPracticeUsersCount = 0;

    usersWithEntitlements.forEach((u) => {
      let userHasExam = false;
      let userHasPractice = false;

      (u.purchasedExams || []).forEach((eId) => {
        const idStr = eId.toString();
        legacyMap.set(idStr, (legacyMap.get(idStr) || 0) + 1);
        userHasExam = true;
      });

      (u.purchasedPractice || []).forEach((pId) => {
        const idStr = pId.toString();
        legacyMap.set(idStr, (legacyMap.get(idStr) || 0) + 1);
        userHasPractice = true;
      });

      if (userHasExam) entitledQuizUsersCount++;
      if (userHasPractice) entitledPracticeUsersCount++;
    });

    // 4. Helper to determine accurate backend-driven ledger status and pricing
    const mapCatalogItem = (item, type) => {
      const idStr = item._id.toString();
      const tx = txMap.get(idStr);
      const txCount = tx ? tx.txCount : 0;
      const legacyCount = legacyMap.get(idStr) || 0;
      const verifiedRevenue = tx ? tx.verifiedRevenue : 0;
      const simulatedRevenue = tx ? tx.simulatedRevenue : 0;

      // Pricing logic: use direct price or starting price from active plans
      let price = Number(item.price) || 0;
      let startingPrice = price;
      let hasPlans = false;
      let plansCount = 0;

      if (item.plans && Array.isArray(item.plans) && item.plans.length > 0) {
        plansCount = item.plans.length;
        const activePlans = item.plans.filter((p) => p.isActive !== false);
        const validPrices = (activePlans.length > 0 ? activePlans : item.plans)
          .map((p) => Number(p.price) || 0)
          .filter((p) => p > 0);
        if (validPrices.length > 0) {
          hasPlans = true;
          startingPrice = Math.min(...validPrices);
          if (price === 0) {
            price = startingPrice;
          }
        }
      }

      // Backend-driven status determination
      let ledgerStatus = "ledger_ready";
      let ledgerStatusLabel = "Ledger Ready";

      if (txCount > 0) {
        ledgerStatus = "ledger_active";
        ledgerStatusLabel = "Ledger Active";
      } else if (legacyCount > 0) {
        ledgerStatus = "legacy_access";
        ledgerStatusLabel = "Legacy Access";
      } else {
        ledgerStatus = "ledger_ready";
        ledgerStatusLabel = "Ledger Ready";
      }

      return {
        _id: item._id,
        title: item.title,
        subject: item.subject || (type === "series" ? "Exam Series" : "General"),
        price,
        startingPrice,
        hasPlans,
        plansCount,
        duration: item.duration || 0,
        totalQuestions: item.totalQuestions || item.count || (item.questions ? item.questions.length : 0),
        createdAt: item.createdAt,
        ledgerStatus,
        ledgerStatusLabel,
        txCount,
        legacyCount,
        verifiedRevenue,
        simulatedRevenue
      };
    };

    res.json({
      success: true,
      provenanceNotice: {
        hasHistoricalLedger: true,
        message:
          "All new monetization events across AI Plans, Exams, Practice Tests, Series, and Flashcards are recorded in the unified transaction ledger. In accordance with financial audit integrity, verified collected revenue reflects confirmed monetary bank payments, while historical student entitlements without payment records remain preserved."
      },
      summary: {
        paidQuizzesCount: paidQuizzes.length,
        entitledQuizUsers: entitledQuizUsersCount,
        paidPracticeCount: paidPractice.length,
        entitledPracticeUsers: entitledPracticeUsersCount,
        paidSeriesCount: paidSeries.length,
        paidFlashcardSetsCount: paidFlashcards.length
      },
      catalog: {
        quizzes: paidQuizzes.map((q) => mapCatalogItem(q, "quiz")),
        practice: paidPractice.map((p) => mapCatalogItem(p, "practice")),
        series: paidSeries.map((s) => mapCatalogItem(s, "series")),
        flashcards: paidFlashcards.map((f) => mapCatalogItem(f, "flashcard"))
      }
    });
  } catch (error) {
    console.error("Get Exams Practice Financials Error:", error);
    res.status(500).json({
      message: "Failed to fetch exams and practice financial catalog.",
      error: error.message
    });
  }
};

/**
 * GET /api/admin/revenue/ai-usage
 * Aggregated AI tests usage analytics and quota utilization rate.
 */
const getAiUsageAnalytics = async (req, res) => {
  try {
    const usageAggregation = await Subscription.aggregate([
      { $match: { status: { $in: ["active", "expired"] } } },
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          totalAllocatedTests: { $sum: { $ifNull: ["$maxAITests", 20] } },
          totalUsedTests: { $sum: { $ifNull: ["$aiTestsUsed", 0] } },
          activeSubscriptions: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          highUsageSubscriptions: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    "$aiTestsUsed",
                    { $multiply: [{ $ifNull: ["$maxAITests", 20] }, 0.8] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const usageData = usageAggregation[0] || {
      totalSubscriptions: 0,
      totalAllocatedTests: 0,
      totalUsedTests: 0,
      activeSubscriptions: 0,
      highUsageSubscriptions: 0
    };

    const overallUtilization = usageData.totalAllocatedTests > 0
      ? Math.round((usageData.totalUsedTests / usageData.totalAllocatedTests) * 1000) / 10
      : 0;

    // Usage by Plan
    const usageByPlan = await Subscription.aggregate([
      { $match: { status: { $in: ["active", "expired"] } } },
      {
        $group: {
          _id: "$planId",
          planNameSnapshot: { $first: "$planNameSnapshot" },
          subscribersCount: { $sum: 1 },
          allocatedTests: { $sum: { $ifNull: ["$maxAITests", 20] } },
          usedTests: { $sum: { $ifNull: ["$aiTestsUsed", 0] } }
        }
      },
      {
        $lookup: {
          from: "aiplans",
          localField: "_id",
          foreignField: "_id",
          as: "planDoc"
        }
      },
      {
        $project: {
          _id: 0,
          planId: "$_id",
          planName: {
            $ifNull: [
              "$planNameSnapshot",
              { $arrayElemAt: ["$planDoc.name", 0] },
              "Custom / Deleted Plan"
            ]
          },
          subscribersCount: 1,
          allocatedTests: 1,
          usedTests: 1,
          utilizationRate: {
            $cond: [
              { $gt: ["$allocatedTests", 0] },
              { $round: [{ $multiply: [{ $divide: ["$usedTests", "$allocatedTests"] }, 100] }, 1] },
              0
            ]
          }
        }
      },
      { $sort: { allocatedTests: -1 } }
    ]);

    res.json({
      success: true,
      metrics: {
        totalSubscriptions: usageData.totalSubscriptions,
        activeSubscriptions: usageData.activeSubscriptions,
        totalAllocatedTests: usageData.totalAllocatedTests,
        totalUsedTests: usageData.totalUsedTests,
        remainingTests: Math.max(0, usageData.totalAllocatedTests - usageData.totalUsedTests),
        overallUtilization,
        highUsageSubscriptions: usageData.highUsageSubscriptions
      },
      usageByPlan
    });
  } catch (error) {
    console.error("Get AI Usage Analytics Error:", error);
    res.status(500).json({
      message: "Failed to fetch AI usage analytics.",
      error: error.message
    });
  }
};

/**
 * GET /api/admin/revenue/reports
 * Pre-compiled analytical reports across all monetization streams.
 */
const getRevenueReports = async (req, res) => {
  try {
    const transactions = await PurchaseTransaction.find({})
      .populate("studentId", "fullName email")
      .populate("grantedBy", "fullName email")
      .sort({ createdAt: -1 });

    const totalCount = transactions.length;
    let verifiedRevenue = 0;
    let simulatedRevenue = 0;
    let adminGrantsCount = 0;
    let freeAccessCount = 0;

    const categoryMap = {
      ai_plan: { count: 0, revenue: 0 },
      exam: { count: 0, revenue: 0 },
      practice: { count: 0, revenue: 0 },
      exam_series: { count: 0, revenue: 0 },
      flashcard: { count: 0, revenue: 0 }
    };

    transactions.forEach(t => {
      const cat = t.productCategory || "ai_plan";
      if (!categoryMap[cat]) categoryMap[cat] = { count: 0, revenue: 0 };

      if (t.status === "paid") {
        if (t.provenance === "verified_payment" && t.paymentVerificationStatus === "verified") {
          verifiedRevenue += t.amount;
          categoryMap[cat].revenue += t.amount;
        } else if (t.provenance === "dev_simulation") {
          simulatedRevenue += t.amount;
          categoryMap[cat].revenue += t.amount;
        } else if (t.provenance === "admin_grant") {
          adminGrantsCount++;
        } else if (t.provenance === "free_access") {
          freeAccessCount++;
        }
        categoryMap[cat].count++;
      }
    });

    res.json({
      success: true,
      summary: {
        totalTransactions: totalCount,
        verifiedRevenue,
        simulatedRevenue,
        totalRevenue: verifiedRevenue + simulatedRevenue,
        adminGrantsCount,
        freeAccessCount
      },
      categoryPerformance: categoryMap
    });
  } catch (error) {
    console.error("Get Revenue Reports Error:", error);
    res.status(500).json({ message: "Failed to compile financial reports.", error: error.message });
  }
};

module.exports = {
  getRevenueAnalytics,
  getRevenueTransactions,
  getSingleTransaction,
  updateTransactionStatus,
  getRevenueCustomers,
  getExamsPracticeFinancials,
  getAiUsageAnalytics,
  getRevenueReports
};
