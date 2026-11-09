const Subscription = require("../models/Subscription");
const AiPlan = require("../models/AiPlan");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const ExamSeries = require("../models/ExamSeries");
const FlashcardSet = require("../models/FlashcardSet");
const { syncLegacySubscriptions } = require("../utils/subscriptionUtils");

/**
 * Helper to compute date boundaries based on date preset or custom range
 */
function resolveDateFilter(query) {
  const { datePreset, from, to } = query;
  const now = new Date();
  const dateMatch = {};

  if (datePreset === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateMatch.startDate = { $gte: startOfToday };
  } else if (datePreset === "7d" || datePreset === "last_7_days") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateMatch.startDate = { $gte: sevenDaysAgo };
  } else if (datePreset === "30d" || datePreset === "last_30_days") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateMatch.startDate = { $gte: thirtyDaysAgo };
  } else if (datePreset === "this_month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    dateMatch.startDate = { $gte: startOfMonth };
  } else if (datePreset === "this_year") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    dateMatch.startDate = { $gte: startOfYear };
  } else if (from || to) {
    dateMatch.startDate = {};
    if (from) dateMatch.startDate.$gte = new Date(from);
    if (to) dateMatch.startDate.$lte = new Date(to);
  }

  return dateMatch;
}

/**
 * GET /api/admin/revenue/analytics (and /overview)
 * Aggregated revenue metrics, trend over time, plan breakdown, category distribution, and recent transactions.
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    await syncLegacySubscriptions();
    const { period = "monthly" } = req.query;
    const dateMatch = resolveDateFilter(req.query);

    // Base match for paid revenue calculations (active + expired)
    const paidMatch = {
      status: { $in: ["active", "expired"] },
      ...dateMatch
    };

    // Calculate Today's and This Month's start dates
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Revenue Over Time Aggregation (Monthly, Yearly, or Daily)
    let dateFormat = "%Y-%m";
    if (period === "yearly") dateFormat = "%Y";
    else if (period === "daily") dateFormat = "%Y-%m-%d";

    const trendAggregation = await Subscription.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$startDate" } },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
          students: { $addToSet: "$studentId" }
        }
      },
      {
        $project: {
          _id: 0,
          period: "$_id",
          revenue: "$revenue",
          subscriptions: "$count",
          uniqueStudents: { $size: "$students" }
        }
      },
      { $sort: { period: 1 } }
    ]);

    // 2. Revenue By Plan Aggregation
    const planAggregation = await Subscription.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: "$planId",
          planNameSnapshot: { $first: "$planNameSnapshot" },
          totalRevenue: { $sum: "$amount" },
          totalPurchases: { $sum: 1 },
          activeSubscribers: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          avgOrderValue: { $avg: "$amount" }
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
          totalRevenue: "$totalRevenue",
          totalPurchases: "$totalPurchases",
          activeSubscribers: "$activeSubscribers",
          avgOrderValue: { $round: ["$avgOrderValue", 2] }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // 3. Headline KPIs Aggregation
    const kpiAggregation = await Subscription.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ["$status", ["active", "expired"]] }, "$amount", 0]
            }
          },
          activeRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, "$amount", 0]
            }
          },
          // Gateway breakdown
          simulatedPhonePeRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["active", "expired"]] },
                    { $eq: ["$paymentGateway", "phonepe"] }
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
                {
                  $and: [
                    { $in: ["$status", ["active", "expired"]] },
                    { $eq: ["$paymentGateway", "admin_grant"] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          todayRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["active", "expired"]] },
                    { $gte: ["$startDate", startOfToday] }
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
                    { $in: ["$status", ["active", "expired"]] },
                    { $gte: ["$startDate", startOfMonth] }
                  ]
                },
                "$amount",
                0
              ]
            }
          },
          paidSubscriptionsCount: {
            $sum: {
              $cond: [{ $in: ["$status", ["active", "expired"]] }, 1, 0]
            }
          },
          activeSubscriptionsCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "active"] }, 1, 0]
            }
          },
          expiredSubscriptionsCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "expired"] }, 1, 0]
            }
          },
          cancelledSubscriptionsCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0]
            }
          },
          refundedSubscriptionsCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "refunded"] }, 1, 0]
            }
          },
          paidStudents: {
            $addToSet: {
              $cond: [
                { $in: ["$status", ["active", "expired"]] },
                "$studentId",
                "$$REMOVE"
              ]
            }
          }
        }
      }
    ]);

    const kpiData = kpiAggregation[0] || {
      totalRevenue: 0,
      activeRevenue: 0,
      simulatedPhonePeRevenue: 0,
      adminGrantsAmount: 0,
      todayRevenue: 0,
      thisMonthRevenue: 0,
      paidSubscriptionsCount: 0,
      activeSubscriptionsCount: 0,
      expiredSubscriptionsCount: 0,
      cancelledSubscriptionsCount: 0,
      refundedSubscriptionsCount: 0,
      paidStudents: []
    };

    const totalRevenue = kpiData.totalRevenue || 0;
    const activeRevenue = kpiData.activeRevenue || 0;
    const paidSubscriptionsCount = kpiData.paidSubscriptionsCount || 0;
    const distinctPayingStudentsCount = (kpiData.paidStudents || []).length;

    // New vs Renewal
    const newSubscriptions = distinctPayingStudentsCount;
    const renewalSubscriptions = Math.max(0, paidSubscriptionsCount - newSubscriptions);

    // ARPU = Total Revenue / Distinct Paying Students
    const arpu = distinctPayingStudentsCount > 0
      ? Math.round((totalRevenue / distinctPayingStudentsCount) * 100) / 100
      : 0;

    // Renewal Rate = renewals / (renewals + expired)
    const totalPotentialRenewals = renewalSubscriptions + (kpiData.expiredSubscriptionsCount || 0);
    const renewalRate = totalPotentialRenewals > 0
      ? Math.round((renewalSubscriptions / totalPotentialRenewals) * 1000) / 10
      : paidSubscriptionsCount > 0
      ? Math.round((renewalSubscriptions / paidSubscriptionsCount) * 1000) / 10
      : 0;

    // 4. Product Category Breakdown (Honest Accounting without phantom exam prices)
    const usersWithExamsCount = await User.countDocuments({ "purchasedExams.0": { $exists: true } });
    const usersWithPracticeCount = await User.countDocuments({ "purchasedPractice.0": { $exists: true } });
    const totalPaidExamsCount = await Quiz.countDocuments({ isPaid: true });
    const totalPaidPracticeCount = await PracticeQuiz.countDocuments({ isPaid: true });
    const totalSeriesCount = await ExamSeries.countDocuments({ isPaid: true }).catch(() => 0);
    const totalFlashcardSetsCount = await FlashcardSet.countDocuments({ isPaid: true }).catch(() => 0);

    const categoryBreakdown = [
      {
        category: "AI Plans & Subscriptions",
        revenue: totalRevenue,
        verifiedRevenue: 0,
        simulatedRevenue: kpiData.simulatedPhonePeRevenue || 0,
        adminGrantsAmount: kpiData.adminGrantsAmount || 0,
        transactionsCount: paidSubscriptionsCount,
        hasHistoricalLedger: true,
        statusText: "Ledger Active"
      },
      {
        category: "Mock Exams",
        revenue: 0,
        verifiedRevenue: 0,
        simulatedRevenue: 0,
        adminGrantsAmount: 0,
        entitledStudentsCount: usersWithExamsCount,
        catalogCount: totalPaidExamsCount,
        hasHistoricalLedger: false,
        statusText: "Historical transaction data unavailable"
      },
      {
        category: "Practice Modules",
        revenue: 0,
        verifiedRevenue: 0,
        simulatedRevenue: 0,
        adminGrantsAmount: 0,
        entitledStudentsCount: usersWithPracticeCount,
        catalogCount: totalPaidPracticeCount,
        hasHistoricalLedger: false,
        statusText: "Historical transaction data unavailable"
      },
      {
        category: "Exam Series",
        revenue: 0,
        verifiedRevenue: 0,
        simulatedRevenue: 0,
        adminGrantsAmount: 0,
        entitledStudentsCount: 0,
        catalogCount: totalSeriesCount,
        hasHistoricalLedger: false,
        statusText: "Historical transaction data unavailable"
      },
      {
        category: "Flashcards",
        revenue: 0,
        verifiedRevenue: 0,
        simulatedRevenue: 0,
        adminGrantsAmount: 0,
        entitledStudentsCount: 0,
        catalogCount: totalFlashcardSetsCount,
        hasHistoricalLedger: false,
        statusText: "Historical transaction data unavailable"
      }
    ];

    // 5. Recent Subscriptions Table Data (latest 50 transactions)
    const recentSubscriptions = await Subscription.find(dateMatch)
      .populate("studentId", "fullName email avatar phone")
      .populate("planId", "name durationValue durationUnit sellingPrice")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      period,
      verificationNotice: {
        gatewayStatus: "SANDBOX_SIMULATED",
        message: "Payment processing is currently in simulation mode. Verified bank gateway revenue will display upon production gateway activation.",
        verifiedCollectedRevenue: 0,
        simulatedRevenue: kpiData.simulatedPhonePeRevenue || 0,
        adminGrantsAmount: kpiData.adminGrantsAmount || 0
      },
      kpis: {
        totalRevenue,
        verifiedRevenue: 0, // Real bank revenue is 0 until gateway credentials activated
        simulatedRevenue: kpiData.simulatedPhonePeRevenue || 0,
        adminGrantsAmount: kpiData.adminGrantsAmount || 0,
        todayRevenue: kpiData.todayRevenue || 0,
        thisMonthRevenue: kpiData.thisMonthRevenue || 0,
        activeRevenue,
        paidSubscriptionsCount,
        activeSubscriptionsCount: kpiData.activeSubscriptionsCount || 0,
        expiredSubscriptionsCount: kpiData.expiredSubscriptionsCount || 0,
        cancelledSubscriptionsCount: kpiData.cancelledSubscriptionsCount || 0,
        refundedSubscriptionsCount: kpiData.refundedSubscriptionsCount || 0,
        distinctPayingStudentsCount,
        newSubscriptions,
        renewalSubscriptions,
        arpu,
        renewalRate
      },
      revenueOverTime: trendAggregation,
      revenueByPlan: planAggregation,
      categoryBreakdown,
      recentSubscriptions
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
 * Paginated and filterable list of subscriptions / transactions.
 */
const getRevenueTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "", status = "all", gateway = "all", from, to } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skipNum = (pageNum - 1) * limitNum;

    const filter = {};

    // Status filter
    if (status && status !== "all") {
      filter.status = status;
    }

    // Gateway filter
    if (gateway && gateway !== "all") {
      filter.paymentGateway = gateway;
    }

    // Date range filter
    if (from || to) {
      filter.startDate = {};
      if (from) filter.startDate.$gte = new Date(from);
      if (to) filter.startDate.$lte = new Date(to);
    }

    // Text search filter (Student name, email, phone, or Purchase/Transaction ID)
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      // Find matching users
      const matchedUsers = await User.find({
        $or: [
          { fullName: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ]
      }).select("_id");

      const userIds = matchedUsers.map(u => u._id);

      filter.$or = [
        { purchaseId: searchRegex },
        { gatewayTxnId: searchRegex },
        { planNameSnapshot: searchRegex },
        { studentId: { $in: userIds } }
      ];
    }

    const totalCount = await Subscription.countDocuments(filter);
    const transactions = await Subscription.find(filter)
      .populate("studentId", "fullName email avatar phone")
      .populate("planId", "name durationValue durationUnit sellingPrice")
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    res.json({
      success: true,
      transactions,
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
 * GET /api/admin/revenue/customers
 * Financial customer directory: lists students who hold subscriptions, purchased exams, or practice tests.
 */
const getRevenueCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "", status = "all" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skipNum = (pageNum - 1) * limitNum;

    const userFilter = { role: "user" };

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      userFilter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    if (status === "active_subscriber") {
      userFilter.isPremium = true;
    } else if (status === "free_user") {
      userFilter.isPremium = false;
    } else if (status === "has_purchases") {
      userFilter.$or = [
        { "purchasedExams.0": { $exists: true } },
        { "purchasedPractice.0": { $exists: true } },
        { activePlan: { $ne: null } }
      ];
    }

    const totalCount = await User.countDocuments(userFilter);
    const users = await User.find(userFilter)
      .select("fullName email phone avatar isPremium activePlan purchasedExams purchasedPractice createdAt")
      .populate("activePlan", "name sellingPrice durationValue durationUnit maxAITests")
      .populate("purchasedExams", "title price")
      .populate("purchasedPractice", "title price")
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(limitNum);

    // Fetch subscription stats for each student
    const studentIds = users.map(u => u._id);
    const studentSubscriptions = await Subscription.find({ studentId: { $in: studentIds } })
      .select("studentId amount status paymentGateway startDate expiryDate aiTestsUsed maxAITests")
      .sort({ createdAt: -1 });

    const customers = users.map(user => {
      const subs = studentSubscriptions.filter(s => s.studentId.toString() === user._id.toString());
      const totalSpent = subs.reduce((sum, s) => sum + (s.amount || 0), 0);
      const verifiedSpent = 0; // In sandbox mode
      const simulatedSpent = subs.filter(s => s.paymentGateway === "phonepe").reduce((sum, s) => sum + (s.amount || 0), 0);
      const adminGrantsSpent = subs.filter(s => s.paymentGateway === "admin_grant").reduce((sum, s) => sum + (s.amount || 0), 0);

      const latestSub = subs[0] || null;

      return {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "—",
        avatar: user.avatar,
        isPremium: Boolean(user.isPremium),
        activePlan: user.activePlan || null,
        purchasedExamsCount: (user.purchasedExams || []).length,
        purchasedPracticeCount: (user.purchasedPractice || []).length,
        totalSubscriptionsCount: subs.length,
        totalSpent,
        verifiedSpent,
        simulatedSpent,
        adminGrantsSpent,
        latestSubscription: latestSub,
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
      .select("title subject price questions count duration createdAt")
      .sort({ createdAt: -1 });

    const paidPractice = await PracticeQuiz.find({ isPaid: true })
      .select("title subject price totalQuestions duration createdAt")
      .sort({ createdAt: -1 });

    const paidSeries = await ExamSeries.find({ isPaid: true })
      .select("title subject price description exams createdAt")
      .sort({ createdAt: -1 })
      .catch(() => []);

    const paidFlashcards = await FlashcardSet.find({ isPaid: true })
      .select("title subject price totalCards createdAt")
      .sort({ createdAt: -1 })
      .catch(() => []);

    // Total entitled users
    const usersWithExams = await User.countDocuments({ "purchasedExams.0": { $exists: true } });
    const usersWithPractice = await User.countDocuments({ "purchasedPractice.0": { $exists: true } });

    res.json({
      success: true,
      provenanceNotice: {
        hasHistoricalLedger: false,
        message: "Exam, Practice, Series, and Flashcard purchases currently grant active student entitlements. Detailed monetary transaction order ledgers will be unified in Phase 3. Verified collected revenue displays ₹0."
      },
      summary: {
        paidQuizzesCount: paidQuizzes.length,
        entitledQuizUsers: usersWithExams,
        paidPracticeCount: paidPractice.length,
        entitledPracticeUsers: usersWithPractice,
        paidSeriesCount: paidSeries.length,
        paidFlashcardSetsCount: paidFlashcards.length
      },
      catalog: {
        quizzes: paidQuizzes,
        practice: paidPractice,
        series: paidSeries,
        flashcards: paidFlashcards
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
            // Consumed >= 80% of quota
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
          subscribersCount: "$subscribersCount",
          allocatedTests: "$allocatedTests",
          usedTests: "$usedTests",
          utilizationRate: {
            $cond: [
              { $gt: ["$allocatedTests", 0] },
              { $round: [{ $multiply: [{ $divide: ["$usedTests", "$allocatedTests"] }, 100] }, 1] },
              0
            ]
          }
        }
      },
      { $sort: { usedTests: -1 } }
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

module.exports = {
  getRevenueAnalytics,
  getRevenueTransactions,
  getRevenueCustomers,
  getExamsPracticeFinancials,
  getAiUsageAnalytics
};
