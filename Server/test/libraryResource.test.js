const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Folder = require("../models/Folder");
const Resource = require("../models/Resource");
const User = require("../models/User");
const ExamSeries = require("../models/ExamSeries");
const libraryFolderService = require("../services/libraryFolderService");
const libraryResourceService = require("../services/libraryResourceService");
const cloudinaryService = require("../services/cloudinaryService");

async function runLibraryResourceSuite() {
  console.log("============================================================");
  console.log("  PREPMARK STUDY LIBRARY - PHASE 2 RESOURCE MANAGEMENT SUITE ");
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
  console.log("Connected to MongoDB for Library Resource Verification.\n");

  const dummyUserId = new mongoose.Types.ObjectId();
  const superAdminUser = { _id: new mongoose.Types.ObjectId(), role: "superadmin" };
  const ordinaryAdminUser = { _id: new mongoose.Types.ObjectId(), role: "admin" };

  const createdFolderIds = [];
  const createdResourceIds = [];
  let testExamSeries1 = null;
  let testExamSeries2 = null;

  // Mock Cloudinary upload & delete to prevent automated tests from depending on external network
  const originalUploadFile = cloudinaryService.uploadFile;
  const originalDeleteFile = cloudinaryService.deleteFile;

  let lastDeletedPublicId = null;
  let lastDeletedResourceType = null;
  let lastDeletedDeliveryType = null;

  cloudinaryService.uploadFile = async (buffer, folder, filename, options = {}) => {
    return {
      secure_url: `https://res.cloudinary.com/prepmark/raw/upload/v12345/study_library/${filename}`,
      public_id: `study_library/${filename.replace(/\.[^/.]+$/, "")}`,
      resource_type: "raw",
      bytes: buffer.length,
      format: "pdf"
    };
  };

  cloudinaryService.deleteFile = async (publicId, resourceType, deliveryType) => {
    lastDeletedPublicId = publicId;
    lastDeletedResourceType = resourceType;
    lastDeletedDeliveryType = deliveryType;
    return { result: "ok" };
  };

  try {
    const timestamp = Date.now();
    testExamSeries1 = await ExamSeries.create({
      title: `NEET Biology Series ${timestamp}`,
      slug: `neet-biology-${timestamp}`,
      isPublished: true,
      createdBy: dummyUserId
    });

    testExamSeries2 = await ExamSeries.create({
      title: `JEE Advanced Physics Series ${timestamp}`,
      slug: `jee-physics-${timestamp}`,
      isPublished: true,
      createdBy: dummyUserId
    });

    // Create global folder & exam-specific folders
    const globalFolder1 = await libraryFolderService.createFolder(
      { name: "Common Formulas", scope: "global" },
      dummyUserId
    );
    createdFolderIds.push(globalFolder1._id);

    const globalFolder2 = await libraryFolderService.createFolder(
      { name: "Reference Handbooks", scope: "global" },
      dummyUserId
    );
    createdFolderIds.push(globalFolder2._id);

    const examFolder1 = await libraryFolderService.createFolder(
      { name: "NEET Botany Chapters", scope: "exam_specific", examSeriesId: testExamSeries1._id },
      dummyUserId
    );
    createdFolderIds.push(examFolder1._id);

    const examFolder2 = await libraryFolderService.createFolder(
      { name: "JEE Mechanics", scope: "exam_specific", examSeriesId: testExamSeries2._id },
      dummyUserId
    );
    createdFolderIds.push(examFolder2._id);

    // -------------------------------------------------------------
    // 1. RESOURCE CREATION & METADATA STORAGE
    // -------------------------------------------------------------
    console.log("--- 1. Testing Resource Creation & Storage Metadata ---");

    // 1.1 Upload allowed PDF
    const dummyPdfBuffer = Buffer.from("%PDF-1.7 Test PDF Document Content");
    const mockFileObj = {
      buffer: dummyPdfBuffer,
      originalname: "neet_botany_notes.pdf",
      sanitizedFileName: "neet_botany_notes.pdf",
      mimetype: "application/pdf",
      size: dummyPdfBuffer.length
    };

    const pdfResource = await libraryResourceService.createFileResource(
      mockFileObj,
      {
        title: "Plant Physiology Master Notes",
        description: "Comprehensive notes for Chapter 11 to 15",
        folderId: examFolder1._id,
        accessTier: "exam_enrolled",
        isDownloadable: true
      },
      dummyUserId
    );
    createdResourceIds.push(pdfResource._id);

    assert(
      pdfResource &&
        pdfResource.title === "Plant Physiology Master Notes" &&
        pdfResource.folderId.equals(examFolder1._id) &&
        pdfResource.resourceType === "pdf" &&
        pdfResource.cloudinaryResourceType === "raw" &&
        pdfResource.cloudinaryDeliveryType === "authenticated" &&
        pdfResource.originalFileName === "neet_botany_notes.pdf" &&
        pdfResource.fileSize === dummyPdfBuffer.length &&
        pdfResource.accessTier === "exam_enrolled",
      "File-based resource created with complete Cloudinary metadata (including authenticated delivery type) and valid storage fields"
    );

    // 1.2 Create video link resource
    const linkResource = await libraryResourceService.createLinkOrNoteResource(
      {
        title: "Photosynthesis Video Lecture",
        description: "Detailed video breakdown of light and dark reactions",
        folderId: examFolder1._id,
        resourceType: "video_link",
        fileUrl: "https://www.youtube.com/watch?v=sample123",
        accessTier: "free"
      },
      dummyUserId
    );
    createdResourceIds.push(linkResource._id);
    assert(
      linkResource && linkResource.resourceType === "video_link" && linkResource.fileUrl.includes("youtube"),
      "Link-based resource created and validated with target URL"
    );

    // 1.3 Create text note resource
    const noteResource = await libraryResourceService.createLinkOrNoteResource(
      {
        title: "Exam Center Guidelines",
        description: "Reporting time: 8:30 AM. Prohibited items: smartwatches, calculators.",
        folderId: examFolder1._id,
        resourceType: "note",
        accessTier: "free"
      },
      dummyUserId
    );
    createdResourceIds.push(noteResource._id);
    assert(
      noteResource && noteResource.resourceType === "note" && noteResource.fileUrl === null,
      "Text note resource created without requiring external storage file URL"
    );

    // -------------------------------------------------------------
    // 2. RESOURCE MOVE & CROSS-SCOPE/CROSS-EXAM VALIDATION
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Resource Move & Isolation Rules ---");

    // 2.1 Cannot move resource from exam folder to global folder
    let crossScopeErr = null;
    try {
      await libraryResourceService.moveResource(pdfResource._id, globalFolder1._id, dummyUserId);
    } catch (e) {
      crossScopeErr = e;
    }
    assert(
      crossScopeErr && crossScopeErr.message.includes("different library scopes"),
      "Moving resource across different scopes (exam_specific to global) is rejected"
    );

    // 2.2 Cannot move resource to a different exam series folder
    let crossExamErr = null;
    try {
      await libraryResourceService.moveResource(pdfResource._id, examFolder2._id, dummyUserId);
    } catch (e) {
      crossExamErr = e;
    }
    assert(
      crossExamErr && crossExamErr.message.includes("different exam series"),
      "Moving resource across different exam series is rejected"
    );

    // 2.3 Valid move within same scope
    const globalResource = await libraryResourceService.createLinkOrNoteResource(
      {
        title: "Standard Physical Constants",
        folderId: globalFolder1._id,
        resourceType: "note",
        description: "c = 3x10^8 m/s, h = 6.626x10^-34 J s"
      },
      dummyUserId
    );
    createdResourceIds.push(globalResource._id);

    await libraryResourceService.moveResource(globalResource._id, globalFolder2._id, dummyUserId);
    const movedResource = await Resource.findById(globalResource._id);
    assert(
      movedResource.folderId.equals(globalFolder2._id),
      "Moving resource between folders within the same scope succeeds"
    );

    // -------------------------------------------------------------
    // 3. RESOURCE REORDERING, LISTING & PAGINATION
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Reordering & Search ---");

    const reorderRes = await libraryResourceService.reorderResources([
      { resourceId: pdfResource._id, order: 5 },
      { resourceId: linkResource._id, order: 10 }
    ]);
    assert(reorderRes.success && reorderRes.count === 2, "Reordering resources in folder succeeds");

    const listResult = await libraryResourceService.listResourcesInFolder(examFolder1._id, {
      search: "Physiology",
      page: 1,
      limit: 10
    });
    assert(
      listResult.totalCount === 1 && listResult.resources[0].title.includes("Physiology"),
      "Server-side keyword search filters resources accurately"
    );

    // -------------------------------------------------------------
    // 4. SOFT DELETION VS PERMANENT PURGE
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing Deletion & Cloudinary Asset Disposal ---");

    // 4.1 Soft deletion preserves file metadata and does not destroy Cloudinary asset
    lastDeletedPublicId = null;
    await libraryResourceService.softDeleteResource(pdfResource._id, dummyUserId);
    const softDeleted = await Resource.findById(pdfResource._id);

    assert(
      softDeleted.isDeleted === true && softDeleted.fileUrl !== null && lastDeletedPublicId === null,
      "Soft deletion marks resource as isDeleted: true while preserving Cloudinary file metadata"
    );

    // 4.2 Non-superadmin cannot permanently purge
    let purgeForbiddenErr = null;
    try {
      await libraryResourceService.permanentPurgeResource(pdfResource._id, ordinaryAdminUser, {
        confirmPurge: true
      });
    } catch (e) {
      purgeForbiddenErr = e;
    }
    assert(
      purgeForbiddenErr && purgeForbiddenErr.message.includes("restricted strictly to Super Administrators"),
      "Permanent purge rejected for ordinary admin roles"
    );

    // 4.3 Superadmin permanent purge uses actual stored resource_type
    const purgeResult = await libraryResourceService.permanentPurgeResource(pdfResource._id, superAdminUser, {
      confirmPurge: true
    });
    const purgedDoc = await Resource.findById(pdfResource._id);

    assert(
      purgeResult.purged === true &&
        purgedDoc === null &&
        lastDeletedPublicId === pdfResource.cloudinaryPublicId &&
        lastDeletedResourceType === "raw" &&
        lastDeletedDeliveryType === "authenticated",
      "Permanent purge destroys Cloudinary asset using stored resource_type and deliveryType and deletes record"
    );

  } finally {
    // Restore original Cloudinary methods
    cloudinaryService.uploadFile = originalUploadFile;
    cloudinaryService.deleteFile = originalDeleteFile;

    // Clean up created resources, folders, and exams
    if (createdResourceIds.length > 0) {
      await Resource.deleteMany({ _id: { $in: createdResourceIds } });
    }
    if (createdFolderIds.length > 0) {
      await Folder.deleteMany({ _id: { $in: createdFolderIds } });
    }
    if (testExamSeries1) await ExamSeries.findByIdAndDelete(testExamSeries1._id);
    if (testExamSeries2) await ExamSeries.findByIdAndDelete(testExamSeries2._id);

    await mongoose.disconnect();
    console.log("\nCleaned up test resource records and disconnected from MongoDB.");
  }

  console.log("\n============================================================");
  console.log(`  PHASE 2 RESOURCE SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLibraryResourceSuite().catch((err) => {
  console.error("Resource Suite Unhandled Exception:", err);
  process.exit(1);
});
