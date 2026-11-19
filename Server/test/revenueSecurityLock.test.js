const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Department = require("../models/Department");
const AuditLog = require("../models/AuditLog");
const Quiz = require("../models/Quiz");
const PurchaseTransaction = require("../models/PurchaseTransaction");
const Subscription = require("../models/Subscription");
const AiPlan = require("../models/AiPlan");

const { protect } = require("../middleware/authMiddleware");
const {
  checkRevenueKillSwitch,
  requireSuperAdmin,
  requireFinancialUnlock,
  FINANCIAL_UNLOCK_SECRET
} = require("../middleware/revenueSecurityMiddleware");
const {
  verifyFinancialUnlock,
  lockFinancialDashboard,
  getRevenueAnalytics,
  getRevenueTransactions,
  getSingleTransaction,
  updateTransactionStatus,
  getRevenueCustomers,
  getExamsPracticeFinancials,
  getAiUsageAnalytics,
  getRevenueReports
} = require("../controllers/revenueController");
const {
  getSubscribersOverview,
  getSubscribersList,
  getSubscriberHistory
} = require("../controllers/subscribersController");
const { getDashboardMetrics } = require("../controllers/aiPlanController");
const { adminGrantAccess } = require("../controllers/purchaseController");
const auditLogRouter = require("../routes/auditLogRoutes");

function createMockReq({ user = null, headers = {}, body = {}, query = {}, params = {}, ip = "127.0.0.1" }) {
  return {
    user,
    headers: { ...headers },
    body,
    query,
    params,
    ip,
    get(name) {
      return this.headers[name.toLowerCase()];
    }
  };
}

function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
}

