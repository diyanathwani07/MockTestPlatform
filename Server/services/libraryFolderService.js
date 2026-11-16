const mongoose = require("mongoose");
const Folder = require("../models/Folder");
const Resource = require("../models/Resource");
const ExamSeries = require("../models/ExamSeries");
const ExamStructure = require("../models/ExamStructure");

/**
 * Safely compares two ObjectId-like values (Mongoose ObjectId, string, or populated document).
 * Returns true if both represent valid, matching MongoDB ObjectIds.
 */
function isMatchingObjectId(idA, idB) {
  if (!idA || !idB) return false;
  const rawA = idA && typeof idA === "object" && idA._id ? idA._id : idA;
  const rawB = idB && typeof idB === "object" && idB._id ? idB._id : idB;
  const strA = typeof rawA === "string" ? rawA.trim() : rawA.toString ? rawA.toString().trim() : "";
  const strB = typeof rawB === "string" ? rawB.trim() : rawB.toString ? rawB.toString().trim() : "";
  if (!strA || !strB) return false;
  if (!mongoose.Types.ObjectId.isValid(strA) || !mongoose.Types.ObjectId.isValid(strB)) {
    return false;
  }
  return strA.toLowerCase() === strB.toLowerCase();
}

/**
 * Evaluates whether MongoDB deployment topology natively supports multi-document transactions.
 * Returns true for ReplicaSet, Sharded, or LoadBalanced topologies.
 * Returns false for standalone instances.
 */
function isTransactionSupported() {
  const client = mongoose.connection.client;
  if (!client || !client.topology) {
    return false;
  }
  const topologyType = client.topology.description?.type;
  const supportedTypes = [
    "ReplicaSetWithPrimary",
    "ReplicaSetNoPrimary",
    "Sharded",
    "LoadBalanced"
  ];
  if (topologyType && supportedTypes.includes(topologyType)) {
    return true;
  }
  if (client.topology.description?.setName) {
    return true;
  }
  return false;
}

/**
 * Builds an in-memory nested folder tree from a flat array of folders in O(N) time.
 */
function buildFolderTree(folders) {
  const map = {};
  const roots = [];

  folders.forEach((f) => {
    map[f._id.toString()] = {
      ...f,
      children: []
    };
  });

  folders.forEach((f) => {
    const folderObj = map[f._id.toString()];
    if (f.parentId && map[f.parentId.toString()]) {
      map[f.parentId.toString()].children.push(folderObj);
    } else {
      roots.push(folderObj);
    }
  });

  return roots;
}

/**
 * Validates scope, examSeriesId, and optional examStructureId consistency.
 */
async function validateScopeAndExam({ scope, examSeriesId, examStructureId }) {
  if (scope === "global") {
    if (examSeriesId) {
      throw new Error("Global folders must not be tied to an examSeriesId");
    }
    if (examStructureId) {
      throw new Error("Global folders cannot be tied to an examStructureId");
    }
    return;
  }

  if (scope === "exam_specific") {
    if (!examSeriesId) {
      throw new Error("Exam-specific folders require a valid examSeriesId");
    }

    const examExists = await ExamSeries.findById(examSeriesId).select("_id isPublished");
    if (!examExists) {
      throw new Error("Referenced ExamSeries does not exist");
    }

    if (examStructureId) {
      const structure = await ExamStructure.findById(examStructureId).select("_id examSeriesId");
      if (!structure) {
        throw new Error("Referenced ExamStructure does not exist");
      }
      if (structure.examSeriesId.toString() !== examSeriesId.toString()) {
        throw new Error("Referenced ExamStructure does not belong to the specified ExamSeries");
      }
    }
  }
}

/**
 * Creates a root or child folder.
 */
