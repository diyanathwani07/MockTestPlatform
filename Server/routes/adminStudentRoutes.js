const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const { protect } = require("../middleware/authMiddleware");
const { canManageStudents, superAdminOnly } = require("../middleware/adminMiddleware");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const AiPlan = require("../models/AiPlan");
const logAction = require("../utils/logger");
const sendEmail = require("../utils/sendEmail");

// All routes in this router require authentication and manage_students permission
router.use(protect, canManageStudents);

// GET /api/admin/students - List all active/non-archived students
router.get("/", async (req, res) => {
  try {
    const students = await User.find({ role: "user", isDeleted: { $ne: true } })
      .select("-password")
      .populate("activePlan", "name durationValue durationUnit sellingPrice")
      .populate("purchasedExams", "title subject price")
      .populate("purchasedPractice", "title subject price")
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (error) {
    console.error("Get Students Error:", error);
    res.status(500).json({ message: "Failed to fetch students." });
  }
});

// GET /api/admin/students/deleted - List soft-deleted/archived students
router.get("/deleted", async (req, res) => {
  try {
    const students = await User.find({ role: "user", isDeleted: true })
      .select("-password")
      .sort({ updatedAt: -1 });

    res.json(students);
  } catch (error) {
    console.error("Get Deleted Students Error:", error);
    res.status(500).json({ message: "Failed to fetch deleted students." });
  }
});

// GET /api/admin/students/:id - Get student details
router.get("/:id", async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "user", isDeleted: { $ne: true } })
      .select("-password")
      .populate("activePlan", "name durationValue durationUnit sellingPrice")
      .populate("purchasedExams", "title subject price")
      .populate("purchasedPractice", "title subject price");

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const Ticket = require("../models/Ticket");
    const Quiz = require("../models/Quiz");

    const [tickets, aiTests] = await Promise.all([
      Ticket.find({ userId: student._id }).sort({ createdAt: -1 }),
      Quiz.find({
        createdBy: student._id,
        $or: [
          { isAiGenerated: true },
          { quizType: "custom" },
          { title: { $regex: /^AI Test:/i } }
        ]
      })
      .select("title subject duration totalMarks questions createdAt isAiGenerated quizType")
      .sort({ createdAt: -1 })
    ]);

    res.json({
      ...student.toObject(),
      tickets: tickets || [],
      aiTests: aiTests || []
    });
  } catch (error) {
    console.error("Get Student Details Error:", error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Student not found." });
    }
    res.status(500).json({ message: "Failed to fetch student details." });
  }
});

// POST /api/admin/students - Create a new student account
router.post("/", async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ message: "Full name and email are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: "A user with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password || "StudentPass123!", 10);

    // Enforce strict student role & zero staff privileges
    const student = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : "",
      role: "user",
      password: hashedPassword,
      status: "Active",
      department: null,
      permissions: [],
      receiveMonthlyAuditReport: false,
    });

    await logAction(
      "CREATE_STUDENT",
      req.user?.fullName || "Admin",
      `Created student account: ${student.fullName} (${student.email})`,
      "StudentManagement",
      req.ip
    );

    const safeStudent = student.toObject();
    delete safeStudent.password;

    res.status(201).json({ message: "Student created successfully.", student: safeStudent });
  } catch (error) {
    console.error("Create Student Error:", error);
    res.status(500).json({ message: "Failed to create student." });
  }
});

// PUT /api/admin/students/:id - Update student details
router.put("/:id", async (req, res) => {
  try {
    const { fullName, email, phone, status } = req.body;

    const student = await User.findOne({ _id: req.params.id, role: "user" });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (email && email.trim().toLowerCase() !== student.email) {
      const emailExists = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: student._id } });
      if (emailExists) {
        return res.status(400).json({ message: "Email is already taken by another account." });
      }
      student.email = email.trim().toLowerCase();
    }

    if (fullName !== undefined) student.fullName = fullName.trim();
    if (phone !== undefined) student.phone = phone.trim();
    if (status !== undefined) student.status = status;

    // Strict boundary: Never allow modifying role or granting permissions on student route
    student.role = "user";
    student.department = null;
    student.permissions = [];
    student.receiveMonthlyAuditReport = false;

    await student.save();

    await logAction(
      "UPDATE_STUDENT",
      req.user?.fullName || "Admin",
      `Updated student: ${student.fullName} (${student.email})`,
      "StudentManagement",
      req.ip
    );

    const safeStudent = student.toObject();
    delete safeStudent.password;

    res.json({ message: "Student updated successfully.", student: safeStudent });
  } catch (error) {
    console.error("Update Student Error:", error);
    res.status(500).json({ message: "Failed to update student." });
  }
});

// PUT /api/admin/students/:id/status - Toggle active/suspended status
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["Active", "Suspended", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const student = await User.findOne({ _id: req.params.id, role: "user" });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    student.status = status;
    await student.save();

    await logAction(
      "UPDATE_STUDENT_STATUS",
      req.user?.fullName || "Admin",
      `Changed student status to ${status}: ${student.fullName} (${student.email})`,
      "StudentManagement",
      req.ip
    );

    res.json({ message: `Student status updated to ${status}.` });
  } catch (error) {
    console.error("Update Student Status Error:", error);
    res.status(500).json({ message: "Failed to update student status." });
  }
});

// DELETE /api/admin/students/:id - Soft-delete (archive) student
router.delete("/:id", async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "user" });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    student.isDeleted = true;
    await student.save();

    await logAction(
      "ARCHIVE_STUDENT",
      req.user?.fullName || "Admin",
      `Archived student: ${student.fullName} (${student.email})`,
      "StudentManagement",
      req.ip
    );

    res.json({ message: "Student archived successfully." });
  } catch (error) {
    console.error("Archive Student Error:", error);
    res.status(500).json({ message: "Failed to archive student." });
  }
});

// PUT /api/admin/students/:id/restore - Restore an archived student
router.put("/:id/restore", async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "user" });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    student.isDeleted = false;
    await student.save();

    await logAction(
      "RESTORE_STUDENT",
      req.user?.fullName || "Admin",
      `Restored student: ${student.fullName} (${student.email})`,
      "StudentManagement",
      req.ip
    );

    const safeStudent = student.toObject();
    delete safeStudent.password;

    res.json({ message: "Student restored successfully.", student: safeStudent });
  } catch (error) {
    console.error("Restore Student Error:", error);
    res.status(500).json({ message: "Failed to restore student." });
  }
});

// DELETE /api/admin/students/:id/permanent - Permanently delete archived student
router.delete("/:id/permanent", async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "user" });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }
    if (!student.isDeleted) {
      return res.status(400).json({ message: "Student must be archived before permanent deletion." });
    }

    const { fullName, email } = student;
    await User.findByIdAndDelete(req.params.id);

    await logAction(
      "PERMANENT_DELETE_STUDENT",
      req.user?.fullName || "Admin",
      `Permanently deleted student: ${fullName} (${email})`,
      "StudentManagement",
      req.ip
    );

    res.json({ message: "Student permanently deleted." });
  } catch (error) {
    console.error("Permanent Delete Student Error:", error);
    res.status(500).json({ message: "Failed to permanently delete student." });
  }
});

// POST /api/admin/students/:id/reset-password - Trigger password reset email
router.post("/:id/reset-password", async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "user" });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    student.password = await bcrypt.hash(tempPassword, 10);
    student.mustChangePassword = true;
    await student.save();

    await sendEmail({
      email: student.email,
      subject: "Teaching Pariksha - Account Password Reset",
      message: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
          <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">🎓 Teaching Pariksha</h2>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">Your student account password has been reset by an administrator.</p>
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
      "RESET_STUDENT_PASSWORD",
      req.user?.fullName || "Admin",
      `Triggered password reset for student: ${student.fullName} (${student.email})`,
      "StudentManagement",
      req.ip
    );

    res.json({ message: "Password reset email sent to the student." });
  } catch (error) {
    console.error("Student Reset Password Error:", error);
    res.status(500).json({ message: "Failed to send reset email." });
  }
});

