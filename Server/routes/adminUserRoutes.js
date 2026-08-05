const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { adminOnly, superAdminOnly } = require("../middleware/adminMiddleware");
const User = require("../models/User");
const logAction = require("../utils/logger");
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
    const users = await User.find({ isDeleted: { $ne: true } }).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});

// CREATE a new user (superadmin only)
router.post("/", protect, superAdminOnly, async (req, res) => {
  try {
    const { fullName, email, phone, role, password, department, permissions, receiveMonthlyAuditReport } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password || "TempPass123!", 10);

    const user = await User.create({
      fullName,
      email,
      phone: phone || "",
      role: role || "user",
      password: hashedPassword,
      status: "Active",
      department: (role === "admin" || role === "superadmin") ? (department || null) : null,
      permissions: (role === "admin" || role === "superadmin") ? (permissions || []) : [],
      receiveMonthlyAuditReport: (role === "superadmin") ? (!!receiveMonthlyAuditReport) : false
    });

    await logAction("CREATE_USER", req.user?.fullName || "Admin", `Created new user: ${user.fullName} (${user.email}) as ${user.role}`, "UserManagement", req.ip);
    res.status(201).json({ message: "User created successfully.", user });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({ message: "Failed to create user." });
  }
});

// DELETE a user (superadmin only)
router.delete("/:id", protect, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    user.isDeleted = true;
    await user.save();
    await logAction("DELETE_USER", req.user?.fullName || "Admin", `Soft-deleted user: ${user.fullName} (${user.email})`, "UserManagement", req.ip);
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Failed to delete user." });
  }
});

// UPDATE user (superadmin only)
router.put("/:id", protect, superAdminOnly, async (req, res) => {
  try {
    const { fullName, email, role, status, department, permissions, receiveMonthlyAuditReport } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    user.fullName = fullName !== undefined ? fullName : user.fullName;
    user.email = email !== undefined ? email : user.email;
    user.role = role !== undefined ? role : user.role;
    user.status = status !== undefined ? status : user.status;
    user.department = department !== undefined ? (department === "" ? null : department) : user.department;
    user.permissions = permissions !== undefined ? permissions : user.permissions;
    user.receiveMonthlyAuditReport = receiveMonthlyAuditReport !== undefined ? receiveMonthlyAuditReport : user.receiveMonthlyAuditReport;
    
    await user.save();
    await logAction("UPDATE_USER", req.user?.fullName || "Admin", `Updated user details: ${user.fullName} (${user.email}) - Role: ${user.role}, Dept: ${user.department}`, "UserManagement", req.ip);
    res.json({ message: "User updated successfully.", user });
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ message: "Failed to update user." });
  }
});

// UPDATE user status (superadmin only)
router.put("/:id/status", protect, superAdminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    user.status = status;
    await user.save();
    await logAction("UPDATE_USER_STATUS", req.user?.fullName || "Admin", `Changed status to ${status} for user: ${user.fullName} (${user.email})`, "UserManagement", req.ip);
    res.json({ message: `User status updated to ${status}.` });
  } catch (error) {
    console.error("Update User Status Error:", error);
    res.status(500).json({ message: "Failed to update user status." });
  }
});

// UPDATE user role (superadmin only)
router.put("/:id/role", protect, superAdminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
    user.role = role;
    await user.save();
    await logAction("UPDATE_USER_ROLE", req.user?.fullName || "Admin", `Changed role to ${role} for user: ${user.fullName} (${user.email})`, "UserManagement", req.ip);
    res.json({ message: `User role updated to ${role}.` });
  } catch (error) {
    console.error("Update User Role Error:", error);
    res.status(500).json({ message: "Failed to update user role." });
  }
});

// SEND password reset email (superadmin only)
router.post("/:id/reset-password", protect, superAdminOnly, async (req, res) => {
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
      from: `Teaching Pariksha <${process.env.SMTP_EMAIL}>`,
      to: user.email,
      subject: "Teaching Pariksha - Account Password Reset",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
          <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">🎓 Teaching Pariksha</h2>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Your password has been reset by an administrator.</p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 12px; margin-bottom: 8px;">Your Temporary Password</p>
              <h2 style="color: #6E3FF3; font-size: 24px; letter-spacing: 2px; margin: 0;">${tempPassword}</h2>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">Please log in with this password and change it immediately from your profile.</p>
          </div>
        </div>
      `,
    });

    await logAction("RESET_USER_PASSWORD", req.user?.fullName || "Admin", `Triggered password reset for user: ${user.fullName} (${user.email})`, "UserManagement", req.ip);
    res.json({ message: "Password reset email sent to the user." });
  } catch (error) {
    console.error("Send Reset Email Error:", error);
    res.status(500).json({ message: "Failed to send reset email." });
  }
});

// GET all deleted users (superadmin only)
router.get("/deleted", protect, superAdminOnly, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: true }).select("-password").sort({ updatedAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Get Deleted Users Error:", error);
    res.status(500).json({ message: "Failed to fetch deleted users." });
  }
});

// RESTORE a deleted user (superadmin only)
router.put("/:id/restore", protect, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    user.isDeleted = false;
    await user.save();
    await logAction("RESTORE_USER", req.user?.fullName || "Admin", `Restored user: ${user.fullName} (${user.email})`, "UserManagement", req.ip);
    res.json({ message: "User restored successfully.", user });
  } catch (error) {
    console.error("Restore User Error:", error);
    res.status(500).json({ message: "Failed to restore user." });
  }
});

module.exports = router;