async function createFolder(data, userId) {
  const {
    name,
    description = "",
    parentId = null,
    scope = "global",
    examSeriesId = null,
    examStructureId = null,
    subjectName = null,
    order = 0,
    color = "#8B5CF6",
    icon = "folder"
  } = data;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("Folder name is required");
  }

  let finalScope = scope;
  let finalExamSeriesId = examSeriesId;
  let finalExamStructureId = examStructureId;
  let ancestors = [];

  if (parentId) {
    const parent = await Folder.findById(parentId);
    if (!parent || parent.isDeleted) {
      throw new Error("Parent folder does not exist or has been archived");
    }
    if (!parent.isActive) {
      throw new Error("Cannot create a child under an inactive parent folder");
    }

    // Children strictly inherit parent's scope and exam association
    finalScope = parent.scope;
    finalExamSeriesId = parent.examSeriesId;
    if (!finalExamStructureId) {
      finalExamStructureId = parent.examStructureId;
    }

    ancestors = [...(parent.ancestors || []), parent._id];
  } else {
    // Root folder validation
    await validateScopeAndExam({
      scope: finalScope,
      examSeriesId: finalExamSeriesId,
      examStructureId: finalExamStructureId
    });
  }

  // If order is not explicitly provided or is 0, auto-calculate next order under parent
  let finalOrder = order;
  if (!finalOrder || finalOrder === 0) {
    const lastSibling = await Folder.findOne({ parentId, isDeleted: false })
      .sort({ order: -1 })
      .select("order");
    finalOrder = lastSibling ? (lastSibling.order || 0) + 1 : 1;
  }

  const folder = new Folder({
    name: name.trim(),
    description: description ? description.trim() : "",
    parentId: parentId || null,
    ancestors,
    scope: finalScope,
    examSeriesId: finalExamSeriesId,
    examStructureId: finalExamStructureId,
    subjectName: subjectName ? subjectName.trim() : null,
    order: finalOrder,
    color: color || "#8B5CF6",
    icon: icon || "folder",
    createdBy: userId,
    isActive: true,
    isDeleted: false
  });

  await folder.save();
  return folder;
}

/**
 * Retrieves the complete folder tree for a given scope.
 */
async function getFolderTree({ scope = "global", examSeriesId = null, includeArchived = false }) {
  const query = {
    scope,
    isDeleted: includeArchived ? { $in: [true, false] } : false
  };

  if (scope === "exam_specific") {
    if (!examSeriesId) {
      throw new Error("examSeriesId query parameter is required for exam_specific scope");
    }
    query.examSeriesId = examSeriesId;
  } else {
    query.examSeriesId = null;
  }

  const folders = await Folder.find(query)
    .sort({ order: 1, name: 1 })
    .lean();

  return buildFolderTree(folders);
}

/**
 * Generates breadcrumb trail from root to the target folder.
 */
async function getBreadcrumbs(folder) {
  if (!folder.ancestors || folder.ancestors.length === 0) {
    return [
      {
        _id: folder._id,
        name: folder.name,
        parentId: folder.parentId,
        scope: folder.scope,
        examSeriesId: folder.examSeriesId
      }
    ];
  }

  const ancestors = await Folder.find({
    _id: { $in: folder.ancestors },
    isDeleted: false
  })
    .select("_id name parentId scope examSeriesId order")
    .lean();

  const ancestorMap = new Map(ancestors.map((a) => [a._id.toString(), a]));
  const breadcrumbs = folder.ancestors
    .map((id) => ancestorMap.get(id.toString()))
    .filter(Boolean);

  breadcrumbs.push({
    _id: folder._id,
    name: folder.name,
    parentId: folder.parentId,
    scope: folder.scope,
    examSeriesId: folder.examSeriesId
  });

  return breadcrumbs;
}

/**
 * Fetches folder details, breadcrumbs, immediate child folders, and resource statistics.
 */
async function getFolderDetails(folderId, { includeArchived = false } = {}) {
  const folder = await Folder.findOne({
    _id: folderId,
    isDeleted: includeArchived ? { $in: [true, false] } : false
  });

  if (!folder) {
    throw new Error("Folder not found or has been archived");
  }

  const [breadcrumbs, immediateChildren, resourceCount] = await Promise.all([
    getBreadcrumbs(folder),
    Folder.find({
      parentId: folder._id,
      isDeleted: false
    })
      .sort({ order: 1, createdAt: -1 })
      .lean(),
    Resource.countDocuments({
      folderId: folder._id,
      isDeleted: false
    })
  ]);

  return {
    folder,
    breadcrumbs,
    immediateChildren,
    resourceCount
  };
}

/**
 * Updates folder metadata (name, description, appearance, status).
 */
async function updateFolder(folderId, updateData, userId) {
  const folder = await Folder.findOne({ _id: folderId, isDeleted: false });
  if (!folder) {
    throw new Error("Folder not found or has been archived");
  }

  const allowedFields = ["name", "description", "color", "icon", "isActive", "subjectName"];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (typeof updateData[field] === "string") {
        folder[field] = updateData[field].trim();
      } else {
        folder[field] = updateData[field];
      }
    }
  });

  await folder.save();
  return folder;
}

/**
 * Reorders sibling folders under a parent.
 */
