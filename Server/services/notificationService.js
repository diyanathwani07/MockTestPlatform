const Notification = require("../models/Notification");
const User = require("../models/User");
const NotificationDevice = require("../models/NotificationDevice");
const { emitToUser, emitToAdmin, emitToDepartment } = require("./socketService");
const { admin } = require("../config/firebaseAdmin");

async function sendFcmPush(userIds, title, message, link) {
  try {
    const devices = await NotificationDevice.find({ userId: { $in: userIds } });
    if (devices.length === 0) return;

    const tokens = devices.map(d => d.token);
    if (tokens.length === 0) return;

    const payload = {
      notification: { title, body: message },
      data: { link: link || "/" }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: payload.notification,
      data: payload.data
    });

    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === 'messaging/invalid-registration-token' || errorCode === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
          }
        }
      });
      if (failedTokens.length > 0) {
        await NotificationDevice.deleteMany({ token: { $in: failedTokens } });
      }
    }
  } catch (error) {
    console.error("[FCM Push] Error:", error.message);
  }
}


/**
 * Creates and saves an in-app notification for a single user, then emits a real-time event.
 * Wrapped in try/catch to prevent errors from blocking main controller operations.
 */
async function notifyUser(userId, { type, title, message, link = "", relatedId = null }) {
  try {
    if (!userId) return null;
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
      relatedId
    });

    // Real-time WebSocket delivery
    emitToUser(userId, "notification", notification);

    // FCM Push
    const user = await User.findById(userId).select("notificationPreferences");
    if (!user || user.notificationPreferences?.push !== false) {
      await sendFcmPush([userId], title, message, link);
    }

    return notification;
  } catch (error) {
    console.error(`[NotificationService] Failed to notify user ${userId}:`, error);
    return null;
  }
}

/**
 * Bulk inserts an in-app notification for all active students, then emits real-time events.
 * Wrapped in try/catch to ensure reliability.
 */
async function notifyAllStudents({ type, title, message, link = "", relatedId = null }) {
  try {
    const activeStudents = await User.find({ role: "user", status: "Active", isDeleted: { $ne: true } }).select("_id");
    if (activeStudents.length === 0) return [];

    const notificationsToInsert = activeStudents.map(student => ({
      userId: student._id,
      type,
      title,
      message,
      link,
      relatedId
    }));

    const result = await Notification.insertMany(notificationsToInsert, { ordered: false });

    // Real-time WebSocket delivery to all active students
    result.forEach(n => {
      emitToUser(n.userId, "notification", n);
    });

    // FCM Push for students who have it enabled
    const enabledStudents = await User.find({ _id: { $in: activeStudents.map(s => s._id) }, 'notificationPreferences.push': { $ne: false } }).select("_id");
    const enabledIds = enabledStudents.map(s => s._id);
    if (enabledIds.length > 0) {
      await sendFcmPush(enabledIds, title, message, link);
    }

    return result;
  } catch (error) {
    console.error("[NotificationService] Failed to bulk-notify students:", error);
    return [];
  }
}

/**
 * Bulk inserts an in-app notification for all active managers/employees in a specific department, then emits real-time events.
 * Wrapped in try/catch to ensure reliability.
 */
async function notifyDepartment(department, { type, title, message, link = "", relatedId = null, slackBlocks = null }) {
  try {
    const staff = await User.find({ 
      department, 
      role: { $in: ["manager", "employee", "admin", "superadmin"] }, 
      status: "Active", 
      isDeleted: { $ne: true } 
    }).select("_id");
    
    if (staff.length === 0) return [];

    const notificationsToInsert = staff.map(user => ({
      userId: user._id,
      type,
      title,
      message,
      link,
      relatedId
    }));

    const result = await Notification.insertMany(notificationsToInsert, { ordered: false });

    // Real-time delivery to each user & the department room
    result.forEach(n => {
      emitToUser(n.userId, "notification", n);
    });
    emitToDepartment(department, "notification", {
      type,
      title,
      message,
      link,
      relatedId,
      department,
      createdAt: new Date()
    });

    // --- NEW: Send Slack Notification ---
    try {
      const Department = require("../models/Department");
      const { sendSlackMessage } = require("./slackService");
      const logAction = require("../utils/logger");
      
      await logAction("SLACK_DEBUG", "System", `Starting Slack logic for dept: ${department}`, "Support", "127.0.0.1");

      const deptDoc = await Department.findOne({ name: department });
      const targetChannel = (deptDoc && deptDoc.slackChannelId) ? deptDoc.slackChannelId : process.env.SLACK_CHANNEL_ID;
      const isPaused = deptDoc ? deptDoc.slackNotificationsPaused : false;

      if (targetChannel && !isPaused) {
        let slackText = `*${title}*\n${message}`;
        if (link) {
          slackText += `\n<${process.env.FRONTEND_URL || "https://mocktestplatform-lac.vercel.app"}${link}|View Details>`;
        }
        
        await logAction("SLACK_DEBUG", "System", `Sending ticket notification to channel: ${targetChannel}`, "Support", "127.0.0.1");
        
        const slackRes = await sendSlackMessage(targetChannel, slackText, slackBlocks);
        
        await logAction("SLACK_DEBUG", "System", `Slack notification delivered successfully`, "Support", "127.0.0.1");
      } else {
        await logAction("SLACK_DEBUG", "System", `Slack notification skipped. Channel: ${targetChannel || 'none'}, Paused: ${isPaused}`, "Support", "127.0.0.1");
      }
    } catch (slackErr) {
      const logAction = require("../utils/logger");
      await logAction("SLACK_ERROR", "System", `Error: ${slackErr.message}`, "Support", "127.0.0.1");
    }

    return result;
  } catch (error) {
    console.error(`[NotificationService] Failed to notify department ${department}:`, error);
    return [];
  }
}

async function notifyContentTeamSlack(text) {
  try {
    const Department = require("../models/Department");
    const { sendSlackMessage } = require("./slackService");

    const dept = await Department.findOne({ name: "Content Team" });
    if (!dept) {
      console.warn("[NotificationService] 'Content Team' department not found for Slack notification.");
      return;
    }

    if (dept.slackChannelId && !dept.slackNotificationsPaused) {
      await sendSlackMessage(dept.slackChannelId, text);
    } else if (process.env.SLACK_CHANNEL_ID) {
      await sendSlackMessage(process.env.SLACK_CHANNEL_ID, text);
    }
  } catch (error) {
    console.error("[NotificationService] Failed to send Slack notification to Content Team:", error);
  }
}

module.exports = {
  notifyUser,
  notifyAllStudents,
  notifyDepartment,
  notifyContentTeamSlack
};
