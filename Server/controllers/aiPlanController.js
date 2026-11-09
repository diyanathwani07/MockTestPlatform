const AiPlan = require("../models/AiPlan");

// GET all AI plans
// Staff with manage_ai_plans or superadmin can see draft/inactive, students and other staff only see active
const getAiPlans = async (req, res) => {
  try {
    const query = {};
    let canManagePlans = false;
    if (req.user) {
      if (req.user.role === "superadmin") {
        canManagePlans = true;
      } else if (Array.isArray(req.user.permissions) && (req.user.permissions.includes("full_access") || req.user.permissions.includes("manage_ai_plans"))) {
        canManagePlans = true;
      } else if (req.user.department) {
        const Department = require("../models/Department");
        const dept = await Department.findOne({ name: req.user.department });
        if (dept && Array.isArray(dept.permissions) && (dept.permissions.includes("full_access") || dept.permissions.includes("manage_ai_plans"))) {
          canManagePlans = true;
        }
      }
    }

    if (!canManagePlans) {
      query.status = "active";
    }

    const plans = await AiPlan.find(query)
      .populate("allowedExamIds", "title")
      .sort({ displayOrder: 1, createdAt: -1 });

    res.json(plans);
  } catch (error) {
    console.error("Get AI Plans Error:", error);
    res.status(500).json({ message: "Failed to retrieve AI plans.", error: error.message });
  }
};

// GET a specific AI plan by ID
const getAiPlanById = async (req, res) => {
  try {
    const plan = await AiPlan.findById(req.params.id).populate("allowedExamIds", "title");
    if (!plan) {
      return res.status(404).json({ message: "AI Plan not found." });
    }
    res.json(plan);
  } catch (error) {
    console.error("Get AI Plan Error:", error);
    res.status(500).json({ message: "Failed to retrieve AI plan.", error: error.message });
  }
};

// CREATE a new AI plan (Admin only)
const createAiPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      originalPrice,
      sellingPrice,
      durationValue,
      durationUnit,
      
      maxAITests,
      features,
      allowedExamIds,
      isFeatured,
      status,
      displayOrder
    } = req.body;

    if (!name || originalPrice === undefined || sellingPrice === undefined || !durationValue || !maxAITests) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    if (sellingPrice > originalPrice) {
      return res.status(400).json({ message: "Selling price cannot exceed original price." });
    }

    // Check for duplicate plan names
    const existing = await AiPlan.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "A plan with this name already exists." });
    }

    // Handle recommended/featured exclusive highlights
    if (isFeatured) {
      await AiPlan.updateMany({}, { isFeatured: false });
    }

    const plan = new AiPlan({
      name,
      description,
      originalPrice,
      sellingPrice,
      durationValue,
      durationUnit,
      
      maxAITests: maxAITests || 0,
      features: features || [],
      allowedExamIds: allowedExamIds || [],
      isFeatured: !!isFeatured,
      status: status || "draft",
      displayOrder: displayOrder || 0
    });

    await plan.save();
    
    // Log admin action to audit logs
    const logAction = require("../utils/logger");
    await logAction("CREATE_AI_PLAN", req.user?.fullName || "Admin", `Created plan: ${plan.name} (Selling: ₹${plan.sellingPrice})`, "AI Plans", req.ip);

    res.status(201).json(plan);
  } catch (error) {
    console.error("Create AI Plan Error:", error);
    res.status(500).json({ message: "Failed to create AI plan.", error: error.message });
  }
};

// UPDATE an AI plan (Admin only)
const updateAiPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      originalPrice,
      sellingPrice,
      durationValue,
      durationUnit,
      
      maxAITests,
      features,
      allowedExamIds,
      isFeatured,
      status,
      displayOrder
    } = req.body;

    const plan = await AiPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: "AI Plan not found." });
    }

    if (sellingPrice > originalPrice) {
      return res.status(400).json({ message: "Selling price cannot exceed original price." });
    }

    if (name && name !== plan.name) {
      const existing = await AiPlan.findOne({ name });
      if (existing) {
        return res.status(400).json({ message: "A plan with this name already exists." });
      }
    }

    if (isFeatured) {
      await AiPlan.updateMany({ _id: { $ne: plan._id } }, { isFeatured: false });
    }

    plan.name = name || plan.name;
    plan.description = description !== undefined ? description : plan.description;
    plan.originalPrice = originalPrice !== undefined ? originalPrice : plan.originalPrice;
    plan.sellingPrice = sellingPrice !== undefined ? sellingPrice : plan.sellingPrice;
    plan.durationValue = durationValue !== undefined ? durationValue : plan.durationValue;
    plan.durationUnit = durationUnit || plan.durationUnit;
    
    plan.maxAITests = maxAITests !== undefined ? maxAITests : plan.maxAITests;
    plan.features = features || plan.features;
    plan.allowedExamIds = allowedExamIds || plan.allowedExamIds;
    plan.isFeatured = isFeatured !== undefined ? !!isFeatured : plan.isFeatured;
    plan.status = status || plan.status;
    plan.displayOrder = displayOrder !== undefined ? displayOrder : plan.displayOrder;

    await plan.save();

    // Log admin action to audit logs
    const logAction = require("../utils/logger");
    await logAction("UPDATE_AI_PLAN", req.user?.fullName || "Admin", `Updated plan: ${plan.name}`, "AI Plans", req.ip);

    res.json(plan);
  } catch (error) {
    console.error("Update AI Plan Error:", error);
    res.status(500).json({ message: "Failed to update AI plan.", error: error.message });
  }
};

