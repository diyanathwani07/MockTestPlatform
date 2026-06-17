const express = require("express");
const User = require("../models/User");

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

const router = express.Router();

// store OTP temporarily (for now in memory)
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
        message: "User not found",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with email
    otpStore.set(email, otp);

    console.log(`OTP for ${email}: ${otp}`); // (for testing)

    // TODO: send email using nodemailer (later)

    res.json({
      message: "OTP sent successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
      return res.status(400).json({
        message: "OTP expired or not found",
      });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    otpStore.delete(email);

    res.json({
      message: "OTP verified successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // update password (IMPORTANT: hash in real project)
    user.password = newPassword;
    await user.save();

    res.json({
      message: "Password reset successful",
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;