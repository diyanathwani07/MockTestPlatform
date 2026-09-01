const Subscription = require("../models/Subscription");
const AiPlan = require("../models/AiPlan");
const User = require("../models/User");
const { syncLegacySubscriptions } = require("../utils/subscriptionUtils");

/**
 * GET /api/admin/revenue/analytics
 * Aggregated revenue metrics, trend over time, plan breakdown, and recent transactions.
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

    // 4. Recent Subscriptions Table Data (latest 50 transactions)
    const recentSubscriptions = await Subscription.find(dateMatch)
      .populate("studentId", "fullName email avatar")
      .populate("planId", "name durationValue durationUnit")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      period,
      kpis: {
        totalRevenue,
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

module.exports = {
  getRevenueAnalytics
};
