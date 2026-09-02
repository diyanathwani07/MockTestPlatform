const AiPlan = require("../models/AiPlan");

// GET all AI plans
// Admin can see draft/inactive, students only see active
const getAiPlans = async (req, res) => {
  try {
    const query = {};
    // If not admin, restrict to active status
    const isStaff = req.user && ["admin", "superadmin", "manager", "employee"].includes(req.user.role);
    if (!isStaff) {
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
      aiCredits,
      maxAITests,
      features,
      allowedExamIds,
      isFeatured,
      status,
      displayOrder
    } = req.body;

    if (!name || originalPrice === undefined || sellingPrice === undefined || !durationValue || !aiCredits) {
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
      aiCredits,
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
      aiCredits,
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
    plan.aiCredits = aiCredits !== undefined ? aiCredits : plan.aiCredits;
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

// SUBSCRIBE/unlock a plan (Simulated payment callback flow)
const subscribeToPlan = async (req, res) => {
  try {
    const { planId, gatewayTxnId } = req.body;
    if (!planId) {
      return res.status(400).json({ message: "planId is required." });
    }

    const plan = await AiPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: "AI Plan not found." });
    }

    if (plan.status !== "active") {
      return res.status(400).json({ message: "This plan is not available for purchase." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Calculate expiry (starts/restarts from now)
    const expiryDate = new Date();
    if (plan.durationUnit === "months") {
      expiryDate.setMonth(expiryDate.getMonth() + plan.durationValue);
    } else {
      expiryDate.setDate(expiryDate.getDate() + plan.durationValue);
    }

    // Create Subscription record
    const purchaseId = `PUR-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    await Subscription.create({
      studentId: user._id,
      planId: plan._id,
      planNameSnapshot: plan.name,
      purchaseId,
      amount: plan.sellingPrice || 0,
      currency: plan.currency || "INR",
      aiCreditsGranted: plan.aiCredits || 0,
      startDate: new Date(),
      expiryDate,
      status: "pending_payment",
      paymentGateway: "phonepe", // Matches the gateway currently used
      gatewayTxnId: gatewayTxnId || null
    });

    // Audit logs including purchaseId
    await logAction("SUBSCRIBE_AI_PLAN_PENDING", user.fullName, `${plan.name} (Requested, Purchase ID: ${purchaseId})`, "Purchase", req.ip);

    // Send in-app notification
    await notifyUser(user._id, {
      type: "PAYMENT_PENDING",
      title: "Plan purchase initiated",
      message: `Your request to subscribe to "${plan.name}" has been recorded and is pending confirmation.`,
      link: "/dashboard/pricing"
    });

    res.json({
      message: "Order created and awaiting confirmation.",
      success: true,
      pending: true
    });
  } catch (error) {
    console.error("Subscribe to AI Plan Error:", error);
    res.status(500).json({ message: "Failed to subscribe to AI plan.", error: error.message });
  }
};

const getDashboardMetrics = async (req, res) => {
  try {
    const Quiz = require("../models/Quiz");
    const activePlansCount = await AiPlan.countDocuments({ status: "active" });
    const totalSubscribers = await User.countDocuments({ isPremium: true });
    const aiTestsGenerated = await Quiz.countDocuments({ aiSourceType: { $ne: "", $exists: true } });
    
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
