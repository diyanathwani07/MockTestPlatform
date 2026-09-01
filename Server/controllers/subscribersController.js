const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const AiPlan = require("../models/AiPlan");

// 1. GET /api/admin/ai-plans/subscribers (Overview KPIs & Plan Popularity)
const getSubscribersOverview = async (req, res) => {
  try {
    const now = new Date();

    // 1. Total distinct students with any subscription
    const distinctStudents = await Subscription.distinct("studentId");
    const totalSubscribers = distinctStudents.length;

    // 2. Currently active subscribers count (status === "active" AND expiryDate > now)
    const activeSubscribersCount = await Subscription.countDocuments({
      status: "active",
      expiryDate: { $gt: now }
    });

    // 3. New this month vs New last month & repeat purchase rate
    const firstPurchaseDates = await Subscription.aggregate([
      {
        $group: {
          _id: "$studentId",
          firstPurchaseDate: { $min: "$createdAt" },
          totalPurchases: { $sum: 1 }
        }
      }
    ]);

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    let newThisMonth = 0;
    let newLastMonth = 0;
    let repeatSubscribersCount = 0;

    firstPurchaseDates.forEach((doc) => {
      if (doc.firstPurchaseDate >= currentMonthStart) {
        newThisMonth++;
      } else if (
        doc.firstPurchaseDate >= lastMonthStart &&
        doc.firstPurchaseDate <= lastMonthEnd
      ) {
        newLastMonth++;
      }
      if (doc.totalPurchases > 1) {
        repeatSubscribersCount++;
      }
    });

    const repeatPurchaseRate =
      totalSubscribers > 0
        ? Math.round((repeatSubscribersCount / totalSubscribers) * 100)
        : 0;

    // 4. Plan Popularity Breakdown (Distinct Subscriber Count per Plan)
    const planPopularity = await Subscription.aggregate([
      {
        $group: {
          _id: {
            planId: "$planId",
            studentId: "$studentId"
          },
          planNameSnapshot: { $first: "$planNameSnapshot" }
        }
      },
      {
        $group: {
          _id: "$_id.planId",
          planNameSnapshot: { $first: "$planNameSnapshot" },
          subscriberCount: { $sum: 1 }
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
          subscriberCount: 1
        }
      },
      { $sort: { subscriberCount: -1 } }
    ]);

    const mostPopularPlan =
      planPopularity.length > 0 ? planPopularity[0] : null;

    res.json({
      kpis: {
        totalSubscribers,
        activeSubscribers: activeSubscribersCount,
        newThisMonth,
        newLastMonth,
        repeatPurchaseRate,
        repeatSubscribersCount,
        mostPopularPlan: mostPopularPlan ? mostPopularPlan.planName : "N/A"
      },
      planPopularity
    });
  } catch (error) {
    console.error("Get Subscribers Overview Error:", error);
    res.status(500).json({
      message: "Failed to load subscribers overview.",
      error: error.message
    });
  }
};

