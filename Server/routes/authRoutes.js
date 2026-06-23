const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

const router = express.Router();

// store OTP temporarily (for now in memory) with expiry
// Format: { email: { otp: string, expiresAt: number } }
const otpStore = new Map();

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

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

    // Send OTP email
    await transporter.sendMail({
      from: `Teaching Pariksha <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: "Teaching Pariksha - Password Reset OTP",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
          <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">🎓 Teaching Pariksha</h2>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Password Reset Request</p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 12px; margin-bottom: 8px;">Your OTP Code</p>
              <h1 style="color: #6E3FF3; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          </div>
        </div>
      `,
    });

    res.json({
      message: "OTP sent to your email.",
    });

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

module.exports = router;