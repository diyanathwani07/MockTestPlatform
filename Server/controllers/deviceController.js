const NotificationDevice = require("../models/NotificationDevice");

// @desc    Register a new device token
// @route   POST /api/devices/register
// @access  Private
const registerDevice = async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token || !platform) {
      return res.status(400).json({ message: "Token and platform are required" });
    }

    // Upsert the device token for this user
    await NotificationDevice.findOneAndUpdate(
      { token },
      { userId: req.user._id, platform, lastActive: Date.now() },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Device registered successfully" });
  } catch (error) {
    console.error("[Device Controller] Register Error:", error);
    res.status(500).json({ message: "Failed to register device" });
  }
};

// @desc    Unregister a device token
// @route   DELETE /api/devices/unregister
// @access  Private
const unregisterDevice = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    await NotificationDevice.findOneAndDelete({ token, userId: req.user._id });
    res.json({ success: true, message: "Device unregistered successfully" });
  } catch (error) {
    console.error("[Device Controller] Unregister Error:", error);
    res.status(500).json({ message: "Failed to unregister device" });
  }
};

module.exports = { registerDevice, unregisterDevice };
