const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const User = require("../models/User");
const nodemailer = require("nodemailer");

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

// GET all users (admin only)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});

// DELETE a user (admin only)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Failed to delete user." });
  }
});

// UPDATE user (admin only)
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { fullName, email, role, status } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    user.fullName = fullName || user.fullName;
    user.email = email || user.email;
    user.role = role || user.role;
    user.status = status || user.status;
    
    await user.save();
    res.json({ message: "User updated successfully.", user });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: "Failed to update user." });
  }
});

// UPDATE user status (admin only)
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    user.status = status;
    await user.save();
    res.json({ message: `User status updated to ${status}.` });
  } catch (error) {
    console.error("Update User Status Error:", error);
    res.status(500).json({ message: "Failed to update user status." });
  }
});

// UPDATE user role (admin only)
router.put("/:id/role", protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    user.role = role;
    await user.save();
    res.json({ message: `User role updated to ${role}.` });
  } catch (error) {
    console.error("Update User Role Error:", error);
    res.status(500).json({ message: "Failed to update user role." });
  }
});

// SEND password reset email (admin only)
router.post("/:id/reset-password", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    // Send a standard notification email since OTP is usually user-initiated.
    // In a real app we'd send a reset link with a token, but for this mock we'll
    // inform the user that the admin triggered a password reset.
    // We can just generate a random password, hash it, update it, and send it.
    // Wait, the prompt says "Send a password reset email." We'll just generate a temporary one.
    const tempPassword = Math.random().toString(36).slice(-8);
    const bcrypt = require("bcryptjs");
    user.password = await bcrypt.hash(tempPassword, 10);
    await user.save();
    
    await transporter.sendMail({
      from: \`Teaching Pariksha <\${process.env.SMTP_EMAIL}>\`,
      to: user.email,
      subject: "Teaching Pariksha - Account Password Reset",
      html: \`
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
          <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">🎓 Teaching Pariksha</h2>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Your password has been reset by an administrator.</p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 12px; margin-bottom: 8px;">Your Temporary Password</p>
              <h2 style="color: #6E3FF3; font-size: 24px; letter-spacing: 2px; margin: 0;">\${tempPassword}</h2>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">Please log in with this password and change it immediately from your profile.</p>
          </div>
        </div>
      \`,
    });

    res.json({ message: "Password reset email sent to the user." });
  } catch (error) {
    console.error("Send Reset Email Error:", error);
    res.status(500).json({ message: "Failed to send reset email." });
  }
});

module.exports = router;