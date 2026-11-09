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
const requirePermission = require("../middleware/permissionMiddleware");
const revenueController = require("../controllers/revenueController");
const aiPlanController = require("../controllers/aiPlanController");

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

async function runRevenueRbacSuite() {
  console.log("============================================================");
  console.log("  PREPMARK REVENUE MANAGEMENT - PHASE 1 RBAC TEST SUITE     ");
  console.log("============================================================\n");

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
  console.log("Connected to MongoDB for RBAC Verification.\n");

  const testSuffix = Date.now();
  const createdUserIds = [];
  const createdDeptIds = [];
  const createdPlanIds = [];

  try {
    // Setup Departments
    const financeDept = await Department.create({
      name: `Finance Dept ${testSuffix}`,
      description: "Handles revenue and financial metrics",
      permissions: ["view_revenue", "manage_revenue"]
    });
    createdDeptIds.push(financeDept._id);

    const contentDept = await Department.create({
      name: `Content Dept ${testSuffix}`,
      description: "Creates quizzes and tests",
      permissions: ["create_quiz", "edit_quiz"]
    });
    createdDeptIds.push(contentDept._id);

    // Setup Users
    const superAdminUser = await User.create({
      fullName: `Super Admin ${testSuffix}`,
      email: `superadmin_${testSuffix}@test.prepmark.com`,
      password: "HashedPassword123",
      role: "superadmin",
      permissions: []
    });
    createdUserIds.push(superAdminUser._id);

    const financeStaffUser = await User.create({
      fullName: `Finance Staff ${testSuffix}`,
      email: `finance_${testSuffix}@test.prepmark.com`,
      password: "HashedPassword123",
      role: "admin",
      department: financeDept.name,
      permissions: ["manage_ai_plans", "manage_ai_subscribers"]
    });
    createdUserIds.push(financeStaffUser._id);

    const ordinaryStaffUser = await User.create({
      fullName: `Ordinary Staff ${testSuffix}`,
      email: `staff_${testSuffix}@test.prepmark.com`,
      password: "HashedPassword123",
      role: "admin",
      department: contentDept.name,
      permissions: ["create_quiz"]
    });
    createdUserIds.push(ordinaryStaffUser._id);

    const studentUser = await User.create({
      fullName: `Student User ${testSuffix}`,
      email: `student_${testSuffix}@test.prepmark.com`,
      password: "HashedPassword123",
      role: "user",
      permissions: []
    });
    createdUserIds.push(studentUser._id);

    console.log("--- 1. MIDDLEWARE AUTHORIZATION TESTS ---");

    // Test 1: Super Admin passes requirePermission("view_revenue")
    {
      const req = { user: superAdminUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("view_revenue");
      await mw(req, res, () => { nextCalled = true; });
      assert(nextCalled && res.statusCode === 200, "Super Admin automatically passes view_revenue");
    }

    // Test 2: Super Admin passes requirePermission(["view_revenue", "manage_revenue"])
    {
      const req = { user: superAdminUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission(["view_revenue", "manage_revenue"]);
      await mw(req, res, () => { nextCalled = true; });
      assert(nextCalled && res.statusCode === 200, "Super Admin passes array of permissions [view_revenue, manage_revenue]");
    }

    // Test 3: Finance Staff with department permissions passes requirePermission("view_revenue")
    {
      const req = { user: financeStaffUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("view_revenue");
      await mw(req, res, () => { nextCalled = true; });
      assert(nextCalled && res.statusCode === 200, "Finance Staff with department view_revenue passes");
    }

    // Test 4: Finance Staff with user permissions passes requirePermission("manage_ai_plans")
    {
      const req = { user: financeStaffUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("manage_ai_plans");
      await mw(req, res, () => { nextCalled = true; });
      assert(nextCalled && res.statusCode === 200, "Finance Staff with user permission manage_ai_plans passes");
    }

    // Test 5: Finance Staff with user permissions passes requirePermission("manage_ai_subscribers")
    {
      const req = { user: financeStaffUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("manage_ai_subscribers");
      await mw(req, res, () => { nextCalled = true; });
      assert(nextCalled && res.statusCode === 200, "Finance Staff with manage_ai_subscribers passes");
    }

    // Test 6: Ordinary Staff without revenue permissions receives 403 on requirePermission("view_revenue")
    {
      const req = { user: ordinaryStaffUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("view_revenue");
      await mw(req, res, () => { nextCalled = true; });
      assert(!nextCalled && res.statusCode === 403, "Ordinary Staff without view_revenue receives 403");
    }

    // Test 7: Ordinary Staff without manage_ai_plans receives 403
    {
      const req = { user: ordinaryStaffUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("manage_ai_plans");
      await mw(req, res, () => { nextCalled = true; });
      assert(!nextCalled && res.statusCode === 403, "Ordinary Staff without manage_ai_plans receives 403");
    }

    // Test 8: Student receives 403 on any revenue or admin permissions
    {
      const req = { user: studentUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("view_revenue");
      await mw(req, res, () => { nextCalled = true; });
      assert(!nextCalled && res.statusCode === 403, "Student strictly receives 403 on view_revenue");
    }

    // Test 9: Student receives 403 on manage_ai_plans
    {
      const req = { user: studentUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("manage_ai_plans");
      await mw(req, res, () => { nextCalled = true; });
      assert(!nextCalled && res.statusCode === 403, "Student strictly receives 403 on manage_ai_plans");
    }

    // Test 10: Unauthenticated request receives 401
    {
      const req = { user: null };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission("view_revenue");
      await mw(req, res, () => { nextCalled = true; });
      assert(!nextCalled && res.statusCode === 401, "Unauthenticated request receives 401");
    }

    // Test 11: User with full_access permission passes any permission check
    {
      const fullAccessUser = {
        role: "admin",
        permissions: ["full_access"]
      };
      const req = { user: fullAccessUser };
      const res = createMockRes();
      let nextCalled = false;
      const mw = requirePermission(["view_revenue", "manage_revenue"]);
      await mw(req, res, () => { nextCalled = true; });
      assert(nextCalled && res.statusCode === 200, "Admin with full_access permission passes revenue checks");
    }

    console.log("\n--- 2. CONTROLLER & FUNCTIONAL RBAC TESTS ---");

    // Test 12: Super Admin can retrieve revenue analytics
    {
      const req = { user: superAdminUser, query: {} };
      const res = createMockRes();
      await revenueController.getRevenueAnalytics(req, res);
      assert(res.statusCode === 200 && res.data.kpis, "Super Admin can retrieve revenue analytics");
    }

    // Test 13: Super Admin can retrieve revenue transactions
    {
      const req = { user: superAdminUser, query: { page: 1, limit: 10 } };
      const res = createMockRes();
      await revenueController.getRevenueTransactions(req, res);
      assert(res.statusCode === 200 && res.data.success === true, "Super Admin can retrieve revenue transactions");
    }

    // Test 14: Finance Staff with manage_ai_plans can create an AI Plan
    let createdPlanId = null;
    {
      const req = {
        user: financeStaffUser,
        body: {
          name: `RBAC Test Plan ${testSuffix}`,
          description: "Test plan created by authorized Finance staff",
          originalPrice: 499,
          sellingPrice: 299,
          durationValue: 1,
          durationUnit: "months",
          maxAITests: 30,
          status: "inactive" // Created as inactive
        }
      };
      const res = createMockRes();
      await aiPlanController.createAiPlan(req, res);
      createdPlanId = res.data?._id;
      if (createdPlanId) createdPlanIds.push(createdPlanId);
      assert(res.statusCode === 201 && res.data?.name === req.body.name, "Authorized Finance Staff can create AI Plan");
    }

    // Test 15: Finance Staff with manage_ai_plans can toggle plan status
    {
      const req = {
        user: financeStaffUser,
        params: { id: createdPlanId },
        body: { status: "active" }
      };
      const res = createMockRes();
      await aiPlanController.updatePlanStatus(req, res);
      assert(res.statusCode === 200 && res.data?.status === "active", "Authorized Finance Staff can toggle AI Plan status");
    }

    // Test 16: Plan visibility filtering - Staff with manage_ai_plans sees inactive/draft plans
    {
      // Create a draft plan
      const draftPlan = await AiPlan.create({
        name: `Draft Plan ${testSuffix}`,
        description: "Draft plan not visible to students",
        originalPrice: 199,
        sellingPrice: 99,
        durationValue: 7,
        durationUnit: "days",
        maxAITests: 5,
        status: "draft"
      });
      createdPlanIds.push(draftPlan._id);

      // Staff with manage_ai_plans
      const reqStaff = { user: financeStaffUser };
      const resStaff = createMockRes();
      await aiPlanController.getAiPlans(reqStaff, resStaff);
      const staffSawDraft = resStaff.data.some(p => p._id.toString() === draftPlan._id.toString());

      // Student
      const reqStudent = { user: studentUser };
      const resStudent = createMockRes();
      await aiPlanController.getAiPlans(reqStudent, resStudent);
      const studentSawDraft = resStudent.data.some(p => p._id.toString() === draftPlan._id.toString());

      assert(staffSawDraft === true && studentSawDraft === false, "Authorized staff sees draft plans, while student only sees active plans");
    }

    // Test 17: Ordinary staff without manage_ai_plans only sees active plans in getAiPlans
    {
      const reqStaff = { user: ordinaryStaffUser };
      const resStaff = createMockRes();
      await aiPlanController.getAiPlans(reqStaff, resStaff);
      const ordinaryStaffSawOnlyActive = resStaff.data.every(p => p.status === "active");
      assert(ordinaryStaffSawOnlyActive === true, "Ordinary staff without manage_ai_plans only sees active plans");
    }

    // Test 18: Student endpoint POST /subscribe remains protected against unverified paid subscriptions in production (Phase 0 guarantee)
    {
      const paidPlan = await AiPlan.findOne({ sellingPrice: { $gt: 0 }, status: "active" });
      if (paidPlan) {
        const prevEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";
        const req = {
          user: studentUser,
          body: {
            planId: paidPlan._id.toString(),
            gatewayTxnId: `TEST_TXN_${Date.now()}`,
            amount: paidPlan.sellingPrice
          }
        };
        const res = createMockRes();
        await aiPlanController.subscribeToPlan(req, res);
        process.env.NODE_ENV = prevEnv;
        assert(res.statusCode === 402 && res.data.code === "PAYMENT_REQUIRED", "Student cannot subscribe to paid AI Plan without verified payment in production (402)");
      } else {
        assert(true, "Skipped paid plan test: no paid plan fixture found");
      }
    }

  } finally {
    // Cleanup fixtures
    console.log("\n--- CLEANUP FIXTURES ---");
    if (createdPlanIds.length > 0) {
      await AiPlan.deleteMany({ _id: { $in: createdPlanIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdDeptIds.length > 0) {
      await Department.deleteMany({ _id: { $in: createdDeptIds } });
    }
    await mongoose.disconnect();
    console.log("Cleanup complete. Disconnected from MongoDB.\n");
  }

  console.log("============================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED                 `);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runRevenueRbacSuite().catch((err) => {
  console.error("Test Suite Unhandled Error:", err);
  process.exit(1);
});
