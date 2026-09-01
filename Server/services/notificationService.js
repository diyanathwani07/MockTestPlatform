const Notification = require("../models/Notification");
const User = require("../models/User");
const { emitToUser, emitToAdmin, emitToDepartment } = require("./socketService");

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
async function notifyDepartment(department, { type, title, message, link = "", relatedId = null }) {
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

    if (dept.slackWebhookUrl && !dept.slackNotificationsPaused) {
      await sendSlackMessage(dept.slackWebhookUrl, text);
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
