const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Department = require("../models/Department");
const AiPlan = require("../models/AiPlan");
const Subscription = require("../models/Subscription");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
const ExamSeries = require("../models/ExamSeries");
const FlashcardSet = require("../models/FlashcardSet");
const requirePermission = require("../middleware/permissionMiddleware");
const revenueController = require("../controllers/revenueController");

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

async function runRevenueDashboardSuite() {
  console.log("============================================================");
  console.log("  PREPMARK REVENUE MANAGEMENT - PHASE 2 DASHBOARD TEST SUITE ");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? "- " + detail : ""}`);
      failed++;
    }
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not found in environment.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB for Phase 2 Verification.\n");

  const testSuffix = Date.now();
  const createdUserIds = [];
  const createdDeptIds = [];
  const createdPlanIds = [];
  const createdSubIds = [];

  try {
    // -------------------------------------------------------------
    // Setup Departments & Users for RBAC testing
    // -------------------------------------------------------------
    const financeDept = await Department.create({
      name: `Finance Dept ${testSuffix}`,
      description: "Finance and Revenue Management",
      permissions: ["view_revenue", "manage_revenue"]
    });
    createdDeptIds.push(financeDept._id);

    const supportDept = await Department.create({
      name: `Support Dept ${testSuffix}`,
      description: "General Support without revenue access",
      permissions: ["manage_tickets"]
    });
    createdDeptIds.push(supportDept._id);

    const superAdmin = await User.create({
      fullName: `SuperAdmin ${testSuffix}`,
      email: `superadmin_${testSuffix}@example.com`,
      password: "HashedPassword123!",
      role: "superadmin",
      department: "Technical Team"
    });
    createdUserIds.push(superAdmin._id);

    const financeOfficer = await User.create({
      fullName: `FinanceOfficer ${testSuffix}`,
      email: `finance_${testSuffix}@example.com`,
      password: "HashedPassword123!",
      role: "admin",
      isSuperAdmin: false,
      department: financeDept.name
    });
    createdUserIds.push(financeOfficer._id);

    const supportStaff = await User.create({
      fullName: `SupportStaff ${testSuffix}`,
      email: `support_${testSuffix}@example.com`,
      password: "HashedPassword123!",
      role: "admin",
      isSuperAdmin: false,
      department: supportDept.name
    });
    createdUserIds.push(supportStaff._id);

    const studentUser = await User.create({
      fullName: `Student User ${testSuffix}`,
      email: `student_${testSuffix}@example.com`,
      password: "HashedPassword123!",
      role: "user",
      isSuperAdmin: false
    });
    createdUserIds.push(studentUser._id);

    // -------------------------------------------------------------
    // Setup Test Plans & Subscriptions with Known Financial Provenance
    // -------------------------------------------------------------
    const proPlan = await AiPlan.create({
      name: `Pro Monthly ${testSuffix}`,
      description: "Monthly Pro Access",
      originalPrice: 999,
      sellingPrice: 499,
      durationValue: 30,
      durationUnit: "days",
      maxAITests: 50,
      features: ["Custom AI Tests", "Deep Analytics"],
      status: "active",
      displayOrder: 1
    });
    createdPlanIds.push(proPlan._id);

    const freePlan = await AiPlan.create({
      name: `Free Trial ${testSuffix}`,
      description: "Free tier",
      originalPrice: 0,
      sellingPrice: 0,
      durationValue: 7,
      durationUnit: "days",
      maxAITests: 3,
      features: ["Basic Tests"],
      status: "active",
      displayOrder: 2
    });
    createdPlanIds.push(freePlan._id);

    // 1. Bank-verified transaction (razorpay)
    const verifiedSub = await Subscription.create({
      studentId: studentUser._id,
      planId: proPlan._id,
      planNameSnapshot: proPlan.name,
      purchaseId: `order_rzp_${testSuffix}`,
      amount: 499,
      status: "active",
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      aiTestsUsed: 15,
      maxAITests: 50,
      paymentGateway: "razorpay",
      gatewayTxnId: `pay_rzp_${testSuffix}`
    });
    createdSubIds.push(verifiedSub._id);

    // 2. Dev-simulated transaction (phonepe sandbox)
    const simSub = await Subscription.create({
      studentId: studentUser._id,
      planId: proPlan._id,
      planNameSnapshot: proPlan.name,
      purchaseId: `order_ppe_${testSuffix}`,
      amount: 499,
      status: "active",
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      aiTestsUsed: 20,
      maxAITests: 50,
      paymentGateway: "phonepe",
      gatewayTxnId: `pay_ppe_${testSuffix}`
    });
    createdSubIds.push(simSub._id);

    // 3. Admin grant (₹0 paid, gateway: admin_grant)
    const adminGrantSub = await Subscription.create({
      studentId: studentUser._id,
      planId: proPlan._id,
      planNameSnapshot: proPlan.name,
      purchaseId: `admin_grant_${testSuffix}`,
      amount: 0,
      status: "active",
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      aiTestsUsed: 5,
      maxAITests: 50,
      paymentGateway: "admin_grant",
      gatewayTxnId: `grant_${testSuffix}`
    });
    createdSubIds.push(adminGrantSub._id);

    // 4. Cancelled transaction
    const cancelledSub = await Subscription.create({
      studentId: studentUser._id,
      planId: proPlan._id,
      planNameSnapshot: proPlan.name,
      purchaseId: `order_cancel_${testSuffix}`,
      amount: 499,
      status: "cancelled",
      startDate: new Date(),
      expiryDate: new Date(),
      aiTestsUsed: 0,
      maxAITests: 50,
      paymentGateway: "razorpay",
      gatewayTxnId: `cancel_${testSuffix}`
    });
    createdSubIds.push(cancelledSub._id);

    // -------------------------------------------------------------
    // SECTION 1: GET /api/admin/revenue/analytics
    // -------------------------------------------------------------
    console.log("--- 1. Testing GET /api/admin/revenue/analytics ---");

    {
      const req = { user: superAdmin, query: {} };
      const res = createMockRes();
      await revenueController.getRevenueAnalytics(req, res);

      assert(res.statusCode === 200, "Analytics endpoint responds with 200 OK");
      assert(res.data && res.data.kpis, "Analytics response includes KPI metrics object");

      const kpis = res.data.kpis;
      assert(typeof kpis.totalRevenue === "number", "KPI totalRevenue is a valid number");
      assert(typeof kpis.verifiedRevenue === "number", "KPI verifiedRevenue is a valid number");
      assert(typeof kpis.simulatedRevenue === "number", "KPI simulatedRevenue is a valid number");
      assert(typeof kpis.adminGrantsAmount === "number", "KPI adminGrantsAmount is a valid number");

      // Verify verification notice
      const notice = res.data.verificationNotice;
      assert(notice && notice.gatewayStatus === "SANDBOX_SIMULATED", "Verification notice indicates sandbox simulation state");

      // Verify category breakdown honesty
      const categories = res.data.categoryBreakdown;
      assert(Array.isArray(categories) && categories.length > 0, "Category breakdown is provided");
      const examCategory = categories.find(c => c.category === "Mock Exams");
      assert(
        examCategory && examCategory.hasHistoricalLedger === false && examCategory.statusText.includes("Historical transaction data unavailable"),
        "Mock Exams category honestly declares historical transaction logs unavailable without fabrication"
      );

      const aiPlanCategory = categories.find(c => c.category === "AI Plans & Subscriptions");
      assert(
        aiPlanCategory && aiPlanCategory.hasHistoricalLedger === true,
        "AI Plans category correctly reflects live subscription transaction records"
      );
    }

    // Date presets test
    console.log("--- 1.1 Testing Analytics Date Filtering Presets ---");
    const presets = ["today", "7d", "30d", "this_month", "this_year"];
    for (const preset of presets) {
      const req = { user: superAdmin, query: { datePreset: preset } };
      const res = createMockRes();
      await revenueController.getRevenueAnalytics(req, res);
      assert(
        res.statusCode === 200 && res.data.kpis !== undefined,
        `Analytics handles date preset '${preset}' gracefully`
      );
    }

    // -------------------------------------------------------------
    // SECTION 2: GET /api/admin/revenue/transactions
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing GET /api/admin/revenue/transactions ---");

    {
      // 2.1 Basic pagination
      const req = { user: superAdmin, query: { page: 1, limit: 10 } };
      const res = createMockRes();
      await revenueController.getRevenueTransactions(req, res);

      assert(res.statusCode === 200, "Transactions endpoint responds with 200 OK");
      assert(res.data.success === true, "Transactions response indicates success");
      assert(Array.isArray(res.data.transactions), "Transactions list is an array");
      assert(res.data.pagination.page === 1, "Pagination page is 1");
      assert(res.data.pagination.limit === 10, "Pagination limit is 10");

      // 2.2 Filter by gateway = razorpay
      const reqRzp = { user: superAdmin, query: { gateway: "razorpay" } };
      const resRzp = createMockRes();
      await revenueController.getRevenueTransactions(reqRzp, resRzp);
      const rzpOnly = resRzp.data.transactions.every(t => t.paymentGateway === "razorpay");
      assert(rzpOnly, "Transactions gateway filter accurately isolates razorpay records");

      // 2.3 Filter by gateway = admin_grant
      const reqGrant = { user: superAdmin, query: { gateway: "admin_grant" } };
      const resGrant = createMockRes();
      await revenueController.getRevenueTransactions(reqGrant, resGrant);
      const grantOnly = resGrant.data.transactions.every(t => t.paymentGateway === "admin_grant");
      assert(grantOnly, "Transactions gateway filter accurately isolates admin_grant records");

      // 2.4 Filter by status = cancelled
      const reqCancel = { user: superAdmin, query: { status: "cancelled" } };
      const resCancel = createMockRes();
      await revenueController.getRevenueTransactions(reqCancel, resCancel);
      const cancelOnly = resCancel.data.transactions.every(t => t.status === "cancelled");
      assert(cancelOnly, "Transactions status filter accurately isolates cancelled records");

      // 2.5 Search by PurchaseId
      const reqSearch = { user: superAdmin, query: { search: `order_rzp_${testSuffix}` } };
      const resSearch = createMockRes();
      await revenueController.getRevenueTransactions(reqSearch, resSearch);
      assert(
        resSearch.data.transactions.some(t => t.purchaseId === `order_rzp_${testSuffix}`),
        "Transactions search query successfully matches specific purchaseId"
      );
    }

    // -------------------------------------------------------------
    // SECTION 3: GET /api/admin/revenue/customers
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing GET /api/admin/revenue/customers ---");

    {
      const req = { user: superAdmin, query: { search: studentUser.email } };
      const res = createMockRes();
      await revenueController.getRevenueCustomers(req, res);

      assert(res.statusCode === 200, "Customers endpoint responds with 200 OK");
      assert(res.data.success === true, "Customers response indicates success");
      assert(Array.isArray(res.data.customers), "Customers list is an array");

      const studentRecord = res.data.customers.find(c => c._id.toString() === studentUser._id.toString());
      assert(!!studentRecord, "Student user is present in financial customer directory");
      if (studentRecord) {
        assert(studentRecord.fullName === studentUser.fullName, "Customer full name is populated correctly");
        assert(typeof studentRecord.totalSpent === "number", "Customer totalSpent is computed");
        assert(typeof studentRecord.verifiedSpent === "number", "Customer verifiedSpent is separated");
        assert(typeof studentRecord.simulatedSpent === "number", "Customer simulatedSpent is separated");
        assert(typeof studentRecord.adminGrantsSpent === "number", "Customer adminGrantsSpent is separated");
        assert(studentRecord.simulatedSpent === 499, "Customer simulatedSpent matches PhonePe payment (₹499)");
      }
    }

    // -------------------------------------------------------------
    // SECTION 4: GET /api/admin/revenue/exams-practice
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing GET /api/admin/revenue/exams-practice ---");

    {
      const req = { user: superAdmin, query: {} };
      const res = createMockRes();
      await revenueController.getExamsPracticeFinancials(req, res);

      assert(res.statusCode === 200, "Exams-practice endpoint responds with 200 OK");
      assert(res.data.success === true, "Exams-practice response indicates success");

      const summary = res.data.summary;
      assert(typeof summary.paidQuizzesCount === "number", "Summary returns paidQuizzesCount");
      assert(typeof summary.paidPracticeCount === "number", "Summary returns paidPracticeCount");
      assert(typeof summary.paidSeriesCount === "number", "Summary returns paidSeriesCount");
      assert(typeof summary.paidFlashcardSetsCount === "number", "Summary returns paidFlashcardSetsCount");

      const provenanceNotice = res.data.provenanceNotice;
      assert(
        provenanceNotice && provenanceNotice.hasHistoricalLedger === false,
        "Honest provenance notice explains historical absence of separate exam transaction rows"
      );
    }

    // -------------------------------------------------------------
    // SECTION 5: GET /api/admin/revenue/ai-usage
    // -------------------------------------------------------------
    console.log("\n--- 5. Testing GET /api/admin/revenue/ai-usage ---");

    {
      const req = { user: superAdmin, query: {} };
      const res = createMockRes();
      await revenueController.getAiUsageAnalytics(req, res);

      assert(res.statusCode === 200, "AI usage endpoint responds with 200 OK");
      assert(res.data.success === true, "AI usage response indicates success");

      const metrics = res.data.metrics;
      assert(typeof metrics.totalAllocatedTests === "number", "Metrics provides totalAllocatedTests");
      assert(typeof metrics.totalUsedTests === "number", "Metrics provides totalUsedTests");
      assert(typeof metrics.overallUtilization === "number", "Metrics provides overallUtilization");

      assert(Array.isArray(res.data.usageByPlan), "usageByPlan is returned as an array");
    }

    // -------------------------------------------------------------
    // SECTION 6: RBAC ENFORCEMENT ACROSS ALL 5 ENDPOINTS
    // -------------------------------------------------------------
    console.log("\n--- 6. Testing RBAC Enforcement across all 5 Endpoints ---");

    const middleware = requirePermission(["view_revenue", "manage_revenue"]);

    async function checkPermission(user) {
      const req = { user };
      const res = createMockRes();
      let nextCalled = false;
      await middleware(req, res, () => {
        nextCalled = true;
      });
      return { nextCalled, statusCode: res.statusCode, data: res.data };
    }

    // 6.1 Super Admin: ALWAYS allowed
    const superAdminResult = await checkPermission(superAdmin);
    assert(superAdminResult.nextCalled === true, "Super Admin passes revenue permission check without restriction");

    // 6.2 Finance Officer (has view_revenue permission): ALLOWED
    const financeResult = await checkPermission(financeOfficer);
    assert(financeResult.nextCalled === true, "Finance staff with 'view_revenue' passes permission check");

    // 6.3 Support Staff (no revenue permission): 403 FORBIDDEN
    const supportResult = await checkPermission(supportStaff);
    assert(
      supportResult.nextCalled === false && supportResult.statusCode === 403,
      "Staff without revenue permission is blocked with 403 Forbidden"
    );

    // 6.4 Student User: 403 FORBIDDEN
    const studentResult = await checkPermission(studentUser);
    assert(
      studentResult.nextCalled === false && studentResult.statusCode === 403,
      "Student user is blocked with 403 Forbidden"
    );

    // 6.5 Unauthenticated: 401 UNAUTHORIZED
    const unauthResult = await checkPermission(null);
    assert(
      unauthResult.nextCalled === false && unauthResult.statusCode === 401,
      "Unauthenticated request is blocked with 401 Unauthorized"
    );

  } catch (err) {
    console.error("Test Suite execution failed with error:", err);
    failed++;
  } finally {
    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log("\nCleaning up test records...");
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdDeptIds.length > 0) {
      await Department.deleteMany({ _id: { $in: createdDeptIds } });
    }
    if (createdPlanIds.length > 0) {
      await AiPlan.deleteMany({ _id: { $in: createdPlanIds } });
    }
    if (createdSubIds.length > 0) {
      await Subscription.deleteMany({ _id: { $in: createdSubIds } });
    }
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.\n");

    console.log("============================================================");
    console.log(`  PHASE 2 DASHBOARD TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runRevenueDashboardSuite();
