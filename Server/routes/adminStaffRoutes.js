const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const { protect } = require("../middleware/authMiddleware");
const { canManageStaff, canManageStaffRoles, superAdminOnly } = require("../middleware/adminMiddleware");
const User = require("../models/User");
const logAction = require("../utils/logger");
const sendEmail = require("../utils/sendEmail");

const STAFF_ROLES = ["admin", "superadmin", "manager", "employee"];

// All routes in this router require authentication and manage_staff permission
router.use(protect, canManageStaff);

// Helper: Ensure we don't deactivate, demote or delete the last active Super Admin
async function isLastActiveSuperAdmin(targetUserId) {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser || targetUser.role !== "superadmin") {
    return false;
  }
  const activeCount = await User.countDocuments({
    role: "superadmin",
    isDeleted: { $ne: true },
    status: "Active"
  });
  return activeCount <= 1;
}

// GET /api/admin/staff - List all active internal staff
router.get("/", async (req, res) => {
  try {
    const staff = await User.find({
      role: { $in: STAFF_ROLES },
      isDeleted: { $ne: true }
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(staff);
  } catch (error) {
    console.error("Get Staff Error:", error);
    res.status(500).json({ message: "Failed to fetch staff accounts." });
  }
});

// GET /api/admin/staff/deleted - List archived staff
router.get("/deleted", async (req, res) => {
  try {
    const staff = await User.find({
      role: { $in: STAFF_ROLES },
      isDeleted: true
    })
      .select("-password")
      .sort({ updatedAt: -1 });

    res.json(staff);
  } catch (error) {
    console.error("Get Deleted Staff Error:", error);
    res.status(500).json({ message: "Failed to fetch archived staff." });
  }
});

// GET /api/admin/staff/:id - Get specific staff details
router.get("/:id", async (req, res) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      role: { $in: STAFF_ROLES },
      isDeleted: { $ne: true }
    }).select("-password");

    if (!staff) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    res.json(staff);
  } catch (error) {
    console.error("Get Staff Details Error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Staff account not found." });
    }
    res.status(500).json({ message: "Failed to fetch staff details." });
  }
});

// POST /api/admin/staff - Create a new staff account
router.post("/", async (req, res) => {
  try {
    const { fullName, email, phone, role, password, department, permissions, receiveMonthlyAuditReport } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ message: "Full name and email are required." });
    }

    // Role validation
    const targetRole = role || "employee";
    if (!STAFF_ROLES.includes(targetRole)) {
      return res.status(400).json({ message: `Invalid staff role. Allowed: ${STAFF_ROLES.join(", ")}` });
    }

    // Privilege check: Only superadmin can create another superadmin
    if (targetRole === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admins can create Super Admin accounts." });
    }

    // Non-superadmin cannot grant permissions they don't hold
    let finalPermissions = Array.isArray(permissions) ? permissions : [];
    if (req.user.role !== "superadmin") {
      const callerPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
      const unauthorizedPerms = finalPermissions.filter(p => !callerPerms.includes(p));
      if (unauthorizedPerms.length > 0) {
        return res.status(403).json({
          message: `Cannot assign permissions you do not possess: ${unauthorizedPerms.join(", ")}`
        });
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password || "StaffPass123!", 10);

    const newStaff = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : "",
      role: targetRole,
      password: hashedPassword,
      status: "Active",
      department: department ? department.trim() : null,
      permissions: finalPermissions,
      receiveMonthlyAuditReport: targetRole === "superadmin" ? !!receiveMonthlyAuditReport : false
    });

    await logAction(
      "CREATE_STAFF",
      req.user?.fullName || "Admin",
      `Created staff account: ${newStaff.fullName} (${newStaff.email}) as [${newStaff.role}], Department: ${newStaff.department || "None"}`,
      "StaffManagement",
      req.ip
    );

    const safeStaff = newStaff.toObject();
    delete safeStaff.password;

    res.status(201).json({ message: "Staff account created successfully.", staff: safeStaff });
  } catch (error) {
    console.error("Create Staff Error:", error);
    res.status(500).json({ message: "Failed to create staff account." });
  }
});