async function reorderFolders(folderOrders) {
  if (!Array.isArray(folderOrders) || folderOrders.length === 0) {
    throw new Error("folderOrders array with { folderId, order } items is required");
  }

  const bulkOps = folderOrders.map((item) => ({
    updateOne: {
      filter: { _id: item.folderId, isDeleted: false },
      update: { $set: { order: Number(item.order) || 0 } }
    }
  }));

  await Folder.bulkWrite(bulkOps);
  return { success: true, count: folderOrders.length };
}

/**
 * Moves a folder to a new parent or to root, with comprehensive cycle prevention,
 * cross-scope isolation, max depth validation, and atomic descendant ancestor updates.
 */
async function moveFolder(folderId, targetParentId, userId) {
  const folder = await Folder.findOne({ _id: folderId, isDeleted: false });
  if (!folder) {
    throw new Error("Source folder not found or has been archived");
  }

  // 1. Moving to Root
  if (!targetParentId) {
    if (folder.parentId === null) {
      return folder; // Already at root
    }

    const originalParentId = folder.parentId;
    const originalAncestors = [...folder.ancestors];
    const oldAncestorsPrefix = [...folder.ancestors, folder._id];
    const newAncestorsForFolder = [];

    // Fetch descendants before modifying
    const descendants = await Folder.find({ ancestors: folder._id, isDeleted: false });
    const originalDescendantAncestors = new Map(
      descendants.map((d) => [d._id.toString(), [...d.ancestors]])
    );

    // Check transaction support via deployment topology
    const hasTopologyTxnSupport = isTransactionSupported();
    let session = null;
    let isTxnSupported = false;

    if (hasTopologyTxnSupport) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        isTxnSupported = true;
      } catch (txnErr) {
        if (session) {
          await session.endSession();
          session = null;
        }
        isTxnSupported = false;
      }
    }

    try {
      folder.parentId = null;
      folder.ancestors = newAncestorsForFolder;
      await folder.save(isTxnSupported ? { session } : {});

      // Update all descendants iteratively via bulkWrite with optimistic concurrency check
      if (descendants.length > 0) {
        const bulkOps = descendants.map((d) => {
          const remainingSuffix = d.ancestors.slice(oldAncestorsPrefix.length);
          return {
            updateOne: {
              filter: { _id: d._id, ancestors: d.ancestors },
              update: { $set: { ancestors: [folder._id, ...remainingSuffix] } }
            }
          };
        });
        const bulkResult = await Folder.bulkWrite(bulkOps, isTxnSupported ? { session } : {});
        if (bulkResult.matchedCount !== descendants.length) {
          throw new Error(
            `Concurrent folder modification detected (${bulkResult.matchedCount}/${descendants.length} descendants matched); subtree rebase aborted to preserve hierarchy integrity`
          );
        }
      }

      if (isTxnSupported) {
        await session.commitTransaction();
      }

      return folder;
    } catch (err) {
      if (isTxnSupported && session) {
        await session.abortTransaction();
      } else {
        // Non-transactional rollback compensation
        try {
          await Folder.updateOne(
            { _id: folder._id },
            { $set: { parentId: originalParentId, ancestors: originalAncestors } }
          );
          const rollbackOps = descendants.map((d) => ({
            updateOne: {
              filter: { _id: d._id },
              update: {
                $set: {
                  ancestors: originalDescendantAncestors.get(d._id.toString()) || d.ancestors
                }
              }
            }
          }));
          if (rollbackOps.length > 0) {
            await Folder.bulkWrite(rollbackOps);
          }
        } catch (rollbackErr) {
          console.error("Non-transactional rollback compensation failed:", rollbackErr);
        }
      }
      throw err;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  // 2. Moving under a target parent
  if (targetParentId.toString() === folderId.toString()) {
    throw new Error("A folder cannot be its own parent");
  }

  const targetParent = await Folder.findOne({ _id: targetParentId, isDeleted: false });
  if (!targetParent) {
    throw new Error("Target destination folder does not exist or has been archived");
  }
  if (!targetParent.isActive) {
    throw new Error("Cannot move a folder under an inactive destination folder");
  }

  // Cycle prevention: Target parent cannot be inside the moved folder's descendants
  if (targetParent.ancestors.some((aId) => aId.toString() === folderId.toString())) {
    throw new Error("Cannot move a folder into one of its own descendants");
  }

  // Scope & Exam matching
  if (targetParent.scope !== folder.scope) {
    throw new Error("Cannot move folder across different scopes (global vs exam_specific)");
  }

  if (targetParent.scope === "exam_specific") {
    if (!isMatchingObjectId(targetParent.examSeriesId, folder.examSeriesId)) {
      throw new Error("Cannot move folder across different exam series");
    }
  }

  const originalParentId = folder.parentId;
  const originalAncestors = [...folder.ancestors];
  const newAncestorsForFolder = [...(targetParent.ancestors || []), targetParent._id];

  // Fetch descendants of the moved folder for subtree ancestor rebasing
  const descendants = await Folder.find({ ancestors: folder._id, isDeleted: false });
  const originalDescendantAncestors = new Map(
    descendants.map((d) => [d._id.toString(), [...d.ancestors]])
  );

  // Atomic Update execution
  const oldAncestorsPrefix = [...folder.ancestors, folder._id];
  const newAncestorsPrefix = [...newAncestorsForFolder, folder._id];

  // Check transaction support via deployment topology
  const hasTopologyTxnSupport = isTransactionSupported();
  let session = null;
  let isTxnSupported = false;

  if (hasTopologyTxnSupport) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      isTxnSupported = true;
    } catch (txnErr) {
      if (session) {
        await session.endSession();
        session = null;
      }
      isTxnSupported = false;
    }
  }

  try {
    folder.parentId = targetParent._id;
    folder.ancestors = newAncestorsForFolder;
    await folder.save(isTxnSupported ? { session } : {});

    if (descendants.length > 0) {
      const bulkOps = descendants.map((d) => {
        const remainingSuffix = d.ancestors.slice(oldAncestorsPrefix.length);
        return {
          updateOne: {
            filter: { _id: d._id, ancestors: d.ancestors },
            update: { $set: { ancestors: [...newAncestorsPrefix, ...remainingSuffix] } }
          }
        };
      });
      const bulkResult = await Folder.bulkWrite(bulkOps, isTxnSupported ? { session } : {});
      if (bulkResult.matchedCount !== descendants.length) {
        throw new Error(
          `Concurrent folder modification detected (${bulkResult.matchedCount}/${descendants.length} descendants matched); subtree rebase aborted to preserve hierarchy integrity`
        );
      }
    }

    if (isTxnSupported) {
      await session.commitTransaction();
    }

    return folder;
  } catch (err) {
    if (isTxnSupported && session) {
      await session.abortTransaction();
    } else {
      // Non-transactional rollback compensation
      try {
        await Folder.updateOne(
          { _id: folder._id },
          { $set: { parentId: originalParentId, ancestors: originalAncestors } }
        );
        const rollbackOps = descendants.map((d) => ({
          updateOne: {
            filter: { _id: d._id },
            update: {
              $set: {
                ancestors: originalDescendantAncestors.get(d._id.toString()) || d.ancestors
              }
            }
          }
        }));
        if (rollbackOps.length > 0) {
          await Folder.bulkWrite(rollbackOps);
        }
      } catch (rollbackErr) {
        console.error("Non-transactional rollback compensation failed:", rollbackErr);
      }
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

/**
 * Archives a folder (soft-delete). Safe policy prevents silent deletion of active contents
 * unless recursive archiving is explicitly enabled.
 */
async function archiveFolder(folderId, userId, { recursive = false } = {}) {
  const folder = await Folder.findOne({ _id: folderId, isDeleted: false });
  if (!folder) {
    throw new Error("Folder not found or is already archived");
  }

  const [activeChildFoldersCount, activeResourcesCount] = await Promise.all([
    Folder.countDocuments({ parentId: folderId, isDeleted: false }),
    Resource.countDocuments({ folderId: folderId, isDeleted: false })
  ]);

  if (!recursive && (activeChildFoldersCount > 0 || activeResourcesCount > 0)) {
    throw new Error(
      `Cannot archive folder containing active items (${activeChildFoldersCount} subfolders, ${activeResourcesCount} resources). Move or archive contents first, or specify recursive archive.`
    );
  }

  folder.isDeleted = true;
  await folder.save();

  if (recursive) {
    const descendantFolders = await Folder.find({ ancestors: folderId, isDeleted: false }).select("_id");
    const allFolderIds = [folderId, ...descendantFolders.map((f) => f._id)];

    await Promise.all([
      Folder.updateMany({ ancestors: folderId, isDeleted: false }, { $set: { isDeleted: true } }),
      Resource.updateMany({ folderId: { $in: allFolderIds }, isDeleted: false }, { $set: { isDeleted: true } })
    ]);
  }

  return {
    success: true,
    folderId,
    archivedCount: 1 + (recursive ? activeChildFoldersCount : 0)
  };
}

module.exports = {
  createFolder,
  getFolderTree,
  getBreadcrumbs,
  getFolderDetails,
  updateFolder,
  reorderFolders,
  moveFolder,
  archiveFolder,
  validateScopeAndExam,
  buildFolderTree
};
