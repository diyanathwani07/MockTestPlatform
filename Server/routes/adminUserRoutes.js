const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { adminOnly, superAdminOnly } = require("../middleware/adminMiddleware");
const User = require("../models/User");
const logAction = require("../utils/logger");
const sendEmail = require("../utils/sendEmail");

// GET all users (admin only)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: { $ne: true } })
      .select("-password")
      .populate("purchasedExams", "title subject price")
      .populate("purchasedPractice", "title subject price")
      .sort({ createdAt: -1 });
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

    const isStaff = ["admin", "superadmin", "manager", "employee"].includes(role);

    const user = await User.create({
      fullName,
      email,
      phone: phone || "",
      role: role || "user",
      password: hashedPassword,
      status: "Active",
      department: isStaff ? (department || null) : null,
      permissions: isStaff ? (permissions || []) : [],
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
    
    const isStaff = ["admin", "superadmin", "manager", "employee"].includes(role !== undefined ? role : user.role);

    user.fullName = fullName !== undefined ? fullName : user.fullName;
    user.email = email !== undefined ? email : user.email;
    user.role = role !== undefined ? role : user.role;
    user.status = status !== undefined ? status : user.status;
    user.department = department !== undefined ? (isStaff ? (department === "" ? null : department) : null) : (isStaff ? user.department : null);
    user.permissions = permissions !== undefined ? (isStaff ? permissions : []) : (isStaff ? user.permissions : []);
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
    
    await sendEmail({
      email: user.email,
      subject: "Teaching Pariksha - Account Password Reset",
      message: `
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

// UPDATE user's AI subscription plan (adminOnly)
router.put("/:id/ai-subscription", protect, adminOnly, async (req, res) => {
  try {
    const { action, planId } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const Subscription = require("../models/Subscription");

    if (action === "cancel") {
      // Cancel any active subscriptions
      await Subscription.updateMany(
        { studentId: user._id, status: "active" },
        { $set: { status: "cancelled" } }
      );

      user.isPremium = false;
      user.activePlan = null;
      user.premiumExpiresAt = null;
      await user.save();
      await logAction("CANCEL_USER_AI_PLAN", req.user?.fullName || "Admin", `Cancelled AI plan for user: ${user.fullName} (${user.email})`, "UserManagement", req.ip);
      return res.json({ message: "AI plan subscription cancelled successfully." });
    }

    if (action === "upgrade") {
      const AiPlan = require("../models/AiPlan");
      const plan = await AiPlan.findById(planId);
      if (!plan) {
        return res.status(404).json({ message: "AI Plan not found." });
      }

      // Calculate expiry
      const expiryDate = new Date();
      if (plan.durationUnit === "months") {
        expiryDate.setMonth(expiryDate.getMonth() + plan.durationValue);
      } else {
        expiryDate.setDate(expiryDate.getDate() + plan.durationValue);
      }

      // Cancel any existing active subscriptions
      await Subscription.updateMany(
        { studentId: user._id, status: "active" },
        { $set: { status: "cancelled" } }
      );

      // Create new admin_grant subscription
      const crypto = require("crypto");
      const purchaseId = `PUR-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      await Subscription.create({
        studentId: user._id,
        planId: plan._id,
        planNameSnapshot: plan.name,
        purchaseId,
        amount: plan.sellingPrice || 0,
        currency: plan.currency || "INR",
        aiCreditsGranted: plan.aiCredits || 0,
        startDate: new Date(),
        expiryDate,
        status: "active",
        paymentGateway: "admin_grant",
        gatewayTxnId: null
      });

      user.isPremium = true;
      user.activePlan = plan._id;
      user.premiumExpiresAt = expiryDate;
      
      await user.save();
      await logAction("UPGRADE_USER_AI_PLAN", req.user?.fullName || "Admin", `Upgraded user: ${user.fullName} (${user.email}) to AI Plan: ${plan.name}`, "UserManagement", req.ip);
      return res.json({ message: `AI plan successfully upgraded to ${plan.name}.`, user });
    }

    res.status(400).json({ message: "Invalid action. Use 'upgrade' or 'cancel'." });
  } catch (error) {
    console.error("Manage User AI Subscription Error:", error);
    res.status(500).json({ message: "Failed to update user AI subscription." });
  }
});

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

// PERMANENTLY DELETE a user (superadmin only) - removes from database
router.delete("/:id/permanent", protect, superAdminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (!user.isDeleted) {
      return res.status(400).json({ message: "User must be archived before permanent deletion." });
    }
    const userName = user.fullName;
    const userEmail = user.email;
    await User.findByIdAndDelete(req.params.id);
    await logAction("PERMANENT_DELETE_USER", req.user?.fullName || "Admin", `Permanently deleted user: ${userName} (${userEmail})`, "UserManagement", req.ip);
    res.json({ message: "User permanently deleted." });
  } catch (error) {
    console.error("Permanent Delete Error:", error);
    res.status(500).json({ message: "Failed to permanently delete user." });
  }
});

// GET a specific user's details (admin only)
router.get("/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .select("-password")
      .populate("purchasedExams", "title subject price")
      .populate("purchasedPractice", "title subject price");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(user);
  } catch (error) {
    console.error("Get User Details Error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(500).json({ message: "Failed to fetch user details." });
  }
});

// BULK IMPORT users from CSV (superadmin only)
router.post("/import-csv", protect, superAdminOnly, async (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: "No users provided." });
    }

    const bcrypt = require("bcryptjs");
    const results = { created: [], skipped: [], errors: [] };

    for (const u of users) {
      try {
        const email = (u.email || "").trim().toLowerCase();
        const password = (u.password || "").trim();
        const name = (u.name || "").trim();

        if (!email || !password) {
          results.errors.push({ email: email || "(empty)", reason: "Missing email or password" });
          continue;
        }

        // Check if user already exists (including soft-deleted, due to unique index)
        const existing = await User.findOne({ email });
        if (existing) {
          results.skipped.push({ email, reason: "Already exists" });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
          fullName: name || email.split("@")[0],
          email,
          password: hashedPassword,
          role: "user",
          mustChangePassword: true,
        });
        await newUser.save();
        results.created.push({ email, name: newUser.fullName });

        await logAction(
          req.user._id,
          "CREATE_USER_CSV",
          `Bulk imported user: ${newUser.fullName} (${email})`,
          req
        );
      } catch (err) {
        results.errors.push({ email: u.email || "(unknown)", reason: err.message });
      }
    }

    res.status(200).json({
      message: `Import complete: ${results.created.length} created, ${results.skipped.length} skipped, ${results.errors.length} errors.`,
      ...results,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    res.status(500).json({ message: "Failed to import users." });
  }
});

// Validate emails before import (check which already exist)
router.post("/validate-emails", protect, superAdminOnly, async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ message: "No emails provided." });
    }
    const existing = await User.find({
      email: { $in: emails.map(e => e.toLowerCase()) },
      isDeleted: { $ne: true },
    }).select("email");
    const existingSet = new Set(existing.map(u => u.email.toLowerCase()));
    res.json({ existing: [...existingSet] });
  } catch (error) {
    res.status(500).json({ message: "Validation failed." });
  }
});

module.exports = router;