// PATCH plan status (Admin only)
const updatePlanStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "inactive", "draft"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const plan = await AiPlan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({ message: "AI Plan not found." });
    }

    res.json(plan);
    
    // Log admin action to audit logs
    const logAction = require("../utils/logger");
    await logAction("UPDATE_AI_PLAN_STATUS", req.user?.fullName || "Admin", `Changed plan status for "${plan.name}" to ${status}`, "AI Plans", req.ip);

  } catch (error) {
    console.error("Patch AI Plan Status Error:", error);
    res.status(500).json({ message: "Failed to update status.", error: error.message });
  }
};

// DELETE an AI plan (Admin only)
const deleteAiPlan = async (req, res) => {
  try {
    const plan = await AiPlan.findByIdAndDelete(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: "AI Plan not found." });
    }

    // Log admin action to audit logs
    const logAction = require("../utils/logger");
    await logAction("DELETE_AI_PLAN", req.user?.fullName || "Admin", `Deleted plan: ${plan.name}`, "AI Plans", req.ip);

    res.json({ message: "AI Plan deleted successfully." });
  } catch (error) {
    console.error("Delete AI Plan Error:", error);
    res.status(500).json({ message: "Failed to delete AI plan.", error: error.message });
  }
};

const User = require("../models/User");
const Subscription = require("../models/Subscription");
const logAction = require("../utils/logger");
const { notifyUser } = require("../services/notificationService");
const crypto = require("crypto");

