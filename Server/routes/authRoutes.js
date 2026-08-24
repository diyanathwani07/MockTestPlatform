const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

const router = express.Router();

// store OTP temporarily (for now in memory) with expiry
// Format: { email: { otp: string, expiresAt: number } }
const otpStore = new Map();

// REGISTER
router.post("/register", registerUser);

// LOGIN
router.post("/login", loginUser);

// FORGOT PASSWORD (SEND OTP)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "No account found with this email.",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    // Store OTP with email and expiry
    otpStore.set(email, { otp, expiresAt });

    console.log(`OTP for ${email}: ${otp}`); // (for testing/debug)

    try {
      // Send OTP email with timeout protection
      const emailPromise = sendEmail({
        email,
        subject: "Teaching Pariksha - Password Reset OTP",
        message: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
            <div style="background: white; border-radius: 12px; padding: 24px 16px; text-align: center;">
              <div style="margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
                <img src="${req.protocol}://${req.get('host')}/uploads/logo.png" alt="Teaching Pariksha Logo" style="height: 36px; width: auto; vertical-align: middle;" />
              </div>
              <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Password Reset Request</p>
              <div style="background: #f1f5f9; border-radius: 8px; padding: 20px 8px; margin-bottom: 24px;">
                <p style="color: #64748b; font-size: 12px; margin-bottom: 8px;">Your OTP Code</p>
                <h1 style="color: #6E3FF3; font-size: 32px; letter-spacing: 4px; margin: 0; white-space: nowrap; display: inline-block;">${otp}</h1>
              </div>
              <p style="color: #94a3b8; font-size: 12px;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </div>
          </div>
        `
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("SMTP Connection or Send Timeout")), 15000)
      );

      await Promise.race([emailPromise, timeoutPromise]);

      res.json({
        message: "OTP sent to your email.",
      });
    } catch (mailError) {
      console.warn("Mail Send Failed or Timed Out:", mailError.message);
      
      const isProduction = process.env.NODE_ENV === "production" || !process.env.NODE_ENV;
      
      if (isProduction) {
        // Fail-safe: clear the in-memory OTP record since email delivery failed
        otpStore.delete(email);
        return res.status(500).json({
          message: "We couldn't send the reset email right now. Please try again in a few minutes or contact support."
        });
      } else {
        // Dev mode: preserve generated OTP in store, log to console, and send mock response
        console.warn(`[DEV ONLY] SMTP Failed. Use OTP from console to test: ${otp}`);
        return res.json({
          message: "OTP generated. (Development Mode: Check server terminal for OTP)."
        });
      }
    }

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({
      message: "Failed to send OTP. Please try again.",
    });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).json({
        message: "No OTP request found. Please try again.",
      });
    }

    // Check expiry
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({
        message: "OTP expired. Please request a new one.",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP. Please check and try again.",
      });
    }

    // Don't delete yet — we still need it for reset-password step
    res.json({
      message: "OTP verified successfully.",
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const record = otpStore.get(email);

    if (!record || record.otp !== otp) {
      return res.status(400).json({
        message: "Invalid or expired OTP.",
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({
        message: "OTP expired. Please request a new one.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // OTP used, clear it
    otpStore.delete(email);

    res.json({
      message: "Password reset successful! You can now log in.",
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  }
});

// PROTECT MIDDLEWARE
const { protect } = require("../middleware/authMiddleware");

// UPDATE PROFILE
const logAction = require("../utils/logger");

router.put("/profile", protect, async (req, res) => {
  try {
    const { fullName, phone, dateOfBirth, gender, location, bio, avatar } = req.body;
    
    // req.user is set by the protect middleware
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const changedFields = [];
    if (fullName !== undefined && fullName !== user.fullName) {
      changedFields.push(`name: "${user.fullName}" -> "${fullName}"`);
      user.fullName = fullName;
    }
    if (phone !== undefined && phone !== user.phone) {
      changedFields.push(`phone: "${user.phone}" -> "${phone}"`);
      user.phone = phone;
    }
    if (dateOfBirth !== undefined && dateOfBirth !== user.dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender !== undefined && gender !== user.gender) user.gender = gender;
    if (location !== undefined && location !== user.location) user.location = location;
    if (bio !== undefined && bio !== user.bio) user.bio = bio;
    if (avatar !== undefined && avatar !== user.avatar) {
      changedFields.push("profile picture updated");
      user.avatar = avatar;
      user.profilePicture = avatar;
    }

    const updatedUser = await user.save();

    if (changedFields.length > 0) {
      await logAction(
        "UPDATE_PROFILE", 
        updatedUser.fullName, 
        `Updated profile fields: ${changedFields.join(", ")}`, 
        "UserManagement", 
        req.ip
      );
    }
    
    res.json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
      location: updatedUser.location,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      profilePicture: updatedUser.profilePicture,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// CHANGE PASSWORD
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await logAction(
      "CHANGE_PASSWORD", 
      user.fullName, 
      "Updated password successfully", 
      "UserManagement", 
      req.ip
    );

    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ message: "Failed to change password." });
  }
});

module.exports = router;