// PUT /api/admin/students/:id/ai-subscription - Upgrade or cancel student's AI subscription
router.put("/:id/ai-subscription", async (req, res) => {
  try {
    const { action, planId } = req.body;
    const student = await User.findOne({ _id: req.params.id, role: "user" });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (action === "cancel") {
      await Subscription.updateMany(
        { studentId: student._id, status: "active" },
        { $set: { status: "cancelled" } }
      );

      student.isPremium = false;
      student.activePlan = null;
      student.premiumExpiresAt = null;
      await student.save();

      await logAction(
        "CANCEL_STUDENT_AI_PLAN",
        req.user?.fullName || "Admin",
        `Cancelled AI plan for student: ${student.fullName} (${student.email})`,
        "StudentManagement",
        req.ip
      );

      return res.json({ message: "AI plan subscription cancelled successfully." });
    }

    if (action === "upgrade") {
      const plan = await AiPlan.findById(planId);
      if (!plan) {
        return res.status(404).json({ message: "AI Plan not found." });
      }

      const expiryDate = new Date();
      if (plan.durationUnit === "months") {
        expiryDate.setMonth(expiryDate.getMonth() + plan.durationValue);
      } else {
        expiryDate.setDate(expiryDate.getDate() + plan.durationValue);
      }

      await Subscription.updateMany(
        { studentId: student._id, status: "active" },
        { $set: { status: "cancelled" } }
      );

      const crypto = require("crypto");
      const purchaseId = `PUR-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      await Subscription.create({
        studentId: student._id,
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

      student.isPremium = true;
      student.activePlan = plan._id;
      student.premiumExpiresAt = expiryDate;
      await student.save();

      await logAction(
        "UPGRADE_STUDENT_AI_PLAN",
        req.user?.fullName || "Admin",
        `Upgraded student: ${student.fullName} (${student.email}) to AI Plan: ${plan.name}`,
        "StudentManagement",
        req.ip
      );

      const safeStudent = student.toObject();
      delete safeStudent.password;

      return res.json({ message: `AI plan successfully upgraded to ${plan.name}.`, student: safeStudent });
    }

    res.status(400).json({ message: "Invalid action. Use 'upgrade' or 'cancel'." });
  } catch (error) {
    console.error("Student AI Subscription Error:", error);
    res.status(500).json({ message: "Failed to update AI subscription." });
  }
});

// POST /api/admin/students/import-csv - Bulk import students from CSV
router.post("/import-csv", async (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: "No students provided." });
    }

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

        const existing = await User.findOne({ email });
        if (existing) {
          results.skipped.push({ email, reason: "Already exists" });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newStudent = new User({
          fullName: name || email.split("@")[0],
          email,
          password: hashedPassword,
          role: "user",
          department: null,
          permissions: [],
          mustChangePassword: true,
        });
        await newStudent.save();
        results.created.push({ email, name: newStudent.fullName });

        await logAction(
          "CREATE_STUDENT_CSV",
          req.user?.fullName || "Admin",
          `Bulk imported student: ${newStudent.fullName} (${email})`,
          "StudentManagement",
          req.ip
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
    console.error("Student CSV Import Error:", error);
    res.status(500).json({ message: "Failed to import students." });
  }
});

// POST /api/admin/students/validate-emails - Pre-import email duplicate validation
router.post("/validate-emails", async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ message: "No emails provided." });
    }
    const existing = await User.find({
      email: { $in: emails.map(e => (e || "").trim().toLowerCase()) },
      isDeleted: { $ne: true },
    }).select("email");
    const existingSet = new Set(existing.map(u => u.email.toLowerCase()));
    res.json({ existing: [...existingSet] });
  } catch (error) {
    res.status(500).json({ message: "Validation failed." });
  }
});

module.exports = router;