// PUT /api/admin/staff/:id - Update staff details
router.put("/:id", async (req, res) => {
  try {
    const { fullName, email, phone, role, status, department, permissions, receiveMonthlyAuditReport } = req.body;

    const staff = await User.findOne({
      _id: req.params.id,
      role: { $in: STAFF_ROLES }
    });

    if (!staff) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    const isSelf = req.user._id.toString() === staff._id.toString();

    // Protection: Non-superadmins cannot modify a superadmin account
    if (staff.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admins can modify Super Admin accounts." });
    }

    // Self-modification protection: Cannot demote or suspend own account
    if (isSelf) {
      if (status !== undefined && status !== "Active" && staff.status === "Active") {
        return res.status(400).json({ message: "You cannot deactivate or suspend your own account." });
      }
      if (role !== undefined && role !== staff.role) {
        return res.status(400).json({ message: "You cannot modify your own role." });
      }
    }

    // Role change checks
    if (role !== undefined && role !== staff.role) {
      if (!STAFF_ROLES.includes(role)) {
        return res.status(400).json({ message: `Invalid staff role. Allowed: ${STAFF_ROLES.join(", ")}` });
      }
      if (role === "superadmin" && req.user.role !== "superadmin") {
        return res.status(403).json({ message: "Only Super Admins can promote an account to Super Admin." });
      }
      if (staff.role === "superadmin") {
        const isLast = await isLastActiveSuperAdmin(staff._id);
        if (isLast) {
          return res.status(400).json({ message: "Cannot demote the last remaining active Super Admin." });
        }
      }
      staff.role = role;
    }

    // Status check
    if (status !== undefined && status !== staff.status) {
      if (!["Active", "Suspended", "Inactive"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
      }
      if (staff.role === "superadmin" && status !== "Active") {
        const isLast = await isLastActiveSuperAdmin(staff._id);
        if (isLast) {
          return res.status(400).json({ message: "Cannot deactivate the last remaining active Super Admin." });
        }
      }
      staff.status = status;
    }

    // Permissions check
    if (permissions !== undefined) {
      const newPerms = Array.isArray(permissions) ? permissions : [];
      if (req.user.role !== "superadmin") {
        const callerPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
        const unauthorizedPerms = newPerms.filter(p => !callerPerms.includes(p));
        if (unauthorizedPerms.length > 0) {
          return res.status(403).json({
            message: `Cannot assign permissions you do not possess: ${unauthorizedPerms.join(", ")}`
          });
        }
      }
      staff.permissions = newPerms;
    }

    if (email && email.trim().toLowerCase() !== staff.email) {
      const emailExists = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: staff._id } });
      if (emailExists) {
        return res.status(400).json({ message: "Email is already taken by another account." });
      }
      staff.email = email.trim().toLowerCase();
    }

    if (fullName !== undefined) staff.fullName = fullName.trim();
    if (phone !== undefined) staff.phone = phone.trim();
    if (department !== undefined) staff.department = department ? department.trim() : null;
    if (receiveMonthlyAuditReport !== undefined) {
      staff.receiveMonthlyAuditReport = staff.role === "superadmin" ? !!receiveMonthlyAuditReport : false;
    }

    await staff.save();

    await logAction(
      "UPDATE_STAFF",
      req.user?.fullName || "Admin",
      `Updated staff account: ${staff.fullName} (${staff.email}) - Role: [${staff.role}], Status: ${staff.status}, Dept: ${staff.department || "None"}`,
      "StaffManagement",
      req.ip
    );

    const safeStaff = staff.toObject();
    delete safeStaff.password;

    res.json({ message: "Staff account updated successfully.", staff: safeStaff });
  } catch (error) {
    console.error("Update Staff Error:", error);
    res.status(500).json({ message: "Failed to update staff account." });
  }
});

// PUT /api/admin/staff/:id/status - Toggle active/suspended status
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["Active", "Suspended", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const staff = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
    if (!staff) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    if (req.user._id.toString() === staff._id.toString()) {
      return res.status(400).json({ message: "You cannot change your own account status." });
    }

    if (staff.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admins can alter a Super Admin's status." });
    }

    if (staff.role === "superadmin" && status !== "Active") {
      const isLast = await isLastActiveSuperAdmin(staff._id);
      if (isLast) {
        return res.status(400).json({ message: "Cannot deactivate the last remaining active Super Admin." });
      }
    }

    staff.status = status;
    await staff.save();

    await logAction(
      "UPDATE_STAFF_STATUS",
      req.user?.fullName || "Admin",
      `Changed staff status to ${status}: ${staff.fullName} (${staff.email})`,
      "StaffManagement",
      req.ip
    );

    res.json({ message: `Staff status updated to ${status}.` });
  } catch (error) {
    console.error("Update Staff Status Error:", error);
    res.status(500).json({ message: "Failed to update staff status." });
  }
});

// PUT /api/admin/staff/:id/role - Update staff role specifically (requires canManageStaffRoles)
router.put("/:id/role", canManageStaffRoles, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !STAFF_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid staff role. Allowed: ${STAFF_ROLES.join(", ")}` });
    }

    const staff = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
    if (!staff) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    if (req.user._id.toString() === staff._id.toString()) {
      return res.status(400).json({ message: "You cannot alter your own role." });
    }

    if (role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admins can promote an account to Super Admin." });
    }

    if (staff.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admins can change a Super Admin's role." });
    }

    if (staff.role === "superadmin" && role !== "superadmin") {
      const isLast = await isLastActiveSuperAdmin(staff._id);
      if (isLast) {
        return res.status(400).json({ message: "Cannot demote the last remaining active Super Admin." });
      }
    }

    const prevRole = staff.role;
    staff.role = role;
    await staff.save();

    await logAction(
      "UPDATE_STAFF_ROLE",
      req.user?.fullName || "Admin",
      `Changed role from [${prevRole}] to [${role}] for staff: ${staff.fullName} (${staff.email})`,
      "StaffManagement",
      req.ip
    );

    res.json({ message: `Staff role updated to ${role}.` });
  } catch (error) {
    console.error("Update Staff Role Error:", error);
    res.status(500).json({ message: "Failed to update staff role." });
  }
});

// DELETE /api/admin/staff/:id - Soft-delete (archive) staff
router.delete("/:id", async (req, res) => {
  try {
    const staff = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
    if (!staff) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    if (req.user._id.toString() === staff._id.toString()) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    if (staff.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admins can delete a Super Admin account." });
    }

    if (staff.role === "superadmin") {
      const isLast = await isLastActiveSuperAdmin(staff._id);
      if (isLast) {
        return res.status(400).json({ message: "Cannot delete the last remaining active Super Admin." });
      }
    }

    staff.isDeleted = true;
    await staff.save();

    await logAction(
      "ARCHIVE_STAFF",
      req.user?.fullName || "Admin",
      `Archived staff account: ${staff.fullName} (${staff.email})`,
      "StaffManagement",
      req.ip
    );

    res.json({ message: "Staff account archived successfully." });
  } catch (error) {
    console.error("Archive Staff Error:", error);
    res.status(500).json({ message: "Failed to archive staff account." });
  }
});

// PUT /api/admin/staff/:id/restore - Restore an archived staff account
router.put("/:id/restore", async (req, res) => {
  try {
    const staff = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
    if (!staff) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    staff.isDeleted = false;
    await staff.save();

    await logAction(
      "RESTORE_STAFF",
      req.user?.fullName || "Admin",
      `Restored staff account: ${staff.fullName} (${staff.email})`,
      "StaffManagement",
      req.ip
    );

    const safeStaff = staff.toObject();
    delete safeStaff.password;

    res.json({ message: "Staff account restored successfully.", staff: safeStaff });
  } catch (error) {
    console.error("Restore Staff Error:", error);
    res.status(500).json({ message: "Failed to restore staff account." });
  }
});

// DELETE /api/admin/staff/:id/permanent - Permanently delete archived staff (superadmin only)
router.delete("/:id/permanent", superAdminOnly, async (req, res) => {
  try {
    const staff = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
    if (!staff) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    if (!staff.isDeleted) {
      return res.status(400).json({ message: "Staff account must be archived before permanent deletion." });
    }

    if (req.user._id.toString() === staff._id.toString()) {
      return res.status(400).json({ message: "You cannot permanently delete your own account." });
    }

    if (staff.role === "superadmin") {
      const isLast = await isLastActiveSuperAdmin(staff._id);
      if (isLast) {
        return res.status(400).json({ message: "Cannot permanently delete the last active Super Admin." });
      }
    }

    const { fullName, email } = staff;
    await User.findByIdAndDelete(req.params.id);

    await logAction(
      "PERMANENT_DELETE_STAFF",
      req.user?.fullName || "Admin",
      `Permanently deleted staff: ${fullName} (${email})`,
      "StaffManagement",
      req.ip
    );

    res.json({ message: "Staff account permanently deleted." });
  } catch (error) {
    console.error("Permanent Delete Staff Error:", error);
    res.status(500).json({ message: "Failed to permanently delete staff." });
  }
});

// POST /api/admin/staff/:id/reset-password - Reset staff password
router.post("/:id/reset-password", async (req, res) => {
  try {
    const staff = await User.findOne({ _id: req.params.id, role: { $in: STAFF_ROLES } });
    if (!staff) {
      return res.status(404).json({ message: "Staff account not found." });
    }

    if (staff.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only Super Admins can reset a Super Admin's password." });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    staff.password = await bcrypt.hash(tempPassword, 10);
    staff.mustChangePassword = true;
    await staff.save();

    await sendEmail({
      email: staff.email,
      subject: "Teaching Pariksha - Staff Account Password Reset",
      message: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
          <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">🎓 Teaching Pariksha</h2>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Your internal staff account password has been reset by an administrator.</p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <p style="color: #64748b; font-size: 12px; margin-bottom: 8px;">Your Temporary Password</p>
              <h2 style="color: #6E3FF3; font-size: 24px; letter-spacing: 2px; margin: 0;">${tempPassword}</h2>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">Please log in with this password and change it immediately from your profile.</p>
          </div>
        </div>
      `,
    });

    await logAction(
      "RESET_STAFF_PASSWORD",
      req.user?.fullName || "Admin",
      `Triggered password reset for staff: ${staff.fullName} (${staff.email})`,
      "StaffManagement",
      req.ip
    );

    res.json({ message: "Password reset email sent to the staff member." });
  } catch (error) {
    console.error("Staff Reset Password Error:", error);
    res.status(500).json({ message: "Failed to send reset email." });
  }
});

module.exports = router;