// 2. GET /api/admin/ai-plans/subscribers/list (Paginated, Filterable & Searchable)
const getSubscribersList = async (req, res) => {
  try {
    const {
      search = "",
      plan = "all",
      status = "all",
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skipNum = (pageNum - 1) * limitNum;
    const now = new Date();

    const listPipeline = [
      // 1. Sort subscriptions newest first
      {
        $sort: { createdAt: -1 }
      },
      // 2. Group by studentId
      {
        $group: {
          _id: "$studentId",
          lifetimeSpend: { $sum: "$amount" },
          purchaseCount: { $sum: 1 },
          lastPurchaseDate: { $max: "$startDate" },
          latestSubscription: { $first: "$$ROOT" },
          hasActiveSub: {
            $max: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "active"] },
                    { $gt: ["$expiryDate", now] }
                  ]
                },
                1,
                0
              ]
            }
          },
          hasExpiredSub: {
            $max: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$status", "expired"] },
                    { $lte: ["$expiryDate", now] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      // 3. Lookup User Profile Info
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDoc"
        }
      },
      {
        $unwind: {
          path: "$userDoc",
          preserveNullAndEmptyArrays: false
        }
      },
      // 4. Lookup AI Tests Generated by this student (quizType: "custom")
      {
        $lookup: {
          from: "quizzes",
          let: { studentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$createdBy", "$$studentId"] },
                    { $eq: ["$quizType", "custom"] }
                  ]
                }
              }
            },
            { $count: "count" }
          ],
          as: "aiQuizCountDoc"
        }
      },
      // 5. Lookup Plan Document for latest subscription
      {
        $lookup: {
          from: "aiplans",
          localField: "latestSubscription.planId",
          foreignField: "_id",
          as: "planDoc"
        }
      },
      // 6. Project formatted student object
      {
        $project: {
          _id: 0,
          studentId: "$_id",
          fullName: "$userDoc.fullName",
          email: "$userDoc.email",
          phone: { $ifNull: ["$userDoc.phone", ""] },
          avatar: { $ifNull: ["$userDoc.avatar", ""] },
          aiCredits: { $ifNull: ["$userDoc.aiCredits", 0] },
          userJoinedAt: "$userDoc.createdAt",
          lifetimeSpend: "$lifetimeSpend",
          purchaseCount: "$purchaseCount",
          lastPurchaseDate: "$lastPurchaseDate",
          currentPlanId: "$latestSubscription.planId",
          currentPlanName: {
            $ifNull: [
              "$latestSubscription.planNameSnapshot",
              { $arrayElemAt: ["$planDoc.name", 0] },
              "AI Plan"
            ]
          },
          currentStatus: {
            $cond: [
              {
                $and: [
                  { $eq: ["$latestSubscription.status", "active"] },
                  { $gt: ["$latestSubscription.expiryDate", now] }
                ]
              },
              "active",
              "expired"
            ]
          },
          currentExpiryDate: "$latestSubscription.expiryDate",
          rawStatus: "$latestSubscription.status",
          aiTestsGenerated: {
            $ifNull: [{ $arrayElemAt: ["$aiQuizCountDoc.count", 0] }, 0]
          },
          hasActiveSub: "$hasActiveSub",
          hasExpiredSub: "$hasExpiredSub"
        }
      }
    ];

    // Build Match Filters
    const matchConditions = {};

    // Search filter (fullName, email, phone)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      matchConditions.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Plan filter
    if (plan && plan !== "all") {
      try {
        matchConditions.currentPlanId = new mongoose.Types.ObjectId(plan);
      } catch (err) {
        matchConditions.currentPlanName = plan;
      }
    }

    // Status filter (all | active | expired | zero_usage | expired_previously_active)
    if (status && status !== "all") {
      if (status === "active") {
        matchConditions.currentStatus = "active";
      } else if (status === "expired") {
        matchConditions.currentStatus = "expired";
      } else if (status === "zero_usage") {
        matchConditions.currentStatus = "active";
        matchConditions.aiTestsGenerated = 0;
      } else if (status === "expired_previously_active") {
        matchConditions.currentStatus = "expired";
        matchConditions.hasExpiredSub = 1;
      }
    }

    if (Object.keys(matchConditions).length > 0) {
      listPipeline.push({ $match: matchConditions });
    }

    // Sort by latest purchase descending
    listPipeline.push({
      $sort: { lastPurchaseDate: -1 }
    });

    // Pagination using $facet
    listPipeline.push({
      $facet: {
        totalCount: [{ $count: "count" }],
        data: [{ $skip: skipNum }, { $limit: limitNum }]
      }
    });

    const result = await Subscription.aggregate(listPipeline);
    const totalCount =
      result[0]?.totalCount[0]?.count || 0;
    const subscribers = result[0]?.data || [];

    res.json({
      subscribers,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      }
    });
  } catch (error) {
    console.error("Get Subscribers List Error:", error);
    res.status(500).json({
      message: "Failed to load subscribers list.",
      error: error.message
    });
  }
};

// 3. GET /api/admin/ai-plans/subscribers/:studentId (Single Student Full Subscription History)
const getSubscriberHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const student = await User.findById(studentId).select(
      "fullName email phone avatar createdAt isPremium aiCredits premiumExpiresAt activePlan status"
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // Fetch all subscription rows for student, newest first
    const subscriptions = await Subscription.find({ studentId })
      .populate("planId", "name durationValue durationUnit sellingPrice")
      .sort({ createdAt: -1 });

    // Calculate lifetime stats
    let totalSpend = 0;
    subscriptions.forEach((sub) => {
      if (["active", "expired"].includes(sub.status)) {
        totalSpend += sub.amount;
      }
    });

    // Count AI Tests Generated
    const aiTestsGenerated = await Quiz.countDocuments({
      createdBy: studentId,
      quizType: "custom"
    });

    res.json({
      student,
      subscriptions,
      stats: {
        totalSpend,
        totalPurchases: subscriptions.length,
        aiTestsGenerated
      }
    });
  } catch (error) {
    console.error("Get Subscriber History Error:", error);
    res.status(500).json({
      message: "Failed to load subscriber history.",
      error: error.message
    });
  }
};

module.exports = {
  getSubscribersOverview,
  getSubscribersList,
  getSubscriberHistory
};
