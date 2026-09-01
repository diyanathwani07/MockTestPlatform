const User = require("../models/User");
const Subscription = require("../models/Subscription");
const AiPlan = require("../models/AiPlan");

/**
 * Checks and enforces the expiration of a user's premium AI subscription.
 * Uses Subscription as source of truth and syncs to User premium status cache.
 *
 * @param {Object} user - The user document/object to check
 * @returns {Promise<boolean>} True if subscription was expired and flipped to false, false otherwise
 */
async function enforceExpiry(user) {
  if (!user || !user.isPremium || !user.premiumExpiresAt) {
    return false;
  }

  const now = new Date();
  if (new Date(user.premiumExpiresAt) < now) {
    // 1. Update Subscription first atomically
    const expiredSub = await Subscription.findOneAndUpdate(
      {
        studentId: user._id,
        status: "active",
        expiryDate: { $lt: now }
      },
      {
        $set: { status: "expired" }
      },
      {
        new: true
      }
    );

    // 2. Only flip User if that Subscription update found a match
    if (expiredSub) {
      await User.findOneAndUpdate(
        {
          _id: user._id,
          isPremium: true
        },
        {
          $set: { isPremium: false }
        }
      );
      // Update in-memory object
      user.isPremium = false;
      return true;
    } else {
      // Fallback: If Subscription is already not active but User is still flagged as premium, sync them.
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          isPremium: true,
          premiumExpiresAt: { $lt: now }
        },
        {
          $set: { isPremium: false }
        },
        {
          new: true
        }
      );
      if (updatedUser) {
        user.isPremium = false;
        return true;
      }
    }
  }

  return false;
}

/**
 * Automatically backfills and synchronizes any active user subscriptions from the User collection
 * into the Subscription collection so that no legacy or existing active subscriber is missed in
 * Revenue Analytics or AI Subscribers directory.
 */
async function syncLegacySubscriptions() {
  try {
    const usersWithPlan = await User.find({
      $or: [
        { isPremium: true },
        { activePlan: { $ne: null } }
      ]
    });

    const now = new Date();

    for (const user of usersWithPlan) {
      const existingSub = await Subscription.findOne({ studentId: user._id });
      if (!existingSub) {
        let plan = null;
        if (user.activePlan) {
          plan = await AiPlan.findById(user.activePlan);
        }
        if (!plan) {
          plan = await AiPlan.findOne({ status: "active" }).sort({ displayOrder: 1 });
        }

        const expiry = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const isActive = user.isPremium && expiry > now;

        await Subscription.create({
          studentId: user._id,
          planId: plan ? plan._id : null,
          planNameSnapshot: plan ? plan.name : "Premium",
          purchaseId: `PUR-${user._id.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`,
          amount: plan ? (plan.sellingPrice || 0) : 899,
          currency: plan ? (plan.currency || "INR") : "INR",
          aiCreditsGranted: plan ? (plan.aiCredits || 0) : 500,
          startDate: user.updatedAt || user.createdAt || now,
          expiryDate: expiry,
          status: isActive ? "active" : "expired",
          paymentGateway: "phonepe",
          gatewayTxnId: null
        });

        console.log(`[SubscriptionSync] Backfilled subscription record for student: ${user.fullName} (${user.email})`);
      }
    }
  } catch (err) {
    console.error("[SubscriptionSync Error]:", err);
  }
}

module.exports = {
  enforceExpiry,
  syncLegacySubscriptions
};
