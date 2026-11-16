const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Folder = require("../models/Folder");
const Resource = require("../models/Resource");
const User = require("../models/User");
const ExamSeries = require("../models/ExamSeries");
const requirePermission = require("../middleware/permissionMiddleware");
const libraryFolderService = require("../services/libraryFolderService");
const libraryResourceService = require("../services/libraryResourceService");

function createMockReqRes(user) {
  const req = { user, headers: {} };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return { req, res };
}

async function runLibraryAccessSuite() {
  console.log("============================================================");
  console.log("  PREPMARK STUDY LIBRARY - PHASE 2 ACCESS & RBAC SUITE       ");
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
  console.log("Connected to MongoDB for Library Access & RBAC Verification.\n");

  const createdUserIds = [];
  const createdFolderIds = [];
  const createdResourceIds = [];
  let testExamSeries1 = null;

  try {
    const timestamp = Date.now();

    // 1. Setup ExamSeries
    testExamSeries1 = await ExamSeries.create({
      title: `Banking PO Exam Series ${timestamp}`,
      slug: `banking-po-${timestamp}`,
      isPublished: true
    });

    // 2. Setup Users with different roles and entitlements
    const freeStudent = await User.create({
      fullName: "Free Student",
      email: `free.student.${timestamp}@example.com`,
      password: "hashedPassword123",
      role: "user",
      isPremium: false,
      purchasedExams: []
    });
    createdUserIds.push(freeStudent._id);

    const premiumStudent = await User.create({
      fullName: "Premium Student",
      email: `premium.student.${timestamp}@example.com`,
      password: "hashedPassword123",
      role: "user",
      isPremium: true,
      premiumExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), // 30 days valid
      purchasedExams: []
    });
    createdUserIds.push(premiumStudent._id);

    const enrolledStudent = await User.create({
      fullName: "Enrolled Student",
      email: `enrolled.student.${timestamp}@example.com`,
      password: "hashedPassword123",
      role: "user",
      isPremium: false,
      purchasedExams: [testExamSeries1._id]
    });
    createdUserIds.push(enrolledStudent._id);

    const superAdminStaff = {
      _id: new mongoose.Types.ObjectId(),
      role: "superadmin",
      permissions: []
    };

    const unprivilegedStaff = {
      _id: new mongoose.Types.ObjectId(),
      role: "employee",
      permissions: []
    };

    const viewerStaff = {
      _id: new mongoose.Types.ObjectId(),
      role: "employee",
      permissions: ["view_library"]
    };

    const folderManagerStaff = {
      _id: new mongoose.Types.ObjectId(),
      role: "employee",
      permissions: ["manage_folders"]
    };

    const resourceManagerStaff = {
      _id: new mongoose.Types.ObjectId(),
      role: "employee",
      permissions: ["manage_resources"]
    };

    // 3. Setup Folders
    const globalFolder = await libraryFolderService.createFolder(
      { name: "Public General Knowledge", scope: "global" },
      superAdminStaff._id
    );
    createdFolderIds.push(globalFolder._id);

    const examFolder = await libraryFolderService.createFolder(
      {
        name: "Banking Financial Awareness",
        scope: "exam_specific",
        examSeriesId: testExamSeries1._id
      },
      superAdminStaff._id
    );
    createdFolderIds.push(examFolder._id);

    const subExamFolder = await libraryFolderService.createFolder(
      {
        name: "Monetary Policy In-Depth",
        parentId: examFolder._id
      },
      superAdminStaff._id
    );
    createdFolderIds.push(subExamFolder._id);

    // 4. Setup Resources
    const freeGlobalResource = await Resource.create({
      title: "Indian Constitution Preamble PDF",
      folderId: globalFolder._id,
      resourceType: "pdf",
      fileUrl: "https://res.cloudinary.com/prepmark/raw/upload/v1/preamble.pdf",
      cloudinaryPublicId: "study_library/preamble",
      originalFileName: "preamble.pdf",
      mimeType: "application/pdf",
      accessTier: "free",
      isDownloadable: true,
      isPublished: true,
      uploadedBy: superAdminStaff._id
    });
    createdResourceIds.push(freeGlobalResource._id);

    const premiumGlobalResource = await Resource.create({
      title: "Advanced Data Interpretation E-Book",
      folderId: globalFolder._id,
      resourceType: "pdf",
      fileUrl: "https://res.cloudinary.com/prepmark/raw/upload/v1/di_advanced.pdf",
      cloudinaryPublicId: "study_library/di_advanced",
      originalFileName: "di_advanced.pdf",
      mimeType: "application/pdf",
      accessTier: "premium_subscriber",
      isDownloadable: true,
      isPublished: true,
      uploadedBy: superAdminStaff._id
    });
    createdResourceIds.push(premiumGlobalResource._id);

    const examSpecificResource = await Resource.create({
      title: "Reserve Bank of India Directives 2026",
      folderId: examFolder._id,
      resourceType: "pdf",
      fileUrl: "https://res.cloudinary.com/prepmark/raw/upload/v1/rbi_2026.pdf",
      cloudinaryPublicId: "study_library/rbi_2026",
      originalFileName: "rbi_2026.pdf",
      mimeType: "application/pdf",
      accessTier: "exam_enrolled",
      isDownloadable: false, // Non-downloadable view only!
      isPublished: true,
      uploadedBy: superAdminStaff._id
    });
    createdResourceIds.push(examSpecificResource._id);

    const unpublishedResource = await Resource.create({
      title: "Draft Question Predictions",
      folderId: globalFolder._id,
      resourceType: "note",
      accessTier: "free",
      isPublished: false,
      uploadedBy: superAdminStaff._id
    });
    createdResourceIds.push(unpublishedResource._id);

    const deletedResource = await Resource.create({
      title: "Old Retired Notes",
      folderId: globalFolder._id,
      resourceType: "note",
      accessTier: "free",
      isPublished: true,
      isDeleted: true,
      uploadedBy: superAdminStaff._id
    });
    createdResourceIds.push(deletedResource._id);

    // -------------------------------------------------------------
    // 1. STUDENT ENTITLEMENTS & ACCESS VERIFICATION
    // -------------------------------------------------------------
    console.log("--- 1. Testing Student Access Control & Entitlement Tiers ---");

    // 1.1 Free global resource accessible to free student
    const freeView = await libraryResourceService.authorizeStudentAccess(
      freeGlobalResource._id,
      freeStudent,
      { mode: "view" }
    );
    assert(
      freeView &&
        freeView.deliveryUrl &&
        freeView.deliveryUrl.includes("/raw/download?timestamp=") &&
        freeView.deliveryUrl.includes("type=authenticated") &&
        freeView.deliveryUrl.includes("attachment=false") &&
        freeView.deliveryUrl.includes("signature=") &&
        freeView.resource.title === "Indian Constitution Preamble PDF",
      "Free global resource generates short-lived signed authenticated delivery URL with HMAC signature and attachment=false"
    );

    // 1.1b Expired premium subscription denied
    const expiredPremiumStudent = await User.create({
      fullName: "Expired Premium Student",
      email: `expired.student.${timestamp}@example.com`,
      password: "hashedPassword123",
      role: "user",
      isPremium: true,
      premiumExpiresAt: new Date(Date.now() - 24 * 3600 * 1000), // Expired yesterday
      purchasedExams: []
    });
    createdUserIds.push(expiredPremiumStudent._id);

    let expiredDeniedErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        premiumGlobalResource._id,
        expiredPremiumStudent,
        { mode: "view" }
      );
    } catch (e) {
      expiredDeniedErr = e;
    }
    assert(
      expiredDeniedErr && expiredDeniedErr.message.includes("requires an active subscription"),
      "Expired premium subscription is strictly rejected"
    );

    // 1.2 Premium resource denied without premium entitlement
    let premiumDeniedErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        premiumGlobalResource._id,
        freeStudent,
        { mode: "view" }
      );
    } catch (e) {
      premiumDeniedErr = e;
    }
    assert(
      premiumDeniedErr && premiumDeniedErr.message.includes("requires an active subscription"),
      "Premium resource denied to student without premium entitlement"
    );

    // 1.3 Premium resource accessible with valid entitlement
    const premiumView = await libraryResourceService.authorizeStudentAccess(
      premiumGlobalResource._id,
      premiumStudent,
      { mode: "view" }
    );
    assert(
      premiumView && premiumView.deliveryUrl,
      "Premium resource accessible to student holding valid premium subscription"
    );

    // 1.4 Exam-specific resource denied without exam enrollment
    let examDeniedErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        examSpecificResource._id,
        freeStudent,
        { mode: "view" }
      );
    } catch (e) {
      examDeniedErr = e;
    }
    assert(
      examDeniedErr && examDeniedErr.message.includes("not enrolled in or purchased this exam series"),
      "Exam-specific resource denied to student without enrollment"
    );

    // 1.5 Exam-specific resource accessible with valid exam entitlement (ObjectId)
    const examView = await libraryResourceService.authorizeStudentAccess(
      examSpecificResource._id,
      enrolledStudent,
      { mode: "view" }
    );
    assert(
      examView && examView.deliveryUrl,
      "Exam-specific resource accessible to enrolled student with ObjectId representation"
    );

    // 1.5b Exam entitlement with string-formatted ID
    const studentWithString = {
      _id: new mongoose.Types.ObjectId(),
      role: "user",
      isPremium: false,
      purchasedExams: [testExamSeries1._id.toString()]
    };
    const examViewString = await libraryResourceService.authorizeStudentAccess(
      examSpecificResource._id,
      studentWithString,
      { mode: "view" }
    );
    assert(
      examViewString && examViewString.deliveryUrl,
      "Exam-specific resource accessible to student holding plain string ID representation in purchasedExams"
    );

    // 1.5c Exam entitlement with populated document object representation
    const studentWithPopulated = {
      _id: new mongoose.Types.ObjectId(),
      role: "user",
      isPremium: false,
      purchasedExams: [{ _id: testExamSeries1._id, title: "Populated Exam Series" }]
    };
    const examViewPopulated = await libraryResourceService.authorizeStudentAccess(
      examSpecificResource._id,
      studentWithPopulated,
      { mode: "view" }
    );
    assert(
      examViewPopulated && examViewPopulated.deliveryUrl,
      "Exam-specific resource accessible to student holding populated document representation in purchasedExams"
    );

    // 1.5d Exam entitlement handling null or undefined purchasedExams
    const studentWithNullPurchased = {
      _id: new mongoose.Types.ObjectId(),
      role: "user",
      isPremium: false,
      purchasedExams: null
    };
    let nullPurchasedErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        examSpecificResource._id,
        studentWithNullPurchased,
        { mode: "view" }
      );
    } catch (e) {
      nullPurchasedErr = e;
    }
    assert(
      nullPurchasedErr && nullPurchasedErr.message.includes("not enrolled in or purchased this exam series"),
      "Student with null purchasedExams is cleanly denied access without crash"
    );

    // 1.5e Exam entitlement handling malformed or invalid string IDs
    const studentWithMalformedId = {
      _id: new mongoose.Types.ObjectId(),
      role: "user",
      isPremium: false,
      purchasedExams: ["invalid-malformed-mongo-id-123"]
    };
    let malformedIdErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        examSpecificResource._id,
        studentWithMalformedId,
        { mode: "view" }
      );
    } catch (e) {
      malformedIdErr = e;
    }
    assert(
      malformedIdErr && malformedIdErr.message.includes("not enrolled in or purchased this exam series"),
      "Student with malformed IDs in purchasedExams is cleanly denied access without crash"
    );

    // 1.6 Unpublished resource denied
    let unpubErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        unpublishedResource._id,
        freeStudent,
        { mode: "view" }
      );
    } catch (e) {
      unpubErr = e;
    }
    assert(
      unpubErr && unpubErr.message.includes("unpublished"),
      "Unpublished resource access is strictly denied to students"
    );

    // 1.7 Deleted resource denied
    let delErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        deletedResource._id,
        freeStudent,
        { mode: "view" }
      );
    } catch (e) {
      delErr = e;
    }
    assert(
      delErr && delErr.message.includes("not found or is currently unpublished"),
      "Soft-deleted resource is inaccessible to students"
    );

    // 1.8 Inactive or deleted ancestor blocks access
    const resourceInSubFolder = await Resource.create({
      title: "Repo Rate Impact 2026",
      folderId: subExamFolder._id,
      resourceType: "note",
      accessTier: "exam_enrolled",
      isPublished: true,
      uploadedBy: superAdminStaff._id
    });
    createdResourceIds.push(resourceInSubFolder._id);

    // Deactivate parent folder
    examFolder.isActive = false;
    await examFolder.save();

    let blockedAncestorErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        resourceInSubFolder._id,
        enrolledStudent,
        { mode: "view" }
      );
    } catch (e) {
      blockedAncestorErr = e;
    }
    assert(
      blockedAncestorErr && blockedAncestorErr.message.includes("blocked by an archived parent folder"),
      "Resource access is strictly blocked when any ancestor folder is inactive or deleted"
    );

    // Restore parent folder
    examFolder.isActive = true;
    await examFolder.save();

    // 1.9 Non-downloadable resource cannot be downloaded
    let downloadBlockErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        examSpecificResource._id,
        enrolledStudent,
        { mode: "download" }
      );
    } catch (e) {
      downloadBlockErr = e;
    }
    assert(
      downloadBlockErr && downloadBlockErr.message.includes("cannot be downloaded"),
      "Resource with isDownloadable: false blocks download requests while permitting viewing"
    );

    // 1.10 ID guessing protection: Non-existent or random ObjectId throws clean error
    let guessErr = null;
    try {
      await libraryResourceService.authorizeStudentAccess(
        new mongoose.Types.ObjectId(),
        enrolledStudent,
        { mode: "view" }
      );
    } catch (e) {
      guessErr = e;
    }
    assert(guessErr !== null, "Direct ID guessing of non-existent resource returns clean denial");

    // 1.11 Fail-closed Cloudinary signed delivery: no fallback to public/insecure URLs on error
    const cloudinaryService = require("../services/cloudinaryService");
    let failClosedViewErr = null;
    try {
      cloudinaryService.generateSignedViewUrl("");
    } catch (e) {
      failClosedViewErr = e;
    }
    assert(
      failClosedViewErr && failClosedViewErr.message.includes("publicId is required"),
      "generateSignedViewUrl fails closed when publicId is missing, preventing insecure URL generation"
    );

    let failClosedDownloadErr = null;
    try {
      cloudinaryService.generateSignedDownloadUrl("");
    } catch (e) {
      failClosedDownloadErr = e;
    }
    assert(
      failClosedDownloadErr && failClosedDownloadErr.message.includes("publicId is required"),
      "generateSignedDownloadUrl fails closed when publicId is missing, preventing insecure URL generation"
    );

    // 1.12 Verified parameters of private signed delivery URL
    const testViewUrl = cloudinaryService.generateSignedViewUrl(
      "study_library/test_doc",
      "pdf",
      "raw",
      "authenticated",
      3600
    );
    assert(
      testViewUrl &&
        testViewUrl.includes("/raw/download?timestamp=") &&
        testViewUrl.includes("type=authenticated") &&
        testViewUrl.includes("attachment=false") &&
        testViewUrl.includes("signature="),
      "Signed view URL complies with private_download_url specification with attachment=false and signature"
    );

    // -------------------------------------------------------------
    // 2. RBAC PERMISSION MIDDLEWARE VERIFICATION
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing RBAC Permission Middleware ---");

    // 2.1 Super Admin always passes view, folder management, and resource management
    const mwView = requirePermission(["view_library", "manage_folders", "manage_resources"]);
    const mwFolder = requirePermission("manage_folders");
    const mwResource = requirePermission("manage_resources");

    let superAdminPassed = false;
    const { req: saReq, res: saRes } = createMockReqRes(superAdminStaff);
    await mwView(saReq, saRes, () => {
      superAdminPassed = true;
    });
    assert(superAdminPassed, "Super Admin bypasses permission checks and passes view_library");

    let superAdminFolderPassed = false;
    await mwFolder(saReq, saRes, () => {
      superAdminFolderPassed = true;
    });
    assert(superAdminFolderPassed, "Super Admin passes manage_folders check");

    // 2.2 Unprivileged staff blocked
    let unprivPassed = false;
    const { req: unprivReq, res: unprivRes } = createMockReqRes(unprivilegedStaff);
    await mwView(unprivReq, unprivRes, () => {
      unprivPassed = true;
    });
    assert(!unprivPassed && unprivRes.statusCode === 403, "Staff without permissions is blocked with 403 Forbidden");

    // 2.3 view_library staff passes view check but blocked from mutating folders
    let viewerPassed = false;
    const { req: viewReq, res: viewRes } = createMockReqRes(viewerStaff);
    await mwView(viewReq, viewRes, () => {
      viewerPassed = true;
    });
    assert(viewerPassed, "Staff with 'view_library' permission passes library viewing check");

    let viewerFolderPassed = false;
    await mwFolder(viewReq, viewRes, () => {
      viewerFolderPassed = true;
    });
    assert(
      !viewerFolderPassed && viewRes.statusCode === 403,
      "Staff with only 'view_library' is blocked from mutating folders"
    );

    // 2.4 manage_folders staff passes folder check but blocked from managing resources
    let folderManagerPassed = false;
    const { req: fReq, res: fRes } = createMockReqRes(folderManagerStaff);
    await mwFolder(fReq, fRes, () => {
      folderManagerPassed = true;
    });
    assert(folderManagerPassed, "Staff with 'manage_folders' permission passes folder management check");

    let fManagerResourcePassed = false;
    await mwResource(fReq, fRes, () => {
      fManagerResourcePassed = true;
    });
    assert(
      !fManagerResourcePassed && fRes.statusCode === 403,
      "Staff with only 'manage_folders' is blocked from managing resources"
    );

    // 2.5 manage_resources staff passes resource check
    let resourceManagerPassed = false;
    const { req: rReq, res: rRes } = createMockReqRes(resourceManagerStaff);
    await mwResource(rReq, rRes, () => {
      resourceManagerPassed = true;
    });
    assert(resourceManagerPassed, "Staff with 'manage_resources' permission passes resource management check");

  } finally {
    // Clean up created records
    if (createdResourceIds.length > 0) {
      await Resource.deleteMany({ _id: { $in: createdResourceIds } });
    }
    if (createdFolderIds.length > 0) {
      await Folder.deleteMany({ _id: { $in: createdFolderIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (testExamSeries1) await ExamSeries.findByIdAndDelete(testExamSeries1._id);

    await mongoose.disconnect();
    console.log("\nCleaned up test access records and disconnected from MongoDB.");
  }

  console.log("\n============================================================");
  console.log(`  PHASE 2 ACCESS & RBAC SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLibraryAccessSuite().catch((err) => {
  console.error("Access Suite Unhandled Exception:", err);
  process.exit(1);
});