// SUBSCRIBE/unlock a plan (Secure server-side validation & payment integrity)
const subscribeToPlan = async (req, res) => {
  try {
    const { planId, gatewayTxnId, amount } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, message: "planId is required." });
    }

    const plan = await AiPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "AI Plan not found." });
    }

    if (plan.status !== "active") {
      return res.status(400).json({ success: false, message: "This plan is not available for purchase." });
    }

    // 1. Amount & Price Tampering Protection
    const authoritativePrice = Number(plan.sellingPrice) || 0;
    if (amount !== undefined && Number(amount) !== authoritativePrice) {
      return res.status(400).json({
        success: false,
        code: "AMOUNT_MISMATCH",
        message: `Amount mismatch. Plan selling price is ₹${authoritativePrice}.`
      });
    }

    // 2. Production Payment Integrity Verification
    // Never activate a paid subscription based only on a client request without a real verified gateway in production.
    const isPaidPlan = authoritativePrice > 0;
    const isProduction = process.env.NODE_ENV === "production";
    const isExplicitDevSimulation = !isProduction && (process.env.ALLOW_PAYMENT_SIMULATION === "true" || process.env.ALLOW_PAYMENT_SIMULATION === undefined);

    if (isPaidPlan && !isExplicitDevSimulation) {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "Payment verification required. Real payment gateway verification is required in production."
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // 3. Idempotency Check: Prevent duplicate active subscriptions to the same plan
    const existingActiveSub = await Subscription.findOne({
      studentId: user._id,
      planId: plan._id,
      status: "active",
      expiryDate: { $gt: new Date() }
    });

    if (existingActiveSub) {
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: "You already have an active subscription for this plan.",
        subscriptionId: existingActiveSub.purchaseId,
        expiresAt: existingActiveSub.expiryDate
      });
    }

    // 4. Replay Attack & Duplicate Transaction ID Protection
    let cleanTxnId = null;
    if (gatewayTxnId && typeof gatewayTxnId === "string" && gatewayTxnId.trim()) {
      cleanTxnId = gatewayTxnId.trim();
      const existingTxn = await Subscription.findOne({ gatewayTxnId: cleanTxnId });
      if (existingTxn) {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_TRANSACTION",
          message: "This transaction reference has already been processed."
        });
      }
    }

    // 5. Calculate expiry (starts/restarts from now based strictly on DB plan config)
    const expiryDate = new Date();
    if (plan.durationUnit === "months") {
      expiryDate.setMonth(expiryDate.getMonth() + plan.durationValue);
    } else {
      expiryDate.setDate(expiryDate.getDate() + plan.durationValue);
    }

    // Deactivate older active subscriptions for this student
    await Subscription.updateMany(
      { studentId: user._id, status: "active" },
      { $set: { status: "expired" } }
    );

    // 6. Create Subscription record with verified source metadata
    const purchaseId = `PUR-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const paymentGateway = isPaidPlan ? "phonepe" : "manual";

    const subscription = await Subscription.create({
      studentId: user._id,
      planId: plan._id,
      planNameSnapshot: plan.name,
      purchaseId,
      amount: authoritativePrice,
      currency: plan.currency || "INR",
      maxAITests: plan.maxAITests || 20,
      aiTestsUsed: 0,
      startDate: new Date(),
      expiryDate,
      status: "active",
      paymentGateway,
      gatewayTxnId: cleanTxnId
    });

    // 6.1 Record Unified Purchase Transaction in Central Ledger
    try {
      const { recordTransaction } = require("../services/ledgerService");
      const provenance = !isPaidPlan
        ? "free_access"
        : isExplicitDevSimulation
        ? "dev_simulation"
        : "verified_payment";
      const paymentVerificationStatus = !isPaidPlan
        ? "not_applicable"
        : isExplicitDevSimulation
        ? "simulated"
        : "verified";

      await recordTransaction({
        orderId: purchaseId,
        studentId: user._id,
        itemId: plan._id,
        itemModel: "AiPlan",
        itemTitleSnapshot: plan.name,
        productCategory: "ai_plan",
        amount: authoritativePrice,
        currency: plan.currency || "INR",
        originalPriceSnapshot: plan.originalPrice || authoritativePrice,
        discountSnapshot: (plan.originalPrice && plan.originalPrice > authoritativePrice) ? (plan.originalPrice - authoritativePrice) : 0,
        gateway: !isPaidPlan ? "free_checkout" : paymentGateway,
        gatewayTxnId: cleanTxnId,
        paymentStatus: "paid",
        provenance,
        paymentVerificationStatus,
        paymentTimestamp: new Date(),
        subscriptionId: subscription._id,
        metadata: {
          ip: req.ip,
          maxAITests: plan.maxAITests,
          durationValue: plan.durationValue,
          durationUnit: plan.durationUnit
        }
      });
    } catch (ledgerErr) {
      console.error("Ledger Recording Error (AI Plan Subscription):", ledgerErr);
    }

    // Sync User premium status cache
    user.isPremium = true;
    user.premiumExpiresAt = expiryDate;
    user.activePlan = plan._id;
    await user.save();

    // 7. Audit log with clear distinction between simulation and free tiers
    const logTag = isPaidPlan ? "SIMULATED_AI_PLAN_SUBSCRIPTION" : "FREE_AI_PLAN_ACTIVATION";
    const logPrefix = isPaidPlan ? "[DEV SIMULATION]" : "[FREE PLAN]";
    await logAction(
      logTag,
      user.fullName || "Student",
      `${logPrefix} ${plan.name} (Activated, Purchase ID: ${purchaseId}, Txn: ${cleanTxnId || 'N/A'})`,
      "Purchase",
      req.ip
    );

    // Send in-app notification
    await notifyUser(user._id, {
      type: "PAYMENT_SUCCESS",
      title: "Plan subscription active",
      message: `Your subscription to "${plan.name}" is now active! You can generate AI tests immediately.`,
      link: "/dashboard/create-custom-quiz"
    });

    res.json({
      success: true,
      message: "Plan subscribed successfully!",
      purchaseId,
      expiresAt: expiryDate,
      pending: false
    });
  } catch (error) {
    console.error("Subscribe to AI Plan Error:", error);
    res.status(500).json({ success: false, message: "Failed to subscribe to AI plan.", error: error.message });
  }
};

const getDashboardMetrics = async (req, res) => {
  try {
    const Quiz = require("../models/Quiz");
    const activePlansCount = await AiPlan.countDocuments({ status: "active" });
    const totalSubscribers = await User.countDocuments({ isPremium: true });
    const aiTestsGenerated = await Quiz.countDocuments({
      isDeleted: { $ne: true },
      $or: [
        { isAiGenerated: true },
        { aiSourceType: { $ne: "", $exists: true } },
        { title: { $regex: /^AI Test:/i } }
      ]
    });
    
    // Simple revenue projection from active plans selling prices
    const subscribers = await User.find({ isPremium: true, activePlan: { $ne: null } }).populate("activePlan");
    let activeRevenue = 0;
    subscribers.forEach(sub => {
      if (sub.activePlan) {
        activeRevenue += sub.activePlan.sellingPrice;
      }
    });

    res.json({
      activePlansCount,
      totalSubscribers,
      aiTestsGenerated,
      activeRevenue
    });
  } catch (error) {
    console.error("Get AI Plans Metrics Error:", error);
    res.status(500).json({ message: "Failed to load dashboard metrics.", error: error.message });
  }
};

module.exports = {
  getAiPlans,
  getAiPlanById,
  createAiPlan,
  updateAiPlan,
  updatePlanStatus,
  deleteAiPlan,
  subscribeToPlan,
  getDashboardMetrics
};
