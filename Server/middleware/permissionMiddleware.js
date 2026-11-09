const Department = require("../models/Department");

// Factory: requirePermission("create_quiz") or requirePermission(["view_revenue", "manage_revenue"]) returns middleware
function requirePermission(permKeys) {
  const keys = Array.isArray(permKeys) ? permKeys : [permKeys];

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized." });

      // Superadmin or full_access always passes
      if (user.role === "superadmin") return next();
      if (Array.isArray(user.permissions) && user.permissions.includes("full_access")) return next();

      // Student/user only allowed student-specific features (if any checked)
      if (user.role === "user") {
        const studentPermissions = ["student_dashboard", "my_exams", "practice_tests", "results", "leaderboard", "help_support"];
        if (keys.some(k => studentPermissions.includes(k))) return next();
        return res.status(403).json({ message: "Access denied." });
      }

      // Internal staff roles require department or user-level permission checks
      if (["admin", "manager", "employee"].includes(user.role)) {
        // Build combined permissions list
        let userPerms = [...(user.permissions || [])];

        // Fetch department permissions if user has a department
        if (user.department) {
          const dept = await Department.findOne({ name: user.department });
          if (dept && dept.permissions) {
            userPerms = [...new Set([...userPerms, ...dept.permissions])];
          }
        }

        // Pass if any required key is matched or if full_access is held
        if (userPerms.includes("full_access") || keys.some(k => userPerms.includes(k))) {
          return next();
        }
      }

      return res.status(403).json({ message: `Access denied. Missing permission: ${keys.join(" or ")}` });
    } catch (err) {
      console.error("Permission Middleware Error:", err);
      return res.status(500).json({ message: "Permission check failed." });
    }
  };
}

module.exports = requirePermission;

