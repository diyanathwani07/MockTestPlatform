const Department = require("../models/Department");

// Factory: requirePermission("create_quiz") returns middleware
function requirePermission(permKey) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Unauthorized." });

      // Superadmin always passes
      if (user.role === "superadmin") return next();

      // Student/user only allowed student-specific features (if any checked)
      if (user.role === "user") {
        const studentPermissions = ["student_dashboard", "my_exams", "practice_tests", "results", "leaderboard", "help_support"];
        if (studentPermissions.includes(permKey)) return next();
        return res.status(403).json({ message: "Access denied." });
      }

      // Admin role requires department or user-level permission checks
      if (user.role === "admin") {
        // Build combined permissions list
        let userPerms = [...(user.permissions || [])];

        // Fetch department permissions if user has a department
        if (user.department) {
          const dept = await Department.findOne({ name: user.department });
          if (dept && dept.permissions) {
            userPerms = [...new Set([...userPerms, ...dept.permissions])];
          }
        }

        if (userPerms.includes(permKey)) {
          return next();
        }
      }

      return res.status(403).json({ message: `Access denied. Missing permission: ${permKey}` });
    } catch (err) {
      console.error("Permission Middleware Error:", err);
      return res.status(500).json({ message: "Permission check failed." });
    }
  };
}

module.exports = requirePermission;

