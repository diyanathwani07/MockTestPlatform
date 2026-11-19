const jwt = require("jsonwebtoken");
const logAction = require("../utils/logger");
const User = require("../models/User");

const FINANCIAL_UNLOCK_SECRET = process.env.FINANCIAL_UNLOCK_SECRET || (process.env.JWT_SECRET + "_FINANCIAL_SEC");

/**
 * 1. Environment-Based Revenue Dashboard Kill Switch
 * Defaults to false if missing or invalid.
 */
function checkRevenueKillSwitch(req, res, next) {
  const isEnabled = process.env.ENABLE_REVENUE_DASHBOARD === "true";
  if (!isEnabled) {
    return res.status(403).json({
      success: false,
      disabled: true,
      message: "Revenue Management is currently disabled by system configuration."
    });
  }
  next();
}

/**
 * 2. Strict Super Admin-Only Authorization
 * Accessible EXCLUSIVELY to Super Admin.
 * No staff role (admin, manager, employee, finance) or permission (manage_revenue, full_access) can bypass this.
 */
async function requireSuperAdmin(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized. Authentication required." });
    }

    if (user.role !== "superadmin") {
      // Log unauthorized access attempt
      await logAction(
        "REVENUE_ACCESS_DENIED",
        user.fullName || user.email || "Unknown Staff",
        `Unauthorized access attempt to Revenue Management by role: ${user.role} (${user.email})`,
        "Revenue Management",
        req.ip
      );

      return res.status(403).json({
        success: false,
        message: "Access denied. Revenue Management is restricted exclusively to Super Admin."
      });
    }

    next();
  } catch (error) {
    console.error("Require Super Admin Error:", error);
    return res.status(500).json({ success: false, message: "Super Admin authorization check failed." });
  }
}

/**
 * 3. Financial Security Lock Verification Middleware
 * Validates the short-lived (5-minute) financial unlock token for all sensitive endpoints.
 * Enforces:
 * - Valid cryptographic HS256 signature and 5-minute expiry
 * - Audience and issuer validation (prepmark_financial / prepmark_auth)
 * - Strict Super Admin role and identity binding (cannot be reused by another account)
 * - Server-side session revocation: validates sessionVersion against database state
 */
async function requireFinancialUnlock(req, res, next) {
  try {
    const unlockToken = req.headers["x-financial-unlock-token"];

    if (!unlockToken) {
      return res.status(403).json({
        success: false,
        locked: true,
        message: "Financial Security Lock active. Verification required."
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(unlockToken, FINANCIAL_UNLOCK_SECRET, {
        audience: "prepmark_financial",
        issuer: "prepmark_auth",
        algorithms: ["HS256"]
      });
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      return res.status(403).json({
        success: false,
        locked: true,
        expired: isExpired,
        message: isExpired
          ? "Financial unlock session expired. Please verify again."
          : "Invalid financial unlock token."
      });
    }

    // 1. Verify token claims and account identity binding
    const currentUserId = req.user?._id?.toString();
    if (
      !currentUserId ||
      decoded.type !== "financial_unlock" ||
      decoded.userId !== currentUserId ||
      (decoded.sub && decoded.sub !== currentUserId) ||
      decoded.role !== "superadmin" ||
      req.user.role !== "superadmin"
    ) {
      return res.status(403).json({
        success: false,
        locked: true,
        message: "Invalid financial unlock credentials or token user mismatch."
      });
    }

    // 2. Server-side session revocation verification
    // Checks if the session was revoked via Lock Now, Logout, or Password Reset
    const dbUser = await User.findById(currentUserId).select("financialSessionVersion role");
    if (!dbUser || dbUser.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        locked: true,
        message: "Super Admin privileges required."
      });
    }

    const currentVersion = dbUser.financialSessionVersion || 1;
    if (decoded.sessionVersion !== currentVersion) {
      return res.status(403).json({
        success: false,
        locked: true,
        revoked: true,
        message: "Financial unlock session has been revoked. Re-authentication required."
      });
    }

    req.financialUnlock = decoded;
    next();
  } catch (error) {
    console.error("Financial Unlock Verification Error:", error);
    return res.status(500).json({ success: false, message: "Financial security lock check failed." });
  }
}

module.exports = {
  checkRevenueKillSwitch,
  requireSuperAdmin,
  requireFinancialUnlock,
  FINANCIAL_UNLOCK_SECRET
};
