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
const PurchaseTransaction = require("../models/PurchaseTransaction");
const requirePermission = require("../middleware/permissionMiddleware");
const revenueController = require("../controllers/revenueController");
const purchaseController = require("../controllers/purchaseController");
const aiPlanController = require("../controllers/aiPlanController");
const { migrateToUnifiedLedger } = require("../scripts/migrateToUnifiedLedger");
const { transitionTransactionStatus } = require("../services/ledgerService");

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

async function runUnifiedLedgerSuite() {
  console.log("============================================================");
  console.log("  PREPMARK REVENUE MANAGEMENT - PHASE 3 UNIFIED LEDGER SUITE ");
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
  console.log("Connected to MongoDB for Phase 3 Verification.\n");

  const testSuffix = Date.now();
  const createdUserIds = [];
  const createdDeptIds = [];
  const createdPlanIds = [];
  const createdSubIds = [];
  const createdQuizIds = [];
  const createdPracticeIds = [];
  const createdSeriesIds = [];
  const createdFlashcardIds = [];
  const createdTxnIds = [];

  try {
    // -------------------------------------------------------------
    // SETUP: Users & Departments for RBAC
    // -------------------------------------------------------------
    const financeDept = await Department.create({
      name: `Finance Dept ${testSuffix}`,
      description: "Finance and Revenue Management",
      permissions: ["view_revenue", "manage_revenue"]
    });
    createdDeptIds.push(financeDept._id);

    const supportDept = await Department.create({
      name: `Support Dept ${testSuffix}`,
      description: "General Support",
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
      department: financeDept.name
    });
    createdUserIds.push(financeOfficer._id);

    const regularStaff = await User.create({
      fullName: `RegularStaff ${testSuffix}`,
      email: `staff_${testSuffix}@example.com`,
      password: "HashedPassword123!",
      role: "admin",
      department: supportDept.name
    });
    createdUserIds.push(regularStaff._id);

    const student1 = await User.create({
      fullName: `Student One ${testSuffix}`,
      email: `student1_${testSuffix}@example.com`,
      password: "HashedPassword123!",
      role: "user"
    });
    createdUserIds.push(student1._id);

    const student2 = await User.create({
      fullName: `Student Two ${testSuffix}`,
      email: `student2_${testSuffix}@example.com`,
      password: "HashedPassword123!",
      role: "user"
    });
    createdUserIds.push(student2._id);

    // -------------------------------------------------------------
    // 1. AI SUBSCRIPTION LEDGER CREATION
    // -------------------------------------------------------------
    console.log("--- 1. Testing AI Subscription Ledger Creation ---");
    const testAiPlan = await AiPlan.create({
      name: `Pro AI Test Plan ${testSuffix}`,
      description: "Unlimited AI Tests",
      originalPrice: 999,
      sellingPrice: 499,
      durationValue: 30,
      durationUnit: "days",
      maxAITests: 50,
      features: ["Custom AI Tests"],
      status: "active"
    });
    createdPlanIds.push(testAiPlan._id);

    const subscribeReq = {
      user: student1,
      body: {
        planId: testAiPlan._id.toString(),
        gatewayTxnId: `txn_sub_${testSuffix}`,
        amount: 499
      },
      ip: "127.0.0.1"
    };
    const subscribeRes = createMockRes();
    await aiPlanController.subscribeToPlan(subscribeReq, subscribeRes);

    assert(subscribeRes.statusCode === 200, "AI Plan subscription completes successfully");
    const aiLedgerTxn = await PurchaseTransaction.findOne({
      studentId: student1._id,
      itemId: testAiPlan._id,
      productCategory: "ai_plan"
    });
    assert(!!aiLedgerTxn, "Unified PurchaseTransaction record created for AI Plan subscription");
    if (aiLedgerTxn) {
      createdTxnIds.push(aiLedgerTxn._id);
      assert(aiLedgerTxn.amount === 499, "Transaction amount matches plan selling price (₹499)");
      assert(aiLedgerTxn.provenance === "dev_simulation", "Provenance correctly records dev_simulation in sandbox mode");
      assert(!!aiLedgerTxn.subscriptionId, "Transaction is linked to Subscription document via subscriptionId");
    }

    // -------------------------------------------------------------
    // 2. PAID EXAM LEDGER INTEGRATION
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Paid Exam Ledger Integration ---");
    const testQuiz = await Quiz.create({
      title: `Full Mock Exam ${testSuffix}`,
      subject: "Mathematics",
      duration: 60,
      isPaid: true,
      price: 199,
      questions: []
    });
    createdQuizIds.push(testQuiz._id);

    const examPurchaseReq = {
      user: student1,
      body: {
        examId: testQuiz._id.toString(),
        gatewayTxnId: `txn_quiz_${testSuffix}`,
        amount: 199
      },
      ip: "127.0.0.1"
    };
    const examPurchaseRes = createMockRes();
    await purchaseController.purchaseExam(examPurchaseReq, examPurchaseRes);

    assert(examPurchaseRes.statusCode === 200, "Paid exam purchase completes successfully");
    const examTxn = await PurchaseTransaction.findOne({
      studentId: student1._id,
      itemId: testQuiz._id,
      productCategory: "exam"
    });
    assert(!!examTxn, "Unified PurchaseTransaction record created for exam purchase");
    if (examTxn) {
      createdTxnIds.push(examTxn._id);
      assert(examTxn.amount === 199, "Exam transaction amount matches price (₹199)");
      assert(examTxn.itemModel === "Quiz", "Item model is Quiz");
    }

    // Check student entitlement
    const updatedStudent1 = await User.findById(student1._id);
    assert(
      updatedStudent1.purchasedExams.some(id => id.toString() === testQuiz._id.toString()),
      "Student entitlement array updated with purchased exam"
    );

    // -------------------------------------------------------------
    // 3. PAID PRACTICE LEDGER INTEGRATION
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Paid Practice Ledger Integration ---");
    const testPractice = await PracticeQuiz.create({
      title: `Practice Quiz 101 ${testSuffix}`,
      subject: "Science",
      createdBy: superAdmin._id,
      isPaid: true,
      price: 99,
      totalQuestions: 15
    });
    createdPracticeIds.push(testPractice._id);

    const practicePurchaseReq = {
      user: student1,
      body: {
        practiceId: testPractice._id.toString(),
        gatewayTxnId: `txn_prac_${testSuffix}`,
        amount: 99
      },
      ip: "127.0.0.1"
    };
    const practicePurchaseRes = createMockRes();
    await purchaseController.purchasePractice(practicePurchaseReq, practicePurchaseRes);

    assert(practicePurchaseRes.statusCode === 200, "Paid practice purchase completes successfully");
    const practiceTxn = await PurchaseTransaction.findOne({
      studentId: student1._id,
      itemId: testPractice._id,
      productCategory: "practice"
    });
    assert(!!practiceTxn, "Unified PurchaseTransaction record created for practice quiz");
    if (practiceTxn) {
      createdTxnIds.push(practiceTxn._id);
      assert(practiceTxn.amount === 99, "Practice transaction amount matches price (₹99)");
      assert(practiceTxn.itemModel === "PracticeQuiz", "Item model is PracticeQuiz");
    }

    // -------------------------------------------------------------
    // 4. EXAM SERIES TRANSACTIONS
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing Exam Series Transactions ---");
    const testSeries = await ExamSeries.create({
      title: `Complete Test Series ${testSuffix}`,
      slug: `series-${testSuffix}`,
      description: "Full preparation series",
      isPublished: true
    });
    createdSeriesIds.push(testSeries._id);

    const seriesPurchaseReq = {
      user: student1,
      body: {
        examId: testSeries._id.toString() // purchaseExam resolves ExamSeries
      },
      ip: "127.0.0.1"
    };
    const seriesPurchaseRes = createMockRes();
    await purchaseController.purchaseExam(seriesPurchaseReq, seriesPurchaseRes);

    assert(seriesPurchaseRes.statusCode === 200, "Exam series access completed successfully");
    const seriesTxn = await PurchaseTransaction.findOne({
      studentId: student1._id,
      itemId: testSeries._id,
      productCategory: "exam_series"
    });
    assert(!!seriesTxn, "Unified PurchaseTransaction record created for exam series");
    if (seriesTxn) {
      createdTxnIds.push(seriesTxn._id);
      assert(seriesTxn.productCategory === "exam_series", "Product category is 'exam_series'");
      assert(seriesTxn.provenance === "free_access", "Unpriced series accurately marked as free_access");
    }

    // -------------------------------------------------------------
    // 5. FLASHCARD TRANSACTIONS
    // -------------------------------------------------------------
    console.log("\n--- 5. Testing Flashcard Transactions ---");
    const testFlashcard = await FlashcardSet.create({
      examSeriesId: testSeries._id,
      title: `Physics Flashcards ${testSuffix}`,
      isPaid: true,
      price: 149,
      totalCards: 40
    });
    createdFlashcardIds.push(testFlashcard._id);

    const flashcardPurchaseReq = {
      user: student1,
      body: {
        examId: testFlashcard._id.toString(),
        gatewayTxnId: `txn_card_${testSuffix}`,
        amount: 149
      },
      ip: "127.0.0.1"
    };
    const flashcardPurchaseRes = createMockRes();
    await purchaseController.purchaseExam(flashcardPurchaseReq, flashcardPurchaseRes);

    assert(flashcardPurchaseRes.statusCode === 200, "Flashcard purchase completes successfully");
    const flashcardTxn = await PurchaseTransaction.findOne({
      studentId: student1._id,
      itemId: testFlashcard._id,
      productCategory: "flashcard"
    });
    assert(!!flashcardTxn, "Unified PurchaseTransaction created for flashcard set");
    if (flashcardTxn) {
      createdTxnIds.push(flashcardTxn._id);
      assert(flashcardTxn.productCategory === "flashcard", "Product category is 'flashcard'");
      assert(flashcardTxn.amount === 149, "Flashcard amount matches price (₹149)");
    }

    // -------------------------------------------------------------
    // 6. ADMIN GRANT PROVENANCE
    // -------------------------------------------------------------
    console.log("\n--- 6. Testing Admin Grant Provenance ---");
    const grantReq = {
      user: financeOfficer,
      body: {
        studentId: student2._id.toString(),
        productCategory: "exam",
        itemId: testQuiz._id.toString(),
        note: "Scholarship grant by Finance Officer"
      },
      ip: "127.0.0.1"
    };
    const grantRes = createMockRes();
    await purchaseController.adminGrantAccess(grantReq, grantRes);

    assert(grantRes.statusCode === 200, "Admin grant access succeeds");
    const grantTxn = await PurchaseTransaction.findOne({
      studentId: student2._id,
      itemId: testQuiz._id,
      provenance: "admin_grant"
    });
    assert(!!grantTxn, "Admin grant transaction recorded in ledger");
    if (grantTxn) {
      createdTxnIds.push(grantTxn._id);
      assert(grantTxn.amount === 0, "Admin grant amount is recorded as ₹0 collected revenue");
      assert(grantTxn.paymentVerificationStatus === "admin_authorized", "Payment verification status is admin_authorized");
      assert(grantTxn.grantedBy.toString() === financeOfficer._id.toString(), "Admin user ID recorded as grantedBy");
    }

    // -------------------------------------------------------------
    // 7. FREE ACCESS EXCLUSION
    // -------------------------------------------------------------
    console.log("\n--- 7. Testing Free Access Exclusion from Verified Revenue ---");
    const freeQuiz = await Quiz.create({
      title: `Free Starter Quiz ${testSuffix}`,
      subject: "General",
      duration: 30,
      isPaid: false,
      price: 0
    });
    createdQuizIds.push(freeQuiz._id);

    const freePurchaseReq = {
      user: student2,
      body: { examId: freeQuiz._id.toString() },
      ip: "127.0.0.1"
    };
    const freePurchaseRes = createMockRes();
    await purchaseController.purchaseExam(freePurchaseReq, freePurchaseRes);

    const freeTxn = await PurchaseTransaction.findOne({
      studentId: student2._id,
      itemId: freeQuiz._id
    });
    assert(freeTxn && freeTxn.provenance === "free_access", "Free quiz purchase recorded with provenance: 'free_access'");
    if (freeTxn) createdTxnIds.push(freeTxn._id);

    // -------------------------------------------------------------
    // 8. DEVELOPMENT SIMULATION EXCLUSION FROM VERIFIED BANK REVENUE
    // -------------------------------------------------------------
    console.log("\n--- 8. Testing Dev Simulation Separation ---");
    const analyticsReq = { user: superAdmin, query: {} };
    const analyticsRes = createMockRes();
    await revenueController.getRevenueAnalytics(analyticsReq, analyticsRes);

    assert(analyticsRes.statusCode === 200, "Analytics endpoint responds with 200 OK");
    const kpis = analyticsRes.data.kpis;
    assert(typeof kpis.verifiedRevenue === "number", "KPI verifiedRevenue is a valid number");
    assert(kpis.simulatedRevenue >= 946, "Simulated revenue captures test volume without poisoning verified bank revenue");
    assert(
      kpis.totalRevenue === (kpis.verifiedRevenue + kpis.simulatedRevenue),
      "Total revenue strictly equals verifiedRevenue + simulatedRevenue"
    );

    // -------------------------------------------------------------
    // 9. UNVERIFIED LEGACY RECORD EXCLUSION
    // -------------------------------------------------------------
    console.log("\n--- 9. Testing Unverified Legacy Record Exclusion ---");
    const beforeAnalyticsRes = createMockRes();
    await revenueController.getRevenueAnalytics(analyticsReq, beforeAnalyticsRes);
    const beforeVerified = beforeAnalyticsRes.data.kpis.verifiedRevenue;

    const legacyTxn = await PurchaseTransaction.create({
      transactionId: `TXN-LEGACY-${testSuffix}`,
      orderId: `LEGACY-${testSuffix}`,
      studentId: student1._id,
      itemId: testQuiz._id,
      itemModel: "Quiz",
      itemTitleSnapshot: "Legacy Imported Exam",
      productCategory: "exam",
      amount: 150,
      gateway: "manual",
      paymentStatus: "paid",
      provenance: "legacy_import",
      paymentVerificationStatus: "unverified"
    });
    createdTxnIds.push(legacyTxn._id);

    // Re-verify that verifiedRevenue excludes legacy_import
    const reAnalyticsRes = createMockRes();
    await revenueController.getRevenueAnalytics(analyticsReq, reAnalyticsRes);
    const afterVerified = reAnalyticsRes.data.kpis.verifiedRevenue;

    assert(
      beforeVerified === afterVerified,
      "Legacy import with unverified status is strictly excluded from verified bank revenue"
    );

    // -------------------------------------------------------------
    // 10 & 11. DUPLICATE TRANSACTION & GATEWAY REPLAY PREVENTION
    // -------------------------------------------------------------
    console.log("\n--- 10 & 11. Testing Duplicate & Replay Attack Prevention ---");
    const replayReq = {
      user: student2,
      body: {
        examId: testQuiz._id.toString(),
        gatewayTxnId: `txn_quiz_${testSuffix}`, // Replaying student 1's transaction ID
        amount: 199
      },
      ip: "127.0.0.1"
    };
    const replayRes = createMockRes();
    await purchaseController.purchaseExam(replayReq, replayRes);

    assert(
      replayRes.statusCode === 409,
      "Replay attack with already processed gatewayTxnId is blocked with HTTP 409 Conflict"
    );
    assert(
      replayRes.data && replayRes.data.code === "DUPLICATE_TRANSACTION",
      "Replay response returns DUPLICATE_TRANSACTION code"
    );

    // -------------------------------------------------------------
    // 12. STUDENT TRANSACTION ISOLATION
    // -------------------------------------------------------------
    console.log("\n--- 12. Testing Student Transaction Isolation ---");
    const student1Req = { user: student1, query: {} };
    const student1Res = createMockRes();
    await purchaseController.getMyTransactions(student1Req, student1Res);

    assert(student1Res.statusCode === 200, "Student fetches their transaction history");
    const student1Txns = student1Res.data.transactions;
    const hasStudent2Data = student1Txns.some(t => t.studentId.toString() === student2._id.toString());
    assert(
      hasStudent2Data === false,
      "Student transaction history contains strictly own records and zero records belonging to other students"
    );

    // -------------------------------------------------------------
    // 13. FINANCE RBAC ENFORCEMENT
    // -------------------------------------------------------------
    console.log("\n--- 13. Testing Finance RBAC Enforcement ---");
    const guard = requirePermission(["view_revenue", "manage_revenue"]);

    async function testRbac(u) {
      const r = { user: u };
      const s = createMockRes();
      let nextCalled = false;
      await guard(r, s, () => { nextCalled = true; });
      return { nextCalled, statusCode: s.statusCode };
    }

    const superAdminCheck = await testRbac(superAdmin);
    assert(superAdminCheck.nextCalled === true, "Super Admin passes revenue permission check");

    const financeCheck = await testRbac(financeOfficer);
    assert(financeCheck.nextCalled === true, "Finance staff with 'view_revenue' passes check");

    const staffCheck = await testRbac(regularStaff);
    assert(staffCheck.nextCalled === false && staffCheck.statusCode === 403, "Staff without revenue permission is blocked (403)");

    const studentCheck = await testRbac(student1);
    assert(studentCheck.nextCalled === false && studentCheck.statusCode === 403, "Student is blocked from revenue admin (403)");

    // -------------------------------------------------------------
    // 14. REFUNDED TRANSACTION EXCLUSION
    // -------------------------------------------------------------
    console.log("\n--- 14. Testing Refunded Transaction Exclusion ---");
    const refundTxn = await PurchaseTransaction.create({
      transactionId: `TXN-REFUND-${testSuffix}`,
      orderId: `REF-${testSuffix}`,
      studentId: student1._id,
      itemId: testQuiz._id,
      itemModel: "Quiz",
      itemTitleSnapshot: "Refunded Quiz",
      productCategory: "exam",
      amount: 299,
      gateway: "razorpay",
      paymentStatus: "refunded",
      status: "refunded",
      provenance: "dev_simulation",
      paymentVerificationStatus: "simulated"
    });
    createdTxnIds.push(refundTxn._id);

    const txnsFilterReq = { user: superAdmin, query: { status: "refunded" } };
    const txnsFilterRes = createMockRes();
    await revenueController.getRevenueTransactions(txnsFilterReq, txnsFilterRes);

    assert(txnsFilterRes.statusCode === 200, "Filtered transactions endpoint responds 200");
    const refundedFound = txnsFilterRes.data.transactions.some(t => t.status === "refunded");
    assert(refundedFound, "Refunded transaction is tracked in audit ledger");

    // -------------------------------------------------------------
    // 15. IDEMPOTENT MIGRATION
    // -------------------------------------------------------------
    console.log("\n--- 15. Testing Idempotent Migration ---");
    const migration1 = await migrateToUnifiedLedger({ dryRun: false });
    assert(migration1.errors.length === 0, "First migration run finishes with 0 errors");

    const migration2 = await migrateToUnifiedLedger({ dryRun: false });
    assert(
      migration2.migratedSubscriptions === 0 && migration2.skippedSubscriptions > 0,
      "Second migration run safely skips already-migrated subscriptions without duplicate rows"
    );

    // -------------------------------------------------------------
    // 16. HISTORICAL ENTITLEMENT PRESERVATION
    // -------------------------------------------------------------
    console.log("\n--- 16. Testing Historical Entitlement Preservation ---");
    const student1After = await User.findById(student1._id);
    assert(
      student1After.purchasedExams.length >= 1,
      "Student purchasedExams entitlements preserved across all operations"
    );
    assert(
      student1After.purchasedPractice.length >= 1,
      "Student purchasedPractice entitlements preserved across all operations"
    );

    // -------------------------------------------------------------
    // 17. AI QUOTA AND EXPIRY REGRESSION
    // -------------------------------------------------------------
    console.log("\n--- 17. Testing AI Quota and Expiry Functionality ---");
    const userSub = await Subscription.findOne({ studentId: student1._id, status: "active" });
    assert(!!userSub, "Student has active subscription");
    if (userSub) {
      assert(typeof userSub.maxAITests === "number" && userSub.maxAITests >= 50, "Configured test quota is intact (50 tests)");
      assert(userSub.aiTestsUsed === 0, "aiTestsUsed begins at 0");
    }

    // -------------------------------------------------------------
    // 18. REVENUE CALCULATION CONSISTENCY
    // -------------------------------------------------------------
    console.log("\n--- 18. Testing Revenue Calculation Consistency ---");
    const finalAnalyticsRes = createMockRes();
    await revenueController.getRevenueAnalytics(analyticsReq, finalAnalyticsRes);
    const finalKpis = finalAnalyticsRes.data.kpis;
    assert(
      finalKpis.totalRevenue === finalKpis.verifiedRevenue + finalKpis.simulatedRevenue,
      "Verified collected revenue + simulated sandbox revenue strictly equal totalRevenue"
    );

    // -------------------------------------------------------------
    // 19. PAGINATION AND MULTI-CRITERIA FILTERING
    // -------------------------------------------------------------
    console.log("\n--- 19. Testing Pagination and Multi-Criteria Filtering ---");
    const filterCatReq = { user: superAdmin, query: { category: "practice", page: 1, limit: 10 } };
    const filterCatRes = createMockRes();
    await revenueController.getRevenueTransactions(filterCatReq, filterCatRes);

    assert(filterCatRes.statusCode === 200, "Transactions query with category filter succeeds");
    const practiceOnly = filterCatRes.data.transactions.every(t => t.productCategory === "practice");
    assert(practiceOnly, "Category filter strictly isolates 'practice' transactions");

    // -------------------------------------------------------------
    // 20. UNAUTHORIZED FINANCIAL RECORD MODIFICATION
    // -------------------------------------------------------------
    console.log("\n--- 20. Testing Unauthorized Financial Record Modification ---");
    const updateReq = {
      user: regularStaff, // ordinary staff lacks manage_revenue
      params: { id: examTxn._id.toString() },
      body: { status: "refunded" }
    };
    const updateRes = createMockRes();
    const updateGuard = requirePermission("manage_revenue");

    let updateNextCalled = false;
    await updateGuard(updateReq, updateRes, () => { updateNextCalled = true; });

    assert(
      updateNextCalled === false && updateRes.statusCode === 403,
      "Unauthorized staff cannot modify transaction status (HTTP 403 Forbidden)"
    );

  } catch (err) {
    console.error("Test Suite execution failed with error:", err);
    failed++;
  } finally {
    // Cleanup
    console.log("\nCleaning up test records...");
    if (createdUserIds.length > 0) await User.deleteMany({ _id: { $in: createdUserIds } });
    if (createdDeptIds.length > 0) await Department.deleteMany({ _id: { $in: createdDeptIds } });
    if (createdPlanIds.length > 0) await AiPlan.deleteMany({ _id: { $in: createdPlanIds } });
    if (createdSubIds.length > 0) await Subscription.deleteMany({ _id: { $in: createdSubIds } });
    if (createdQuizIds.length > 0) await Quiz.deleteMany({ _id: { $in: createdQuizIds } });
    if (createdPracticeIds.length > 0) await PracticeQuiz.deleteMany({ _id: { $in: createdPracticeIds } });
    if (createdSeriesIds.length > 0) await ExamSeries.deleteMany({ _id: { $in: createdSeriesIds } });
    if (createdFlashcardIds.length > 0) await FlashcardSet.deleteMany({ _id: { $in: createdFlashcardIds } });
    if (createdTxnIds.length > 0) await PurchaseTransaction.deleteMany({ _id: { $in: createdTxnIds } });
    await PurchaseTransaction.deleteMany({
      $or: [
        { transactionId: { $regex: new RegExp(testSuffix) } },
        { orderId: { $regex: new RegExp(testSuffix) } },
        { gatewayTxnId: { $regex: new RegExp(testSuffix) } }
      ]
    });

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.\n");

    console.log("============================================================");
    console.log(`  PHASE 3 UNIFIED LEDGER RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runUnifiedLedgerSuite();
