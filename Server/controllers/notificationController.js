const Notification = require("../models/Notification");
const User = require("../models/User");
const NotificationDevice = require("../models/NotificationDevice");
const notificationService = require("../services/notificationService");
const { emitToUser } = require("../services/socketService");
const logAction = require("../utils/logger");
const mongoose = require("mongoose");

const DB_BATCH_SIZE = 500;

const validateDestinationLink = (link) => {
  if (!link || typeof link !== "string" || link.trim() === "") {
    return { isValid: true, sanitized: "" };
  }
  const trimmed = link.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return { isValid: false, error: "Destination link must be an internal path starting with a single '/' (e.g. /dashboard/exams)." };
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return { isValid: false, error: "External URLs and protocol schemes are not allowed." };
  }
  if (/[\r\n\t\0<>"']/.test(trimmed)) {
    return { isValid: false, error: "Destination link contains invalid characters." };
  }
  return { isValid: true, sanitized: trimmed };
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

// @desc    Get user's notifications (paginated) + unreadCount
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ userId: req.user._id });
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.json({
      notifications,
      unreadCount,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total
    });
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ message: "Failed to retrieve notifications." });
  }
};

// @desc    Mark a specific notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to access this notification." });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    console.error("Mark Notification as Read Error:", error);
    res.status(500).json({ message: "Failed to update notification." });
  }
};

// @desc    Mark all unread notifications of the current user as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    console.error("Mark All Notifications as Read Error:", error);
    res.status(500).json({ message: "Failed to mark all notifications as read." });
  }
};

// @desc    Admin: Send manual push notification to single, selected, or all students
// @route   POST /api/notifications/admin/send
// @access  Private (Internal staff with manage_notifications permission or Super Admin)
const adminSendPush = async (req, res) => {
  try {
    const { targetAudience, targetUserIds, targetUserId, title, message, link } = req.body;

    // 1. Audience validation
    if (!targetAudience || !["single", "selected", "all"].includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: "Invalid target audience. Must be 'single', 'selected', or 'all'."
      });
    }

    // 2. Title validation (required, max 100)
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Notification title is required." });
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length > 100) {
      return res.status(400).json({ success: false, message: "Notification title cannot exceed 100 characters." });
    }

    // 3. Message validation (required, max 500)
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Notification message is required." });
    }
    const cleanMessage = message.trim();
    if (cleanMessage.length > 500) {
      return res.status(400).json({ success: false, message: "Notification message cannot exceed 500 characters." });
    }

    // 4. Link validation (optional)
    const linkValidation = validateDestinationLink(link);
    if (!linkValidation.isValid) {
      return res.status(400).json({ success: false, message: linkValidation.error });
    }
    const cleanLink = linkValidation.sanitized;

    // 5. Target Recipients Resolution & Validation
    let recipients = [];

    if (targetAudience === "single") {
      const recipientId = targetUserId || (Array.isArray(targetUserIds) ? targetUserIds[0] : targetUserIds);
      if (!recipientId || !isValidObjectId(recipientId)) {
        return res.status(400).json({ success: false, message: "A valid student recipient ID is required for single audience." });
      }
      const student = await User.findOne({ _id: recipientId, role: "user", isDeleted: { $ne: true } })
        .select("_id fullName name email notificationPreferences status")
        .lean();
      if (!student) {
        return res.status(404).json({ success: false, message: "Selected student was not found or is inactive." });
      }
      recipients = [student];
    } else if (targetAudience === "selected") {
      let rawIds = targetUserIds;
      if (typeof rawIds === "string") {
        rawIds = rawIds.split(",").map(id => id.trim()).filter(Boolean);
      }
      if (!Array.isArray(rawIds) || rawIds.length === 0) {
        return res.status(400).json({ success: false, message: "At least one student must be selected." });
      }
      // Validate all IDs
      const invalidIds = rawIds.filter(id => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: `Invalid recipient ID format detected: ${invalidIds.slice(0, 3).join(", ")}` });
      }
      const uniqueIds = Array.from(new Set(rawIds));
      recipients = await User.find({ _id: { $in: uniqueIds }, role: "user", isDeleted: { $ne: true } })
        .select("_id fullName name email notificationPreferences status")
        .lean();
      if (recipients.length === 0) {
        return res.status(404).json({ success: false, message: "No active eligible students found for the selected IDs." });
      }
    } else if (targetAudience === "all") {
      recipients = await User.find({ role: "user", isDeleted: { $ne: true } })
        .select("_id fullName name email notificationPreferences status")
        .lean();
      if (recipients.length === 0) {
        return res.status(404).json({ success: false, message: "No active enrolled students found on the platform." });
      }
    }

    // 6. Filter by push preference (push !== false)
    const enabledRecipients = recipients.filter(u => u.notificationPreferences?.push !== false);
    const enabledUserIds = enabledRecipients.map(u => u._id);

    // 7. Create in-app Notification records for all target recipients
    const notificationsToInsert = recipients.map(r => ({
      userId: r._id,
      type: "ADMIN_BROADCAST",
      title: cleanTitle,
      message: cleanMessage,
      link: cleanLink,
      isRead: false
    }));

    let insertedNotifications = [];
    for (let i = 0; i < notificationsToInsert.length; i += DB_BATCH_SIZE) {
      const batch = notificationsToInsert.slice(i, i + DB_BATCH_SIZE);
      const inserted = await Notification.insertMany(batch, { ordered: false });
      insertedNotifications.push(...inserted);

      // Real-time WebSocket emission
      inserted.forEach(n => {
        emitToUser(n.userId, "notification", n);
      });
    }

    // 8. Dispatch FCM Push Notifications
    let fcmStats = {
      tokensTargeted: 0,
      successCount: 0,
      failureCount: 0,
      cleanedTokensCount: 0
    };

    if (enabledUserIds.length > 0) {
      fcmStats = await notificationService.sendFcmPush(enabledUserIds, cleanTitle, cleanMessage, cleanLink);
    }

    // 9. Audit Logging
    await logAction(
      "ADMIN_BROADCAST_PUSH",
      req.user.fullName || "Admin",
      `Sent "${cleanTitle}" to ${targetAudience} (${recipients.length} recipients, ${fcmStats.tokensTargeted} devices)`,
      "Push Notifications",
      req.ip
    );

    return res.status(200).json({
      success: true,
      targetAudience,
      totalRecipients: recipients.length,
      enabledRecipients: enabledUserIds.length,
      deviceTokensFound: fcmStats.tokensTargeted || 0,
      fcmAccepted: fcmStats.successCount || 0,
      fcmFailed: fcmStats.failureCount || 0,
      cleanedTokensCount: fcmStats.cleanedTokensCount || 0,
      inAppNotificationsCreated: insertedNotifications.length,
      message: (fcmStats.tokensTargeted || 0) > 0
        ? (fcmStats.failureCount === 0
            ? `Push notification accepted by Firebase for all ${fcmStats.tokensTargeted} registered device token(s).`
            : `Push notification accepted by Firebase for ${fcmStats.successCount} device(s); ${fcmStats.failureCount} failed.`)
        : "In-app notifications created successfully. Note: No active registered FCM device tokens were found for the selected recipient(s)."
    });
  } catch (error) {
    console.error("[NotificationController] Admin Send Push Error:", error);
    res.status(500).json({ success: false, message: "Failed to dispatch push notification", error: error.message });
  }
};

// @desc    Admin: Send test push notification strictly to the authenticated admin's registered devices
// @route   POST /api/notifications/admin/test-my-device
// @access  Private (Internal staff with manage_notifications permission or Super Admin)
const adminTestMyDevice = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { title, message, link } = req.body;

    const cleanTitle = (typeof title === "string" && title.trim())
      ? title.trim().slice(0, 100)
      : "PrepMark Test Push Notification";

    const cleanMessage = (typeof message === "string" && message.trim())
      ? message.trim().slice(0, 500)
      : "This is a test notification verifying your device is receiving push alerts.";

    const linkValidation = validateDestinationLink(link || "/dashboard");
    const cleanLink = linkValidation.isValid ? linkValidation.sanitized : "/dashboard";

    // 1. Check registered device tokens strictly for this authenticated admin
    const devices = await NotificationDevice.find({ userId: adminId }).select("token platform lastActive");
    if (!devices || devices.length === 0) {
      return res.status(200).json({
        success: false,
        deviceTokensFound: 0,
        fcmAccepted: 0,
        fcmFailed: 0,
        message: "No registered push notification devices found for your admin account. Please enable notifications in your browser or log in via the Android mobile app to register this device."
      });
    }

    // 2. Dispatch test push via sendFcmPush
    const fcmStats = await notificationService.sendFcmPush([adminId], cleanTitle, cleanMessage, cleanLink);

    // 3. Create test in-app notification record
    const testNotification = await Notification.create({
      userId: adminId,
      type: "ADMIN_BROADCAST",
      title: cleanTitle,
      message: cleanMessage,
      link: cleanLink,
      isRead: false
    });
    emitToUser(adminId, "notification", testNotification);

    const isAccepted = (fcmStats.successCount || 0) > 0;

    return res.status(200).json({
      success: isAccepted,
      deviceTokensFound: fcmStats.tokensTargeted || devices.length,
      fcmAccepted: fcmStats.successCount || 0,
      fcmFailed: fcmStats.failureCount || 0,
      cleanedTokensCount: fcmStats.cleanedTokensCount || 0,
      message: isAccepted
        ? `Test notification successfully accepted by Firebase for ${fcmStats.successCount} registered device(s).`
        : "Firebase failed to accept the test push notification. Please check server FCM credentials."
    });
  } catch (error) {
    console.error("[NotificationController] Test My Device Error:", error);
    res.status(500).json({ success: false, message: "Failed to dispatch test notification", error: error.message });
  }
};

// @desc    Admin: Retrieve candidate students with registered device statistics
// @route   GET /api/notifications/admin/users
// @access  Private (Internal staff with manage_notifications permission or Super Admin)
const getPushCandidates = async (req, res) => {
  try {
    const { search = "", limit = 100 } = req.query;

    const query = { role: "user", isDeleted: { $ne: true } };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ fullName: regex }, { name: regex }, { email: regex }, { phone: regex }];
    }

    const totalEnrolledStudents = await User.countDocuments({ role: "user", isDeleted: { $ne: true } });
    const maxLimit = limit === "all" ? 1000 : (Number(limit) || 100);

    const users = await User.find(query)
      .select("fullName name email phone role avatar notificationPreferences createdAt")
      .sort({ createdAt: -1 })
      .limit(maxLimit)
      .lean();

    const userIds = users.map(u => u._id);
    const devices = await NotificationDevice.find({ userId: { $in: userIds } })
      .select("userId platform token lastActive createdAt")
      .lean();

    const deviceMap = {};
    devices.forEach(d => {
      const uid = d.userId.toString();
      if (!deviceMap[uid]) deviceMap[uid] = [];
      deviceMap[uid].push(d);
    });

    const candidates = users.map(u => {
      const userDevs = deviceMap[u._id.toString()] || [];
      const hasAndroid = userDevs.some(d => d.platform === "android");
      const hasIos = userDevs.some(d => d.platform === "ios");
      const hasWeb = userDevs.some(d => d.platform === "web");
      return {
        ...u,
        devicesCount: userDevs.length,
        hasAndroid,
        hasIos,
        hasWeb,
        pushEnabled: u.notificationPreferences?.push !== false,
        deviceSummary: hasAndroid
          ? "Android (FCM Ready)"
          : hasWeb
          ? "Web Browser"
          : userDevs.length > 0
          ? `${userDevs.length} Device(s)`
          : "No device registered"
      };
    });

    res.json({
      success: true,
      count: candidates.length,
      totalEnrolledStudents,
      data: candidates
    });
  } catch (error) {
    console.error("[NotificationController] Get Push Candidates Error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve student candidates." });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  adminSendPush,
  adminTestMyDevice,
  getPushCandidates,
  validateDestinationLink
};
