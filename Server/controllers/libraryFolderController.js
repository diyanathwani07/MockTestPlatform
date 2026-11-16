const libraryFolderService = require("../services/libraryFolderService");
const libraryResourceService = require("../services/libraryResourceService");
const Folder = require("../models/Folder");
const Resource = require("../models/Resource");

/**
 * GET /api/admin/library/folders/tree
 * Retrieves scoped folder tree.
 */
async function getTree(req, res) {
  try {
    const { scope = "global", examSeriesId = null } = req.query;
    const tree = await libraryFolderService.getFolderTree({ scope, examSeriesId });
    res.json({ success: true, tree });
  } catch (error) {
    console.error("Library getTree error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/library/folders
 * Lists folders by scope and parentId.
 */
async function listFolders(req, res) {
  try {
    const { scope = "global", parentId, examSeriesId } = req.query;
    const filter = { isDeleted: false, scope };
    if (parentId === "null" || parentId === null || parentId === undefined || parentId === "") {
      filter.parentId = null;
    } else {
      filter.parentId = parentId;
    }
    if (scope === "exam_specific" && examSeriesId) {
      filter.examSeriesId = examSeriesId;
    }
    const folders = await Folder.find(filter).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, folders });
  } catch (error) {
    console.error("Library listFolders error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/library/folders/:id
 * Retrieves folder details, breadcrumbs, immediate children, and paginated resources.
 */
async function getFolder(req, res) {
  try {
    const { id } = req.params;
    const folderData = await libraryFolderService.getFolderDetails(id);
    const resourcesData = await libraryResourceService.listResourcesInFolder(id, req.query);

    res.json({
      success: true,
      folder: folderData.folder,
      breadcrumbs: folderData.breadcrumbs,
      children: folderData.immediateChildren,
      ...resourcesData
    });
  } catch (error) {
    console.error("Library getFolder error:", error);
    res.status(error.message.includes("not found") ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * POST /api/admin/library/folders
 * Creates a root or child folder.
 */
async function createFolder(req, res) {
  try {
    const folder = await libraryFolderService.createFolder(req.body, req.user._id);
    res.status(201).json({ success: true, folder });
  } catch (error) {
    console.error("Library createFolder error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/admin/library/folders/:id
 * Updates folder metadata.
 */
async function updateFolder(req, res) {
  try {
    const folder = await libraryFolderService.updateFolder(req.params.id, req.body, req.user._id);
    res.json({ success: true, folder });
  } catch (error) {
    console.error("Library updateFolder error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/admin/library/folders/:id/move
 * Moves folder safely.
 */
async function moveFolder(req, res) {
  try {
    const { targetParentId = null } = req.body;
    const folder = await libraryFolderService.moveFolder(req.params.id, targetParentId, req.user._id);
    res.json({ success: true, folder });
  } catch (error) {
    console.error("Library moveFolder error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/admin/library/folders/:id/reorder
 * Reorders sibling folders under parent.
 */
async function reorderFolders(req, res) {
  try {
    const { folderOrders } = req.body;
    const result = await libraryFolderService.reorderFolders(folderOrders);
    res.json({ success: true, message: "Folders reordered successfully", count: result.count });
  } catch (error) {
    console.error("Library reorderFolders error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/admin/library/folders/:id
 * Soft-deletes/archives folder.
 */
async function deleteFolder(req, res) {
  try {
    const recursive = req.query.recursive === "true" || req.body.recursive === true;
    const result = await libraryFolderService.archiveFolder(req.params.id, req.user._id, { recursive });
    res.json({ success: true, message: "Folder archived successfully", ...result });
  } catch (error) {
    console.error("Library deleteFolder error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/library/stats
 * Retrieves real-time overview counts for Study Library dashboard.
 */
async function getStats(req, res) {
  try {
    const [totalFolders, totalResources, globalFolderIds, examFolderIds] = await Promise.all([
      Folder.countDocuments({ isDeleted: false }),
      Resource.countDocuments({ isDeleted: false }),
      Folder.find({ scope: "global", isDeleted: false }).distinct("_id"),
      Folder.find({ scope: "exam_specific", isDeleted: false }).distinct("_id")
    ]);

    const [globalResources, examResources] = await Promise.all([
      Resource.countDocuments({ isDeleted: false, folderId: { $in: globalFolderIds } }),
      Resource.countDocuments({ isDeleted: false, folderId: { $in: examFolderIds } })
    ]);

    res.json({
      success: true,
      stats: {
        totalFolders,
        totalResources,
        globalResources,
        examResources
      }
    });
  } catch (error) {
    console.error("Library getStats error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  getTree,
  listFolders,
  getFolder,
  createFolder,
  updateFolder,
  moveFolder,
  reorderFolders,
  deleteFolder,
  getStats
};
