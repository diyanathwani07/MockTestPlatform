// Must run after `protect`. Blocks anyone whose role isn't "admin", "superadmin", "manager", or "employee".
function adminOnly(req, res, next) {
  if (req.user && ["admin", "superadmin", "manager", "employee"].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Internal staff only." });
}

// Must run after `protect`. Blocks anyone whose role isn't "superadmin".
function superAdminOnly(req, res, next) {
  if (req.user && req.user.role === "superadmin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Super Admins only." });
}

// Permission middleware: Manage Students (supports superadmin or manage_students, with backward-compatibility for legacy manage_users)
function canManageStudents(req, res, next) {
  if (!req.user || !["admin", "superadmin", "manager", "employee"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied. Internal staff only." });
  }
  if (req.user.role === "superadmin") {
    return next();
  }
  const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (perms.includes("manage_students") || perms.includes("manage_users") || perms.includes("full_access")) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Manage Students permission required." });
}

// Permission middleware: Manage Staff (strictly requires superadmin or manage_staff; legacy manage_users is explicitly not granted)
function canManageStaff(req, res, next) {
  if (!req.user || !["admin", "superadmin", "manager", "employee"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied. Internal staff only." });
  }
  if (req.user.role === "superadmin") {
    return next();
  }
  const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (perms.includes("manage_staff") || perms.includes("full_access")) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Manage Staff permission required." });
}

// Permission middleware: Manage Staff Roles & Permissions
function canManageStaffRoles(req, res, next) {
  if (!req.user || !["admin", "superadmin", "manager", "employee"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied. Internal staff only." });
  }
  if (req.user.role === "superadmin") {
    return next();
  }
  const perms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
  if (perms.includes("manage_staff_roles") || perms.includes("full_access")) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Manage Staff Roles permission required." });
}

module.exports = { adminOnly, superAdminOnly, canManageStudents, canManageStaff, canManageStaffRoles };