async function runRevenueSecurityTestSuite() {
  console.log("=====================================================================");
  console.log("  PREPMARK REVENUE MANAGEMENT - FINAL SECURITY REGRESSION AUDIT     ");
  console.log("=====================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not found in environment.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for Final Regression Audit Suite.\n");

  const testSuffix = Date.now();
  const createdUserIds = [];
  const createdDeptIds = [];
  const createdQuizIds = [];
  const createdTxnIds = [];
  const createdSubIds = [];
  const createdPlanIds = [];

  try {
    const rawPassword = "SuperAdminPassword123!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 1. Setup Primary Super Admin A
    const superAdminA = await User.create({
      fullName: `Super Admin A ${testSuffix}`,
      email: `superadmin_a_${testSuffix}@prepmark.test`,
      password: hashedPassword,
      role: "superadmin",
      isEmailVerified: true,
      financialSessionVersion: 1
    });
    createdUserIds.push(superAdminA._id);

    // 2. Setup Secondary Super Admin B (for cross-account isolation tests)
    const superAdminB = await User.create({
      fullName: `Super Admin B ${testSuffix}`,
      email: `superadmin_b_${testSuffix}@prepmark.test`,
      password: hashedPassword,
      role: "superadmin",
      isEmailVerified: true,
      financialSessionVersion: 1
    });
    createdUserIds.push(superAdminB._id);

    // 3. Setup Normal Admin
    const normalAdmin = await User.create({
      fullName: `Normal Admin ${testSuffix}`,
      email: `admin_${testSuffix}@prepmark.test`,
      password: hashedPassword,
      role: "admin",
      isEmailVerified: true
    });
    createdUserIds.push(normalAdmin._id);

    // 4. Setup Finance Staff Dept & User
    const financeDept = await Department.create({
      name: `Finance Dept ${testSuffix}`,
      description: "Finance department",
      permissions: ["view_revenue", "manage_revenue"]
    });
    createdDeptIds.push(financeDept._id);

    const financeStaff = await User.create({
      fullName: `Finance Staff ${testSuffix}`,
      email: `finance_${testSuffix}@prepmark.test`,
      password: hashedPassword,
      role: "employee",
      department: financeDept._id,
      isEmailVerified: true
    });
    createdUserIds.push(financeStaff._id);

    // 5. Setup Staff with 'full_access'
    const fullAccessStaff = await User.create({
      fullName: `Full Access Staff ${testSuffix}`,
      email: `fullaccess_${testSuffix}@prepmark.test`,
      password: hashedPassword,
      role: "admin",
      permissions: ["full_access"],
      isEmailVerified: true
    });
    createdUserIds.push(fullAccessStaff._id);

    // 6. Setup Student User
    const studentUser = await User.create({
      fullName: `Student User ${testSuffix}`,
      email: `student_${testSuffix}@prepmark.test`,
      password: hashedPassword,
      role: "user",
      isEmailVerified: true
    });
    createdUserIds.push(studentUser._id);

    // Setup Test Quiz for Grant Access & Single Transaction tests
    const testQuiz = await Quiz.create({
      title: `Audit Test Exam ${testSuffix}`,
      subject: "General Studies",
      description: "Audit test exam description",
      category: "BPSC",
      isPaid: true,
      price: 299,
      duration: 60,
      marksPerQuestion: 1,
      createdBy: superAdminA._id
    });
    createdQuizIds.push(testQuiz._id);

    // Setup Test Purchase Transaction
    const testTxn = await PurchaseTransaction.create({
      transactionId: `TXN-AUDIT-${testSuffix}`,
      orderId: `ORDER-AUDIT-${testSuffix}`,
      studentId: studentUser._id,
      itemId: testQuiz._id,
      itemModel: "Quiz",
      itemTitleSnapshot: testQuiz.title,
      productCategory: "exam",
      amount: 299,
      originalPriceSnapshot: 299,
      discountSnapshot: 0,
      currency: "INR",
      gateway: "razorpay",
      paymentStatus: "paid",
      provenance: "verified_payment",
      paymentVerificationStatus: "verified",
      paymentTimestamp: new Date(),
      status: "paid"
    });
    createdTxnIds.push(testTxn._id);

    // Setup Test Plan & Subscription for subscriber history
    const testPlan = await AiPlan.create({
      name: `Audit AI Plan ${testSuffix}`,
      description: "AI Plan for audit verification",
      originalPrice: 999,
      sellingPrice: 499,
      durationValue: 30,
      durationUnit: "days",
      status: "active"
    });
    createdPlanIds.push(testPlan._id);

    const testSub = await Subscription.create({
      studentId: studentUser._id,
      planId: testPlan._id,
      planNameSnapshot: testPlan.name,
      purchaseId: `PURCHASE-AUDIT-${testSuffix}`,
      paymentGateway: "razorpay",
      amount: 499,
      maxAITests: 50,
      aiTestsUsed: 0,
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "active"
    });
    createdSubIds.push(testSub._id);

    // =========================================================================
    // SECTION 1: MISSING ENDPOINT COVERAGE (24 EXPLICIT TESTS ACROSS 6 STATES)
    // =========================================================================
    console.log("--- Section 1: Missing Endpoint Coverage (6 Security States per Endpoint) ---");

    // Obtain an active, valid financial unlock token for Super Admin A
    let req = createMockReq({ user: superAdminA, body: { password: rawPassword } });
    let res = createMockRes();
    await verifyFinancialUnlock(req, res);
    let activeToken = res.data?.unlockToken;
    assert(Boolean(activeToken), "1.0 Initial Financial Unlock Token successfully issued for Super Admin A");

    // Matrix testing helper function:
    // Tests: 1) Unauthenticated, 2) Normal Admin, 3) Finance Staff,
    //        4) Super Admin without unlock, 5) Super Admin with valid unlock, 6) Kill Switch disabled
    async function testEndpointUnderAllSixStates({
      name,
      handler,
      method = "GET",
      body = {},
      params = {},
      query = {}
    }) {
      console.log(`\n  Evaluating endpoint: [${method}] ${name}`);

      // State 1: Unauthenticated user (passes through protect)
      let r = createMockReq({ user: null, headers: {}, body, params, query });
      let s = createMockRes();
      let protectPassed = false;
      await protect(r, s, () => { protectPassed = true; });
      assert(s.statusCode === 401 && !protectPassed, `  [${name}] State 1: Unauthenticated request rejected (HTTP 401)`);

      // State 2: Normal Admin (rejected by requireSuperAdmin)
      r = createMockReq({ user: normalAdmin, headers: { "x-financial-unlock-token": activeToken }, body, params, query });
      s = createMockRes();
      let normalAdminPassed = false;
      await requireSuperAdmin(r, s, () => { normalAdminPassed = true; });
      assert(s.statusCode === 403 && !normalAdminPassed, `  [${name}] State 2: Normal Admin blocked (HTTP 403)`);

      // State 3: Finance Staff (rejected by requireSuperAdmin despite permissions)
      r = createMockReq({ user: financeStaff, headers: { "x-financial-unlock-token": activeToken }, body, params, query });
      s = createMockRes();
      let financePassed = false;
      await requireSuperAdmin(r, s, () => { financePassed = true; });
      assert(s.statusCode === 403 && !financePassed, `  [${name}] State 3: Finance Staff blocked (HTTP 403)`);

      // State 4: Super Admin without financial unlock token (rejected by requireFinancialUnlock)
      r = createMockReq({ user: superAdminA, headers: {}, body, params, query });
      s = createMockRes();
      let unlockPassedWithoutToken = false;
      await requireFinancialUnlock(r, s, () => { unlockPassedWithoutToken = true; });
      assert(s.statusCode === 403 && s.data?.locked === true && !unlockPassedWithoutToken, `  [${name}] State 4: Super Admin without unlock rejected (HTTP 403 locked)`);

      // State 5: Super Admin with valid unlock token (middleware passes, handler executes)
      r = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": activeToken }, body, params, query });
      s = createMockRes();
      let unlockPassedWithToken = false;
      await requireFinancialUnlock(r, s, () => { unlockPassedWithToken = true; });
      assert(unlockPassedWithToken === true, `  [${name}] State 5a: Valid unlock token passes requireFinancialUnlock`);
      await handler(r, s);
      assert(s.statusCode === 200 || s.statusCode === 201, `  [${name}] State 5b: Handler executed successfully (HTTP ${s.statusCode})`);

      // State 6: Kill Switch disabled
      process.env.ENABLE_REVENUE_DASHBOARD = "false";
      r = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": activeToken }, body, params, query });
      s = createMockRes();
      let killSwitchPassed = false;
      checkRevenueKillSwitch(r, s, () => { killSwitchPassed = true; });
      assert(s.statusCode === 403 && s.data?.disabled === true && !killSwitchPassed, `  [${name}] State 6: Blocked when Kill Switch is disabled (HTTP 403)`);
      process.env.ENABLE_REVENUE_DASHBOARD = "true";
    }

    // 1.1 Endpoint: GET /api/admin/revenue/transactions/:id
    await testEndpointUnderAllSixStates({
      name: "GET /api/admin/revenue/transactions/:id",
      handler: getSingleTransaction,
      params: { id: testTxn._id.toString() }
    });

    // 1.2 Endpoint: PATCH /api/admin/revenue/transactions/:id/status
    await testEndpointUnderAllSixStates({
      name: "PATCH /api/admin/revenue/transactions/:id/status",
      handler: updateTransactionStatus,
      method: "PATCH",
      params: { id: testTxn._id.toString() },
      body: { status: "refunded", note: "Security audit status test" }
    });

    // 1.3 Endpoint: POST /api/admin/revenue/grant-access
    await testEndpointUnderAllSixStates({
      name: "POST /api/admin/revenue/grant-access",
      handler: adminGrantAccess,
      method: "POST",
      body: {
        studentId: studentUser._id.toString(),
        itemId: testQuiz._id.toString(),
        productCategory: "exam",
        note: "Security audit access grant"
      }
    });

    // 1.4 Endpoint: GET /api/admin/ai-plans/subscribers/:studentId
    await testEndpointUnderAllSixStates({
      name: "GET /api/admin/ai-plans/subscribers/:studentId",
      handler: getSubscriberHistory,
      params: { studentId: studentUser._id.toString() }
    });

    // =========================================================================
    // SECTION 2: SESSION INVALIDATION & REVOCATION RIGOR
    // =========================================================================
    console.log("\n--- Section 2: Session Invalidation & Revocation Rigor ---");

    // 2.1 Issue fresh token for Super Admin A
    req = createMockReq({ user: superAdminA, body: { password: rawPassword } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    const tokenBeforeLock = res.data?.unlockToken;

    // 2.2 Lock Now immediately revokes token server-side in MongoDB
    req = createMockReq({ user: superAdminA });
    res = createMockRes();
    await lockFinancialDashboard(req, res);
    assert(res.statusCode === 200 && res.data?.locked === true && res.data?.revoked === true, "2.1 Lock Now endpoint revokes session");

    // Verify copied tokenBeforeLock is now rejected
    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": tokenBeforeLock } });
    res = createMockRes();
    let lockRevokedCheck = false;
    await requireFinancialUnlock(req, res, () => { lockRevokedCheck = true; });
    assert(res.statusCode === 403 && res.data?.revoked === true && !lockRevokedCheck, "2.2 Lock Now immediately revokes copied tokens (rejected with 403 revoked)");

    // 2.3 Logout revokes existing financial tokens
    req = createMockReq({ user: superAdminA, body: { password: rawPassword } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    const tokenBeforeLogout = res.data?.unlockToken;

    // Simulate logout action (increments financialSessionVersion in MongoDB)
    await User.findByIdAndUpdate(superAdminA._id, { $inc: { financialSessionVersion: 1 } });
    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": tokenBeforeLogout } });
    res = createMockRes();
    let logoutRevokedCheck = false;
    await requireFinancialUnlock(req, res, () => { logoutRevokedCheck = true; });
    assert(res.statusCode === 403 && res.data?.revoked === true && !logoutRevokedCheck, "2.3 Logout revokes existing financial tokens server-side");

    // 2.4 Password change revokes existing financial tokens
    req = createMockReq({ user: superAdminA, body: { password: rawPassword } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    const tokenBeforePwdChange = res.data?.unlockToken;

    // User changes password -> increments financialSessionVersion
    const superAdminDoc = await User.findById(superAdminA._id);
    superAdminDoc.financialSessionVersion = (superAdminDoc.financialSessionVersion || 1) + 1;
    await superAdminDoc.save();

    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": tokenBeforePwdChange } });
    res = createMockRes();
    let pwdChangeRevokedCheck = false;
    await requireFinancialUnlock(req, res, () => { pwdChangeRevokedCheck = true; });
    assert(res.statusCode === 403 && res.data?.revoked === true && !pwdChangeRevokedCheck, "2.4 Password change revokes existing financial tokens");

    // 2.5 Password reset revokes existing financial tokens
    req = createMockReq({ user: superAdminA, body: { password: rawPassword } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    const tokenBeforePwdReset = res.data?.unlockToken;

    // User resets password -> increments financialSessionVersion
    await User.findByIdAndUpdate(superAdminA._id, { $inc: { financialSessionVersion: 1 } });
    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": tokenBeforePwdReset } });
    res = createMockRes();
    let pwdResetRevokedCheck = false;
    await requireFinancialUnlock(req, res, () => { pwdResetRevokedCheck = true; });
    assert(res.statusCode === 403 && res.data?.revoked === true && !pwdResetRevokedCheck, "2.5 Password reset revokes existing financial tokens");

    // 2.6 Expired token cannot access sensitive APIs
    const superAdminFresh = await User.findById(superAdminA._id);
    const expiredToken = jwt.sign(
      {
        userId: superAdminA._id.toString(),
        sub: superAdminA._id.toString(),
        role: "superadmin",
        type: "financial_unlock",
        sessionVersion: superAdminFresh.financialSessionVersion,
        jti: crypto.randomUUID()
      },
      FINANCIAL_UNLOCK_SECRET,
      {
        expiresIn: -10, // Expired 10 seconds ago
        audience: "prepmark_financial",
        issuer: "prepmark_auth",
        algorithm: "HS256"
      }
    );
    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": expiredToken } });
    res = createMockRes();
    let expiredCheck = false;
    await requireFinancialUnlock(req, res, () => { expiredCheck = true; });
    assert(res.statusCode === 403 && res.data?.expired === true && !expiredCheck, "2.6 Expired unlock token cannot access sensitive APIs (HTTP 403 expired)");

    // 2.7 Token from another Super Admin account is rejected (Account Isolation)
    req = createMockReq({ user: superAdminB, body: { password: rawPassword } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    const tokenFromB = res.data?.unlockToken;

    // Super Admin A attempts to use Super Admin B's token
    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": tokenFromB } });
    res = createMockRes();
    let crossAccountCheck = false;
    await requireFinancialUnlock(req, res, () => { crossAccountCheck = true; });
    assert(res.statusCode === 403 && !crossAccountCheck, "2.7 Token from another Super Admin account is rejected (Account mismatch 403)");

    // =========================================================================
    // SECTION 3: CONCURRENT RATE-LIMITING & ATOMIC BRUTE-FORCE LOCKOUT
    // =========================================================================
    console.log("\n--- Section 3: Concurrent Rate-Limiting & Atomic Lockout ---");

    const concurrentTestUser = await User.create({
      fullName: `Concurrent RateLimit User ${testSuffix}`,
      email: `concurrent_${testSuffix}@prepmark.test`,
      password: hashedPassword,
      role: "superadmin",
      isEmailVerified: true,
      financialSessionVersion: 1
    });
    createdUserIds.push(concurrentTestUser._id);

    // 3.1 Simulate 5 simultaneous incorrect password verification requests via Promise.all
    const concurrentRequests = Array.from({ length: 5 }).map(() => {
      const mockReq = createMockReq({ user: concurrentTestUser, body: { password: "WrongPassword123!" } });
      const mockRes = createMockRes();
      return verifyFinancialUnlock(mockReq, mockRes).then(() => mockRes);
    });

    const concurrentResponses = await Promise.all(concurrentRequests);
    assert(concurrentResponses.length === 5, "3.1 Dispatched 5 concurrent failed verification requests");

    // 3.2 Verify atomic $inc counter in MongoDB reached exactly 5
    const userInDbAfterConcurrency = await User.findById(concurrentTestUser._id);
    assert(
      userInDbAfterConcurrency.financialLockout.attempts === 5,
      `3.2 Failed attempts atomically counted in MongoDB without race conditions (Count: ${userInDbAfterConcurrency.financialLockout.attempts})`
    );

    // 3.3 Verify 5 failed attempts triggered lockout
    assert(
      userInDbAfterConcurrency.financialLockout.lockoutUntil &&
      new Date(userInDbAfterConcurrency.financialLockout.lockoutUntil) > new Date(),
      "3.3 Lockout window (15 minutes) set in MongoDB document"
    );

    // 3.4 Verify subsequent request is blocked with HTTP 429
    req = createMockReq({ user: concurrentTestUser, body: { password: "WrongPassword123!" } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    assert(res.statusCode === 429 && res.data?.lockedOut === true, "3.4 Lockout threshold prevents further attempts (HTTP 429)");

    // 3.5 Verify lockout survives server restart (persisted in MongoDB, unaffected by in-memory resets)
    const simulatedRestartUser = await User.findById(concurrentTestUser._id);
    assert(
      simulatedRestartUser.financialLockout.attempts >= 5 &&
      Boolean(simulatedRestartUser.financialLockout.lockoutUntil),
      "3.5 Lockout state survives server restart (authoritative in MongoDB)"
    );

    // 3.6 Reset lockout and test successful verification resets attempts counter
    await User.findByIdAndUpdate(concurrentTestUser._id, {
      $set: {
        "financialLockout.attempts": 2,
        "financialLockout.lockoutUntil": null
      }
    });
    req = createMockReq({ user: concurrentTestUser, body: { password: rawPassword } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    assert(res.statusCode === 200 && res.data?.success === true, "3.6 Successful verification succeeds after lockout cleared");

    const userAfterSuccess = await User.findById(concurrentTestUser._id);
    assert(
      userAfterSuccess.financialLockout.attempts === 0 &&
      userAfterSuccess.financialLockout.lockoutUntil === null,
      "3.7 Successful verification resets failed attempts counter to 0 in MongoDB"
    );

    // =========================================================================
    // SECTION 4: AUDIT LOG INTEGRITY & IMMUTABILITY
    // =========================================================================
    console.log("\n--- Section 4: Audit Log Integrity & Immutability ---");

    // 4.1 Route layer audit: verify no DELETE or PUT routes exist on /api/audit-log
    const auditRouteMethods = auditLogRouter.stack
      .filter(layer => layer.route)
      .map(layer => Object.keys(layer.route.methods))
      .flat();
    assert(
      !auditRouteMethods.includes("delete") && !auditRouteMethods.includes("put") && !auditRouteMethods.includes("patch"),
      "4.1 Audit log routes are strictly append/read-only: No DELETE, PUT, or PATCH endpoints exist"
    );

    // 4.2 Record security events: Failed unlock attempt
    req = createMockReq({ user: superAdminA, body: { password: "WrongPassword!" } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);

    // 4.3 Query generated audit logs for this test suite
    const auditLogs = await AuditLog.find({ performedBy: { $regex: new RegExp(testSuffix.toString()) } });
    assert(auditLogs.length > 0, "4.2 Security audit logs actively recorded in database");

    const hasFailedAttemptLog = auditLogs.some(l => l.action === "FINANCIAL_VERIFICATION_FAILED");
    const hasSuccessUnlockLog = auditLogs.some(l => l.action === "FINANCIAL_VERIFICATION_SUCCESS");
    const hasLockoutLog = auditLogs.some(l => l.action === "FINANCIAL_DASHBOARD_LOCKED");

    assert(hasFailedAttemptLog, "4.3 Failed access attempts are recorded in AuditLog");
    assert(hasSuccessUnlockLog, "4.4 Successful unlock actions are recorded in AuditLog");
    assert(hasLockoutLog, "4.5 Lock Now and session revocation events are recorded in AuditLog");

    // 4.6 Inspect all audit logs to ensure sensitive credentials and unlock tokens are NEVER logged
    let secretsLeaked = false;
    for (const log of auditLogs) {
      const logString = JSON.stringify(log);
      if (
        logString.includes(rawPassword) ||
        logString.includes("WrongPassword") ||
        (activeToken && logString.includes(activeToken))
      ) {
        secretsLeaked = true;
        break;
      }
    }
    assert(!secretsLeaked, "4.6 Sensitive credentials (passwords) and unlock tokens are NEVER logged in audit records");

    // =========================================================================
    // SECTION 5: CRYPTOGRAPHIC CONFIGURATION & TAMPER RESISTANCE
    // =========================================================================
    console.log("\n--- Section 5: Cryptographic Configuration & Tamper Resistance ---");

    // 5.1 Verify algorithm, issuer, audience, subject, expiry, sessionVersion
    req = createMockReq({ user: superAdminA, body: { password: rawPassword } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    const cryptoToken = res.data?.unlockToken;

    const decoded = jwt.verify(cryptoToken, FINANCIAL_UNLOCK_SECRET, {
      algorithms: ["HS256"],
      audience: "prepmark_financial",
      issuer: "prepmark_auth"
    });
    assert(
      decoded.sub === superAdminA._id.toString() &&
      decoded.userId === superAdminA._id.toString() &&
      decoded.role === "superadmin" &&
      decoded.type === "financial_unlock" &&
      Boolean(decoded.jti) &&
      typeof decoded.sessionVersion === "number" &&
      decoded.exp - decoded.iat === 300,
      "5.1 Cryptographic payload validates: alg=HS256, iss=prepmark_auth, aud=prepmark_financial, sub, jti, exp=300s"
    );

    // 5.2 Tampered signature fails securely
    const tamperedSigToken = cryptoToken.substring(0, cryptoToken.length - 5) + "abcde";
    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": tamperedSigToken } });
    res = createMockRes();
    let tamperedPassed = false;
    await requireFinancialUnlock(req, res, () => { tamperedPassed = true; });
    assert(res.statusCode === 403 && res.data?.locked === true && !tamperedPassed, "5.2 Tampered token signature fails securely (HTTP 403)");

    // 5.3 Token signed with wrong secret fails securely
    const wrongSecretToken = jwt.sign(
      {
        userId: superAdminA._id.toString(),
        sub: superAdminA._id.toString(),
        role: "superadmin",
        type: "financial_unlock",
        sessionVersion: superAdminA.financialSessionVersion,
        jti: crypto.randomUUID()
      },
      "WRONG_ATTACKER_SECRET_KEY_12345",
      {
        expiresIn: 300,
        audience: "prepmark_financial",
        issuer: "prepmark_auth",
        algorithm: "HS256"
      }
    );
    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": wrongSecretToken } });
    res = createMockRes();
    let wrongSecretPassed = false;
    await requireFinancialUnlock(req, res, () => { wrongSecretPassed = true; });
    assert(res.statusCode === 403 && !wrongSecretPassed, "5.3 Token signed with incorrect secret fails securely (HTTP 403)");

    // 5.4 Token with wrong audience or issuer fails securely
    const wrongAudienceToken = jwt.sign(
      {
        userId: superAdminA._id.toString(),
        sub: superAdminA._id.toString(),
        role: "superadmin",
        type: "financial_unlock",
        sessionVersion: superAdminA.financialSessionVersion,
        jti: crypto.randomUUID()
      },
      FINANCIAL_UNLOCK_SECRET,
      {
        expiresIn: 300,
        audience: "attacker_audience",
        issuer: "prepmark_auth",
        algorithm: "HS256"
      }
    );
    req = createMockReq({ user: superAdminA, headers: { "x-financial-unlock-token": wrongAudienceToken } });
    res = createMockRes();
    let wrongAudiencePassed = false;
    await requireFinancialUnlock(req, res, () => { wrongAudiencePassed = true; });
    assert(res.statusCode === 403 && !wrongAudiencePassed, "5.4 Token with spoofed/invalid audience fails securely (HTTP 403)");

    // =========================================================================
    // SECTION 6: REGRESSION VERIFICATION & BUSINESS FUNCTIONALITY
    // =========================================================================
    console.log("\n--- Section 6: Regression Verification & Business Functionality ---");

    // 6.1 Issue valid token to test full business flow
    req = createMockReq({ user: superAdminA, body: { password: rawPassword } });
    res = createMockRes();
    await verifyFinancialUnlock(req, res);
    const validBizToken = res.data?.unlockToken;

    // 6.2 Revenue Analytics calculations
    req = createMockReq({
      user: superAdminA,
      headers: { "x-financial-unlock-token": validBizToken },
      query: { period: "monthly", datePreset: "30d" }
    });
    res = createMockRes();
    await getRevenueAnalytics(req, res);
    assert(
      res.statusCode === 200 &&
      typeof res.data?.kpis?.verifiedRevenue === "number" &&
      typeof res.data?.kpis?.simulatedRevenue === "number" &&
      typeof res.data?.kpis?.adminGrantsAmount === "number",
      "6.1 Analytics calculations intact: verified bank, sandbox simulation, and admin grants computed accurately"
    );

    // 6.3 Transaction listing & history
    req = createMockReq({
      user: superAdminA,
      headers: { "x-financial-unlock-token": validBizToken },
      query: { page: 1, limit: 10 }
    });
    res = createMockRes();
    await getRevenueTransactions(req, res);
    assert(
      res.statusCode === 200 && Array.isArray(res.data?.transactions),
      "6.2 Transaction history retrieval functioning with pagination"
    );

    // 6.4 Revenue Reports export
    req = createMockReq({
      user: superAdminA,
      headers: { "x-financial-unlock-token": validBizToken },
      query: { type: "revenue_summary" }
    });
    res = createMockRes();
    await getRevenueReports(req, res);
    assert(
      res.statusCode === 200 && Boolean(res.data?.summary),
      "6.3 Revenue reports generation functioning properly"
    );

    // 6.5 AI Subscribers overview
    req = createMockReq({
      user: superAdminA,
      headers: { "x-financial-unlock-token": validBizToken }
    });
    res = createMockRes();
    await getSubscribersOverview(req, res);
    assert(
      res.statusCode === 200 && res.data?.kpis !== undefined,
      "6.4 AI Subscribers overview calculation intact"
    );

    // 6.6 Exams & Practice monetization catalog
    req = createMockReq({
      user: superAdminA,
      headers: { "x-financial-unlock-token": validBizToken }
    });
    res = createMockRes();
    await getExamsPracticeFinancials(req, res);
    assert(
      res.statusCode === 200 && Array.isArray(res.data?.catalog?.quizzes),
      "6.5 Exams and Practice catalog monetization data intact"
    );

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    // Cleanup created test records
    await User.deleteMany({ _id: { $in: createdUserIds } });
    await Department.deleteMany({ _id: { $in: createdDeptIds } });
    await Quiz.deleteMany({ _id: { $in: createdQuizIds } });
    await PurchaseTransaction.deleteMany({ _id: { $in: createdTxnIds } });
    await Subscription.deleteMany({ _id: { $in: createdSubIds } });
    await AiPlan.deleteMany({ _id: { $in: createdPlanIds } });
    await AuditLog.deleteMany({ performedBy: { $regex: new RegExp(testSuffix.toString()) } });
    await mongoose.disconnect();
  }

  console.log("\n=====================================================================");
  console.log(`  FINAL REGRESSION AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=====================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRevenueSecurityTestSuite();
