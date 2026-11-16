const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Folder = require("../models/Folder");
const Resource = require("../models/Resource");
const User = require("../models/User");
const ExamSeries = require("../models/ExamSeries");
const {
  libraryUpload,
  handleLibrarySingleUpload,
  sanitizeFileName,
  verifyFileMagicNumber,
  isAllowedMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
} = require("../middleware/libraryUploadMiddleware");

async function runLibraryPhase1Tests() {
  console.log("============================================================");
  console.log("  PREPMARK STUDY LIBRARY - PHASE 1 ARCHITECTURE & MODEL SUITE ");
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
  console.log("Connected to MongoDB for Phase 1 Library Verification.\n");

  // Create temporary reference documents for testing
  const dummyUserId = new mongoose.Types.ObjectId();
  const dummyExamSeriesId = new mongoose.Types.ObjectId();
  const createdFolderIds = [];
  const createdResourceIds = [];

  try {
    // -------------------------------------------------------------
    // 1. FOLDER MODEL VALIDATION TESTS
    // -------------------------------------------------------------
    console.log("--- 1. Testing Folder Model Validations ---");

    // 1.1 Folder model required fields
    const missingNameFolder = new Folder({
      createdBy: dummyUserId,
      scope: "global"
    });
    let nameErr = null;
    try {
      await missingNameFolder.validate();
    } catch (e) {
      nameErr = e;
    }
    assert(
      nameErr && nameErr.errors && nameErr.errors.name,
      "Folder model enforces required 'name' field"
    );

    const missingCreatorFolder = new Folder({
      name: "Test Folder",
      scope: "global"
    });
    let creatorErr = null;
    try {
      await missingCreatorFolder.validate();
    } catch (e) {
      creatorErr = e;
    }
    assert(
      creatorErr && creatorErr.errors && creatorErr.errors.createdBy,
      "Folder model enforces required 'createdBy' field"
    );

    // 1.2 Valid Global Root Folder
    const validGlobalRoot = new Folder({
      name: "General Reference Materials",
      description: "Platform-wide study guides and reference charts",
      scope: "global",
      parentId: null,
      examSeriesId: null,
      createdBy: dummyUserId
    });
    let globalRootErr = null;
    try {
      await validGlobalRoot.validate();
      await validGlobalRoot.save();
      createdFolderIds.push(validGlobalRoot._id);
    } catch (e) {
      globalRootErr = e;
    }
    assert(
      !globalRootErr && validGlobalRoot.scope === "global" && validGlobalRoot.parentId === null,
      "Valid global root folder passes validation and persists cleanly"
    );

    // 1.3 Valid Exam-Specific Root Folder
    const validExamRoot = new Folder({
      name: "SSC CGL 2026 Core Syllabus",
      description: "Tier 1 and Tier 2 examination study materials",
      scope: "exam_specific",
      parentId: null,
      examSeriesId: dummyExamSeriesId,
      createdBy: dummyUserId
    });
    let examRootErr = null;
    try {
      await validExamRoot.validate();
      await validExamRoot.save();
      createdFolderIds.push(validExamRoot._id);
    } catch (e) {
      examRootErr = e;
    }
    assert(
      !examRootErr && validExamRoot.scope === "exam_specific" && validExamRoot.examSeriesId.equals(dummyExamSeriesId),
      "Valid exam-specific root folder passes validation and persists cleanly"
    );

    // 1.4 Invalid Global Folder with examSeriesId
    const invalidGlobalWithExam = new Folder({
      name: "Invalid Global Folder",
      scope: "global",
      parentId: null,
      examSeriesId: dummyExamSeriesId,
      createdBy: dummyUserId
    });
    let invalidGlobalErr = null;
    try {
      await invalidGlobalWithExam.validate();
    } catch (e) {
      invalidGlobalErr = e;
    }
    assert(
      invalidGlobalErr && invalidGlobalErr.errors && invalidGlobalErr.errors.examSeriesId,
      "Global folder with examSeriesId fails validation as expected"
    );

    // 1.5 Invalid Exam-Specific Folder without examSeriesId
    const invalidExamWithoutId = new Folder({
      name: "Invalid Exam Folder",
      scope: "exam_specific",
      parentId: null,
      examSeriesId: null,
      createdBy: dummyUserId
    });
    let invalidExamErr = null;
    try {
      await invalidExamWithoutId.validate();
    } catch (e) {
      invalidExamErr = e;
    }
    assert(
      invalidExamErr && invalidExamErr.errors && invalidExamErr.errors.examSeriesId,
      "Exam-specific folder without examSeriesId fails validation as expected"
    );

    // 1.6 Subfolder with Ancestors Array
    const validSubFolder = new Folder({
      name: "Quantitative Aptitude Formulas",
      parentId: validGlobalRoot._id,
      ancestors: [validGlobalRoot._id],
      scope: "global",
      createdBy: dummyUserId,
      order: 1
    });
    let subFolderErr = null;
    try {
      await validSubFolder.validate();
      await validSubFolder.save();
      createdFolderIds.push(validSubFolder._id);
    } catch (e) {
      subFolderErr = e;
    }
    assert(
      !subFolderErr && validSubFolder.ancestors.length === 1 && validSubFolder.parentId.equals(validGlobalRoot._id),
      "Nested subfolder correctly maintains parentId and ancestor IDs array"
    );

    // 1.7 Folder Virtuals (children and resources)
    const folderWithVirtuals = await Folder.findById(validGlobalRoot._id)
      .populate("children")
      .populate("resources");
    assert(
      folderWithVirtuals && Array.isArray(folderWithVirtuals.children) && folderWithVirtuals.children.length === 1,
      "Folder virtual 'children' populates child folders successfully"
    );

    // -------------------------------------------------------------
    // 2. RESOURCE MODEL VALIDATION TESTS
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Resource Model Validations ---");

    // 2.1 Required title, folderId, and uploadedBy
    const missingFieldsResource = new Resource({
      resourceType: "note"
    });
    let resFieldsErr = null;
    try {
      await missingFieldsResource.validate();
    } catch (e) {
      resFieldsErr = e;
    }
    assert(
      resFieldsErr && resFieldsErr.errors && resFieldsErr.errors.title && resFieldsErr.errors.folderId && resFieldsErr.errors.uploadedBy,
      "Resource model enforces required title, folderId, and uploadedBy fields"
    );

    // 2.2 File-based Resource (PDF) requires fileUrl, mimeType, and originalFileName
    const invalidFileResource = new Resource({
      title: "Missing Storage Info PDF",
      folderId: validGlobalRoot._id,
      resourceType: "pdf",
      uploadedBy: dummyUserId
    });
    let invalidFileErr = null;
    try {
      await invalidFileResource.validate();
    } catch (e) {
      invalidFileErr = e;
    }
    assert(
      invalidFileErr && invalidFileErr.errors.fileUrl && invalidFileErr.errors.mimeType && invalidFileErr.errors.originalFileName,
      "File-based resource (pdf) rejects missing fileUrl, mimeType, or originalFileName"
    );

    // 2.3 Valid File-based Resource (PDF)
    const validPdfResource = new Resource({
      title: "Quantitative Aptitude Complete Cheat Sheet",
      description: "Comprehensive formula reference for all SSC & Banking tests",
      folderId: validSubFolder._id,
      resourceType: "pdf",
      fileUrl: "https://res.cloudinary.com/prepmark/raw/upload/v12345/cheat_sheet.pdf",
      cloudinaryPublicId: "study_library/cheat_sheet_12345",
      originalFileName: "cheat_sheet.pdf",
      mimeType: "application/pdf",
      fileSize: 2450892,
      accessTier: "free",
      uploadedBy: dummyUserId
    });
    let validPdfErr = null;
    try {
      await validPdfResource.validate();
      await validPdfResource.save();
      createdResourceIds.push(validPdfResource._id);
    } catch (e) {
      validPdfErr = e;
    }
    assert(
      !validPdfErr && validPdfResource.resourceType === "pdf" && validPdfResource.fileSize === 2450892,
      "Valid file-based resource (pdf) validates and persists successfully"
    );

    // 2.4 Link-based Resource requires target URL in fileUrl
    const missingLinkResource = new Resource({
      title: "YouTube Video Lecture",
      folderId: validSubFolder._id,
      resourceType: "video_link",
      uploadedBy: dummyUserId
    });
    let missingLinkErr = null;
    try {
      await missingLinkResource.validate();
    } catch (e) {
      missingLinkErr = e;
    }
    assert(
      missingLinkErr && missingLinkErr.errors.fileUrl,
      "Link-based resource rejects missing target URL in fileUrl"
    );

    const validLinkResource = new Resource({
      title: "Number Systems Detailed Lecture",
      folderId: validSubFolder._id,
      resourceType: "video_link",
      fileUrl: "https://www.youtube.com/watch?v=dummy1234",
      accessTier: "premium_subscriber",
      uploadedBy: dummyUserId
    });
    let validLinkErr = null;
    try {
      await validLinkResource.validate();
      await validLinkResource.save();
      createdResourceIds.push(validLinkResource._id);
    } catch (e) {
      validLinkErr = e;
    }
    assert(
      !validLinkErr && validLinkResource.resourceType === "video_link",
      "Valid link-based resource validates and saves successfully"
    );

    // 2.5 Text-based Note Resource can exist without fileUrl
    const validNoteResource = new Resource({
      title: "Exam Day Instructions & Important Rules",
      description: "Students must carry admit card, original photo ID, and blue ballpoint pen.",
      folderId: validSubFolder._id,
      resourceType: "note",
      accessTier: "free",
      uploadedBy: dummyUserId
    });
    let validNoteErr = null;
    try {
      await validNoteResource.validate();
      await validNoteResource.save();
      createdResourceIds.push(validNoteResource._id);
    } catch (e) {
      validNoteErr = e;
    }
    assert(
      !validNoteErr && validNoteResource.resourceType === "note" && validNoteResource.fileUrl === null,
      "Text-based note resource validates cleanly without storage file metadata"
    );

    // -------------------------------------------------------------
    // 3. UPLOAD MIDDLEWARE VALIDATION TESTS
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Library Upload Middleware ---");

    // 3.1 MIME Type Allowlist verification
    assert(isAllowedMimeType("application/pdf"), "MIME allowlist recognizes 'application/pdf'");
    assert(isAllowedMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"), "MIME allowlist recognizes DOCX");
    assert(isAllowedMimeType("application/msword"), "MIME allowlist recognizes legacy DOC");
    assert(isAllowedMimeType("image/png"), "MIME allowlist recognizes 'image/png'");
    assert(isAllowedMimeType("image/jpeg"), "MIME allowlist recognizes 'image/jpeg'");
    assert(isAllowedMimeType("image/webp"), "MIME allowlist recognizes 'image/webp'");
    assert(!isAllowedMimeType("application/x-msdownload"), "MIME allowlist rejects EXE files");
    assert(!isAllowedMimeType("text/html"), "MIME allowlist rejects HTML files");
    assert(!isAllowedMimeType("application/javascript"), "MIME allowlist rejects JavaScript files");

    // 3.2 Magic number / File signature verification
    // PDF Magic Number: %PDF-
    const validPdfBuffer = Buffer.from("%PDF-1.7\nSample content for test");
    const pdfSigResult = verifyFileMagicNumber(validPdfBuffer, "application/pdf");
    assert(pdfSigResult.valid === true, "Magic number check validates genuine PDF buffer");

    // PNG Magic Number: 89 50 4E 47 0D 0A 1A 0A
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
    const pngSigResult = verifyFileMagicNumber(validPngBuffer, "image/png");
    assert(pngSigResult.valid === true, "Magic number check validates genuine PNG buffer");

    // JPEG Magic Number: FF D8 FF
    const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const jpegSigResult = verifyFileMagicNumber(validJpegBuffer, "image/jpeg");
    assert(jpegSigResult.valid === true, "Magic number check validates genuine JPEG buffer");

    // WebP Magic Number: RIFF....WEBP
    const validWebpBuffer = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from("WEBP")
    ]);
    const webpSigResult = verifyFileMagicNumber(validWebpBuffer, "image/webp");
    assert(webpSigResult.valid === true, "Magic number check validates genuine WebP buffer");

    // DOCX Magic Number: PK\x03\x04
    const validDocxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
    const docxSigResult = verifyFileMagicNumber(validDocxBuffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert(docxSigResult.valid === true, "Magic number check validates genuine DOCX (ZIP archive) buffer");

    // Spoofed file: Text content disguised as PDF
    const spoofedPdfBuffer = Buffer.from("MZ This is a disguised executable");
    const spoofedSigResult = verifyFileMagicNumber(spoofedPdfBuffer, "application/pdf");
    assert(
      spoofedSigResult.valid === false && spoofedSigResult.reason.includes("Invalid PDF signature"),
      "Magic number check catches and rejects spoofed PDF file buffer"
    );

    // 3.3 Empty file rejection (0 bytes)
    const emptyBuffer = Buffer.alloc(0);
    const emptyCheck = verifyFileMagicNumber(emptyBuffer, "application/pdf");
    assert(
      emptyCheck.valid === false && emptyCheck.reason.includes("empty"),
      "Empty file buffer (0 bytes) is rejected cleanly"
    );

    // 3.4 File Size Limit Constant
    assert(
      MAX_FILE_SIZE_BYTES === 50 * 1024 * 1024,
      "Upload middleware enforces exact 50 MB maximum file size limit"
    );

    // 3.5 Filename sanitization
    const maliciousName1 = "../../etc/passwd.pdf";
    const sanitized1 = sanitizeFileName(maliciousName1);
    assert(
      !sanitized1.includes("..") && !sanitized1.includes("/") && sanitized1.endsWith(".pdf"),
      "Filename sanitization neutralizes directory traversal sequences ('../../etc/passwd.pdf' -> '" + sanitized1 + "')"
    );

    const maliciousName2 = "my_notes\0_corrupted.docx";
    const sanitized2 = sanitizeFileName(maliciousName2);
    assert(
      !sanitized2.includes("\0") && sanitized2.endsWith(".docx"),
      "Filename sanitization strips dangerous null bytes from filename"
    );

    const dangerousCharsName = "Exam Prep [2026] & Notes#1 (Final)!.pdf";
    const sanitized3 = sanitizeFileName(dangerousCharsName);
    assert(
      !sanitized3.includes("[") && !sanitized3.includes("&") && sanitized3.endsWith(".pdf"),
      "Filename sanitization normalizes special characters safely ('" + sanitized3 + "')"
    );

    // -------------------------------------------------------------
    // 4. DATABASE INDEX INTEGRITY VERIFICATION
    // -------------------------------------------------------------
    console.log("\n--- 4. Verifying Model Indexes ---");
    const folderIndexes = Folder.schema.indexes();
    const hasParentOrderIndex = folderIndexes.some(([idx]) => idx.parentId === 1 && idx.order === 1);
    const hasScopeExamDeletedIndex = folderIndexes.some(([idx]) => idx.scope === 1 && idx.examSeriesId === 1 && idx.isDeleted === 1);
    const hasActiveDeletedIndex = folderIndexes.some(([idx]) => idx.isActive === 1 && idx.isDeleted === 1);
    const hasAncestorsIndex = folderIndexes.some(([idx]) => idx.ancestors === 1);

    assert(hasParentOrderIndex, "Folder model has compound index { parentId: 1, order: 1 }");
    assert(hasScopeExamDeletedIndex, "Folder model has compound index { scope: 1, examSeriesId: 1, isDeleted: 1 }");
    assert(hasActiveDeletedIndex, "Folder model has compound index { isActive: 1, isDeleted: 1 }");
    assert(hasAncestorsIndex, "Folder model has index on { ancestors: 1 }");

    const resourceIndexes = Resource.schema.indexes();
    const hasFolderOrderIndex = resourceIndexes.some(([idx]) => idx.folderId === 1 && idx.order === 1);
    const hasAccessPublishedIndex = resourceIndexes.some(([idx]) => idx.accessTier === 1 && idx.isPublished === 1 && idx.isDeleted === 1);

    assert(hasFolderOrderIndex, "Resource model has compound index { folderId: 1, order: 1 }");
    assert(hasAccessPublishedIndex, "Resource model has compound index { accessTier: 1, isPublished: 1, isDeleted: 1 }");

  } finally {
    // Clean up temporary test records
    if (createdResourceIds.length > 0) {
      await Resource.deleteMany({ _id: { $in: createdResourceIds } });
    }
    if (createdFolderIds.length > 0) {
      await Folder.deleteMany({ _id: { $in: createdFolderIds } });
    }
    await mongoose.disconnect();
    console.log("\nCleaned up test documents and disconnected from MongoDB.");
  }

  console.log("\n============================================================");
  console.log(`  PHASE 1 LIBRARY SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLibraryPhase1Tests().catch((err) => {
  console.error("Test Suite Unhandled Exception:", err);
  process.exit(1);
});
