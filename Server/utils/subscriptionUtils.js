const User = require("../models/User");
const Subscription = require("../models/Subscription");

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

module.exports = {
  enforceExpiry
};
