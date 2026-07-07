// Must run after `protect`. Blocks anyone whose role isn't "admin" or "superadmin".
function adminOnly(req, res, next) {
  if (req.user && (req.user.role === "admin" || req.user.role === "superadmin")) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Admins only." });
}

// Must run after `protect`. Blocks anyone whose role isn't "superadmin".
function superAdminOnly(req, res, next) {
  if (req.user && req.user.role === "superadmin") {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Super Admins only." });
}

module.exports = { adminOnly, superAdminOnly };