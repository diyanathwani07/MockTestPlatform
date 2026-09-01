const cron = require("node-cron");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const { notifyUser } = require("./notificationService");
const logAction = require("../utils/logger");

function startSubscriptionExpiryCron() {
  // Run daily at 00:15 server time
  cron.schedule("15 0 * * *", async () => {
    console.log("[Subscription Cron] Running nightly subscription expiry sweep...");
    try {
      const now = new Date();
      
      // Find all subscriptions that are expired
      const expiredSubs = await Subscription.find({
        status: "active",
        expiryDate: { $lt: now }
      });

      if (expiredSubs.length === 0) {
        console.log("[Subscription Cron] No expired subscriptions found.");
        return;
      }

      const studentIdsToFlip = expiredSubs.map(sub => sub.studentId);

      // 1. Bulk-update expired Subscription rows first
      await Subscription.updateMany(
        {
          _id: { $in: expiredSubs.map(sub => sub._id) }
        },
        {
          $set: { status: "expired" }
        }
      );

      // 2. Sync corresponding Users (isPremium=false)
      const updateResult = await User.updateMany(
        {
          _id: { $in: studentIdsToFlip },
          isPremium: true
        },
        {
          $set: { isPremium: false }
        }
      );

      const expiredCount = expiredSubs.length;

      // 3. Send notifications
      for (const studentId of studentIdsToFlip) {
        try {
          await notifyUser(studentId, {
            type: "SUBSCRIPTION_EXPIRED",
            title: "Your AI plan has expired",
            message: "Renew to keep using AI Test Builder.",
            link: "/pricing"
          });
        } catch (err) {
          console.error(`[Subscription Cron] Failed to send notification to user ${studentId}:`, err);
        }
      }

      if (expiredCount > 0) {
        await logAction(
          "AUTO_EXPIRE_SUBSCRIPTIONS",
          "System Cron",
          `Auto-expired ${expiredCount} premium subscriptions`,
          "AI Plans",
          "127.0.0.1"
        );
      }
      console.log(`[Subscription Cron] Expiry sweep completed. Expired ${expiredCount} subscriptions.`);
    } catch (error) {
      console.error("[Subscription Cron] Expiry sweep error:", error);
    }
  });
  console.log("[Subscription Cron] Daily subscription expiry cron scheduled at 00:15.");
}

module.exports = {
  startSubscriptionExpiryCron
};
