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

module.exports = { adminOnly, superAdminOnly };