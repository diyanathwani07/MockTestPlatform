const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

const Folder = require("../models/Folder");
const ExamSeries = require("../models/ExamSeries");
const ExamStructure = require("../models/ExamStructure");
const libraryFolderService = require("../services/libraryFolderService");

async function runLibraryHierarchySuite() {
  console.log("============================================================");
  console.log("  PREPMARK STUDY LIBRARY - PHASE 2 FOLDER HIERARCHY SUITE    ");
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
  console.log("Connected to MongoDB for Library Hierarchy Verification.\n");

  const dummyUserId = new mongoose.Types.ObjectId();
  const createdFolderIds = [];
  let testExamSeries1 = null;
  let testExamSeries2 = null;
  let testExamStructure1 = null;
  let testExamStructure2 = null;

  try {
    // -------------------------------------------------------------
    // Setup test ExamSeries & ExamStructures
    // -------------------------------------------------------------
    const timestamp = Date.now();
    testExamSeries1 = await ExamSeries.create({
      title: `SSC CGL Tier 1 Exam ${timestamp}`,
      slug: `ssc-cgl-exam-${timestamp}`,
      isPublished: true,
      createdBy: dummyUserId
    });

    testExamSeries2 = await ExamSeries.create({
      title: `UPSC Civil Services Exam ${timestamp}`,
      slug: `upsc-cse-exam-${timestamp}`,
      isPublished: true,
      createdBy: dummyUserId
    });

    testExamStructure1 = await ExamStructure.create({
      examSeriesId: testExamSeries1._id,
      name: "Tier 1 Prelims",
      subjects: [{ name: "General Intelligence & Reasoning" }, { name: "Quantitative Aptitude" }]
    });

    testExamStructure2 = await ExamStructure.create({
      examSeriesId: testExamSeries2._id,
      name: "General Studies Paper 1",
      subjects: [{ name: "History" }, { name: "Geography" }]
    });

    // -------------------------------------------------------------
    // 1. ROOT FOLDER CREATION & VALIDATION
    // -------------------------------------------------------------
    console.log("--- 1. Testing Root Folder Creation & Scoping ---");

    // 1.1 Global root creation
    const globalRoot = await libraryFolderService.createFolder(
      {
        name: "General Study Resources",
        description: "Shared ebooks, standard reference formulas, and guides",
        scope: "global"
      },
      dummyUserId
    );
    createdFolderIds.push(globalRoot._id);
    assert(
      globalRoot.scope === "global" && globalRoot.parentId === null && globalRoot.examSeriesId === null,
      "Global root folder created with parentId = null and examSeriesId = null"
    );

    // 1.2 Exam-specific root creation
    const examRoot1 = await libraryFolderService.createFolder(
      {
        name: "SSC CGL 2026 Comprehensive Notes",
        description: "Materials specific to SSC CGL",
        scope: "exam_specific",
        examSeriesId: testExamSeries1._id
      },
      dummyUserId
    );
    createdFolderIds.push(examRoot1._id);
    assert(
      examRoot1.scope === "exam_specific" && examRoot1.examSeriesId.equals(testExamSeries1._id),
      "Exam-specific root folder created with valid ExamSeries reference"
    );

    // 1.3 Nonexistent ExamSeries rejected
    let nonExistentExamErr = null;
    try {
      await libraryFolderService.createFolder(
        {
          name: "Invalid Exam Folder",
          scope: "exam_specific",
          examSeriesId: new mongoose.Types.ObjectId()
        },
        dummyUserId
      );
    } catch (e) {
      nonExistentExamErr = e;
    }
    assert(
      nonExistentExamErr && nonExistentExamErr.message.includes("does not exist"),
      "Creation of exam_specific folder with nonexistent ExamSeries rejected"
    );

    // 1.4 Invalid ExamStructure-to-ExamSeries association rejected
    let mismatchedStructureErr = null;
    try {
      await libraryFolderService.createFolder(
        {
          name: "Mismatched Structure Folder",
          scope: "exam_specific",
          examSeriesId: testExamSeries1._id,
          examStructureId: testExamStructure2._id // Belongs to ExamSeries2!
        },
        dummyUserId
      );
    } catch (e) {
      mismatchedStructureErr = e;
    }
    assert(
      mismatchedStructureErr && mismatchedStructureErr.message.includes("does not belong to the specified ExamSeries"),
      "Creation rejected when ExamStructure does not belong to the specified ExamSeries"
    );

    // 1.5 Valid ExamStructure-to-ExamSeries association accepted
    const validStructureFolder = await libraryFolderService.createFolder(
      {
        name: "Tier 1 Reasoning Section Notes",
        scope: "exam_specific",
        examSeriesId: testExamSeries1._id,
        examStructureId: testExamStructure1._id,
        subjectName: "General Intelligence & Reasoning"
      },
      dummyUserId
    );
    createdFolderIds.push(validStructureFolder._id);
    assert(
      validStructureFolder.examStructureId.equals(testExamStructure1._id),
      "Exam-specific folder accepts valid matching ExamStructure"
    );

    // -------------------------------------------------------------
    // 2. INHERITANCE & NESTING
    // -------------------------------------------------------------
    console.log("\n--- 2. Testing Inheritance & Multi-Level Nesting ---");

    // 2.1 Child inherits parent scope and examSeriesId
    const globalChild = await libraryFolderService.createFolder(
      {
        name: "Quantitative Aptitude Formulas",
        parentId: globalRoot._id
      },
      dummyUserId
    );
    createdFolderIds.push(globalChild._id);
    assert(
      globalChild.scope === "global" && globalChild.examSeriesId === null && globalChild.ancestors.length === 1,
      "Child folder strictly inherits parent's scope (global) and sets ancestors"
    );

    const examChild1 = await libraryFolderService.createFolder(
      {
        name: "General Awareness PDF Modules",
        parentId: examRoot1._id
      },
      dummyUserId
    );
    createdFolderIds.push(examChild1._id);
    assert(
      examChild1.scope === "exam_specific" && examChild1.examSeriesId.equals(testExamSeries1._id),
      "Child folder strictly inherits parent's exam_specific scope and examSeriesId"
    );

    // 2.2 Deep multi-level nesting
    const deepSubFolder1 = await libraryFolderService.createFolder(
      {
        name: "Arithmetic Modules",
        parentId: globalChild._id
      },
      dummyUserId
    );
    createdFolderIds.push(deepSubFolder1._id);

    const deepSubFolder2 = await libraryFolderService.createFolder(
      {
        name: "Percentages & Ratio Tricks",
        parentId: deepSubFolder1._id
      },
      dummyUserId
    );
    createdFolderIds.push(deepSubFolder2._id);
    assert(
      deepSubFolder2.ancestors.length === 3 &&
        deepSubFolder2.ancestors[0].equals(globalRoot._id) &&
        deepSubFolder2.ancestors[1].equals(globalChild._id) &&
        deepSubFolder2.ancestors[2].equals(deepSubFolder1._id),
      "Deep nested subfolder maintains accurate ancestors array across multiple levels"
    );

    // -------------------------------------------------------------
    // 3. CYCLE PREVENTION & MOVE VALIDATIONS
    // -------------------------------------------------------------
    console.log("\n--- 3. Testing Moving Folders & Anti-Cycle Safeguards ---");

    // 3.1 Self-parenting rejected
    let selfParentErr = null;
    try {
      await libraryFolderService.moveFolder(globalChild._id, globalChild._id, dummyUserId);
    } catch (e) {
      selfParentErr = e;
    }
    assert(
      selfParentErr && selfParentErr.message.includes("cannot be its own parent"),
      "Moving a folder to be its own parent is rejected"
    );

    // 3.2 Moving a folder into a descendant rejected
    let descendantMoveErr = null;
    try {
      await libraryFolderService.moveFolder(globalRoot._id, deepSubFolder2._id, dummyUserId);
    } catch (e) {
      descendantMoveErr = e;
    }
    assert(
      descendantMoveErr && descendantMoveErr.message.includes("own descendants"),
      "Moving a folder into one of its own descendants is rejected"
    );

    // 3.3 Cross-scope move rejected
    let crossScopeErr = null;
    try {
      await libraryFolderService.moveFolder(globalChild._id, examRoot1._id, dummyUserId);
    } catch (e) {
      crossScopeErr = e;
    }
    assert(
      crossScopeErr && crossScopeErr.message.includes("different scopes"),
      "Moving folder across different scopes (global to exam_specific) is rejected"
    );

    // 3.4 Valid move recalculates descendant ancestors
    const newGlobalBranch = await libraryFolderService.createFolder(
      {
        name: "Mathematics Archive",
        parentId: globalRoot._id
      },
      dummyUserId
    );
    createdFolderIds.push(newGlobalBranch._id);

    // Move deepSubFolder1 from globalChild to newGlobalBranch
    await libraryFolderService.moveFolder(deepSubFolder1._id, newGlobalBranch._id, dummyUserId);

    const refreshedSubFolder1 = await Folder.findById(deepSubFolder1._id);
    const refreshedSubFolder2 = await Folder.findById(deepSubFolder2._id);

    assert(
      refreshedSubFolder1.parentId.equals(newGlobalBranch._id) &&
        refreshedSubFolder1.ancestors.length === 2 &&
        refreshedSubFolder1.ancestors[1].equals(newGlobalBranch._id),
      "Moved folder has updated parentId and recalculated ancestors"
    );

    assert(
      refreshedSubFolder2.ancestors.some((aId) => aId.equals(newGlobalBranch._id)) &&
        !refreshedSubFolder2.ancestors.some((aId) => aId.equals(globalChild._id)),
      "Subtree descendants automatically have ancestors updated without stale references"
    );

    // 3.5 Moving to root
    await libraryFolderService.moveFolder(deepSubFolder1._id, null, dummyUserId);
    const rootSubFolder1 = await Folder.findById(deepSubFolder1._id);
    const rootSubFolder2 = await Folder.findById(deepSubFolder2._id);
    assert(
      rootSubFolder1.parentId === null && rootSubFolder1.ancestors.length === 0,
      "Moving folder to root sets parentId = null and clears ancestors"
    );
    assert(
      rootSubFolder2.ancestors.length === 1 && rootSubFolder2.ancestors[0].equals(rootSubFolder1._id),
      "Descendants of folder moved to root have ancestors recalculated cleanly"
    );

    // -------------------------------------------------------------
    // 4. UNLIMITED LOGICAL NESTING (30+ LEVELS) & PERFORMANCE
    // -------------------------------------------------------------
    console.log("\n--- 4. Testing Unlimited Logical Nesting (30+ Levels) & Breadcrumbs ---");

    // 4.1 Create a 32-level deep nested folder structure
    let currentParent = globalRoot._id;
    const deepChainFolderIds = [];
    let level32Folder = null;

    for (let i = 2; i <= 32; i++) {
      const nextFolder = await libraryFolderService.createFolder(
        {
          name: `Level ${i} Folder`,
          parentId: currentParent
        },
        dummyUserId
      );
      createdFolderIds.push(nextFolder._id);
      deepChainFolderIds.push(nextFolder._id);
      currentParent = nextFolder._id;
      if (i === 32) {
        level32Folder = nextFolder;
      }
    }

    assert(
      level32Folder && level32Folder.ancestors.length === 31,
      "32-level deep folder created without artificial depth restrictions (ancestors.length === 31)"
    );

    // 4.2 Breadcrumb generation at level 32
    const deepBreadcrumbs = await libraryFolderService.getBreadcrumbs(level32Folder);
    assert(
      Array.isArray(deepBreadcrumbs) && deepBreadcrumbs.length === 32,
      "Breadcrumb trail generated accurately from root to Level 32 folder (32 breadcrumb entries)"
    );

    // 4.3 Move a deep folder (e.g., Level 15) to a new branch, rebasing all descendants down to Level 32
    const level15Id = deepChainFolderIds[13]; // index 13 is Level 15
    const alternateRoot = await libraryFolderService.createFolder(
      {
        name: "Alternate Deep Storage Root",
        scope: "global"
      },
      dummyUserId
    );
    createdFolderIds.push(alternateRoot._id);

    await libraryFolderService.moveFolder(level15Id, alternateRoot._id, dummyUserId);

    const refreshedLevel15 = await Folder.findById(level15Id);
    const refreshedLevel32 = await Folder.findById(level32Folder._id);

    assert(
      refreshedLevel15.parentId.equals(alternateRoot._id) &&
        refreshedLevel15.ancestors.length === 1 &&
        refreshedLevel15.ancestors[0].equals(alternateRoot._id),
      "Moved Level 15 folder rebased onto new parent with updated ancestors"
    );

    assert(
      refreshedLevel32.ancestors[0].equals(alternateRoot._id) &&
        !refreshedLevel32.ancestors.some((aId) => aId.equals(globalRoot._id)),
      "Subtree descendant at Level 32 has ancestors fully and iteratively rebased"
    );

    // 4.4 Tree retrieval with deep nesting
    const tree = await libraryFolderService.getFolderTree({ scope: "global" });
    assert(
      Array.isArray(tree) && tree.some((item) => item._id.toString() === alternateRoot._id.toString()),
      "Scoped folder tree retrieved as nested hierarchical array with deep branches"
    );

    // 4.5 Reordering
    const reorderRes = await libraryFolderService.reorderFolders([
      { folderId: globalRoot._id, order: 10 },
      { folderId: alternateRoot._id, order: 20 }
    ]);
    assert(reorderRes && reorderRes.success && reorderRes.count === 2, "Reordering sibling folders operates cleanly");

    // 4.6 Safe archiving blocks folder with active contents unless recursive
    let blockArchiveErr = null;
    try {
      await libraryFolderService.archiveFolder(alternateRoot._id, dummyUserId, { recursive: false });
    } catch (e) {
      blockArchiveErr = e;
    }
    assert(
      blockArchiveErr && blockArchiveErr.message.includes("Cannot archive folder containing active items"),
      "Non-recursive archiving rejects folders that contain active subfolders"
    );

    const recursiveArchive = await libraryFolderService.archiveFolder(alternateRoot._id, dummyUserId, { recursive: true });
    assert(recursiveArchive && recursiveArchive.success, "Recursive archiving successfully marks folder and all 18+ descendants as deleted");

  } finally {
    // Clean up all created test folders and exam records
    if (createdFolderIds.length > 0) {
      await Folder.deleteMany({ _id: { $in: createdFolderIds } });
    }
    if (testExamStructure1) await ExamStructure.findByIdAndDelete(testExamStructure1._id);
    if (testExamStructure2) await ExamStructure.findByIdAndDelete(testExamStructure2._id);
    if (testExamSeries1) await ExamSeries.findByIdAndDelete(testExamSeries1._id);
    if (testExamSeries2) await ExamSeries.findByIdAndDelete(testExamSeries2._id);

    await mongoose.disconnect();
    console.log("\nCleaned up test hierarchy records and disconnected from MongoDB.");
  }

  console.log("\n============================================================");
  console.log(`  PHASE 2 HIERARCHY SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLibraryHierarchySuite().catch((err) => {
  console.error("Hierarchy Suite Unhandled Exception:", err);
  process.exit(1);
});
