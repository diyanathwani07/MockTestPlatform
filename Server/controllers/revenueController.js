const Subscription = require("../models/Subscription");
const AiPlan = require("../models/AiPlan");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const { syncLegacySubscriptions } = require("../utils/subscriptionUtils");

/**
 * GET /api/admin/revenue/analytics
 * Aggregated revenue metrics, trend over time, plan breakdown, category distribution, and recent transactions.
 */
const getRevenueAnalytics = async (req, res) => {
  try {
    await syncLegacySubscriptions();
    const { period = "monthly", from, to } = req.query;

    // Date filter on startDate
    const dateMatch = {};
    if (from || to) {
      dateMatch.startDate = {};
      if (from) dateMatch.startDate.$gte = new Date(from);
      if (to) dateMatch.startDate.$lte = new Date(to);
    }

    // Base match for paid revenue calculations (active + expired)
    const paidMatch = {
      status: { $in: ["active", "expired"] },
      ...dateMatch
    };

    // Calculate Today's and This Month's start dates
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Revenue Over Time Aggregation (Monthly or Yearly)
    const dateFormat = period === "yearly" ? "%Y" : "%Y-%m";
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

    // First purchase is new, any subsequent purchase by the same student is a renewal
    const newSubscriptions = distinctPayingStudentsCount;
    const renewalSubscriptions = Math.max(0, paidSubscriptionsCount - newSubscriptions);

    // ARPU = Total Revenue / Distinct Paying Students
    const arpu = distinctPayingStudentsCount > 0
      ? Math.round((totalRevenue / distinctPayingStudentsCount) * 100) / 100
      : 0;

    // Renewal Rate = renewals / (renewals + expired) or renewals / total paid
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

    const categoryBreakdown = [
      {
        category: "AI Plans & Subscriptions",
        revenue: totalRevenue,
        verifiedRevenue: 0,
        simulatedRevenue: kpiData.simulatedPhonePeRevenue || 0,
        adminGrantsAmount: kpiData.adminGrantsAmount || 0,
        transactionsCount: paidSubscriptionsCount,
        hasHistoricalLedger: true
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
        note: "Entitlement active; order ledger pending"
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
        note: "Entitlement active; order ledger pending"
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
      categoryBreakdown,
      revenueOverTime: trendAggregation,
      revenueByPlan: planAggregation,
      recentSubscriptions
    });
  } catch (error) {
    console.error("Get Revenue Analytics Error:", error);
    res.status(500).json({
      message: "Failed to calculate revenue analytics.",
      error: error.message
    });
  }
};

/**
 * GET /api/admin/revenue/transactions
 * Paginated and searchable ledger of all subscription transactions.
 */
const getRevenueTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      search = "",
      status = "all",
      gateway = "all",
      from,
      to
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skipNum = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (gateway && gateway !== "all") {
      filter.paymentGateway = gateway;
    }

    if (from || to) {
      filter.startDate = {};
      if (from) filter.startDate.$gte = new Date(from);
      if (to) filter.startDate.$lte = new Date(to);
    }

    // Search by student name, email, or purchaseId
    if (search && search.trim() !== "") {
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
        { purchaseId: searchRegex },
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

module.exports = {
  getRevenueAnalytics,
  getRevenueTransactions
};
