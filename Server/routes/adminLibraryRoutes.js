const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const requirePermission = require("../middleware/permissionMiddleware");
const { handleLibrarySingleUpload } = require("../middleware/libraryUploadMiddleware");
const libraryFolderController = require("../controllers/libraryFolderController");
const libraryResourceController = require("../controllers/libraryResourceController");

// All admin library routes require authenticated internal staff
router.use(protect);

// -------------------------------------------------------------
// OVERVIEW STATISTICS
// -------------------------------------------------------------
router.get(
  "/stats",
  requirePermission(["view_library", "manage_folders", "manage_resources"]),
  libraryFolderController.getStats
);

// -------------------------------------------------------------
// FOLDER MANAGEMENT ROUTES
// -------------------------------------------------------------
router.get(
  ["/folders/tree", "/tree"],
  requirePermission(["view_library", "manage_folders", "manage_resources"]),
  libraryFolderController.getTree
);

router.get(
  "/folders",
  requirePermission(["view_library", "manage_folders", "manage_resources"]),
  libraryFolderController.listFolders
);

router.get(
  "/folders/:id",
  requirePermission(["view_library", "manage_folders", "manage_resources"]),
  libraryFolderController.getFolder
);

router.post(
  "/folders",
  requirePermission("manage_folders"),
  libraryFolderController.createFolder
);

router.route("/folders/:id")
  .put(requirePermission("manage_folders"), libraryFolderController.updateFolder)
  .patch(requirePermission("manage_folders"), libraryFolderController.updateFolder)
  .delete(requirePermission("manage_folders"), libraryFolderController.deleteFolder);

router.route("/folders/:id/move")
  .put(requirePermission("manage_folders"), libraryFolderController.moveFolder)
  .patch(requirePermission("manage_folders"), libraryFolderController.moveFolder);

router.route("/folders/reorder")
  .put(requirePermission("manage_folders"), libraryFolderController.reorderFolders)
  .patch(requirePermission("manage_folders"), libraryFolderController.reorderFolders);

// -------------------------------------------------------------
// RESOURCE MANAGEMENT ROUTES
// -------------------------------------------------------------
router.get(
  "/resources",
  requirePermission(["view_library", "manage_resources"]),
  libraryResourceController.listResources
);

router.post(
  "/resources/upload",
  requirePermission("manage_resources"),
  handleLibrarySingleUpload("file"),
  libraryResourceController.uploadResource
);

router.post(
  "/resources",
  requirePermission("manage_resources"),
  libraryResourceController.createResource
);

router.route("/resources/:id")
  .put(requirePermission("manage_resources"), libraryResourceController.updateResource)
  .patch(requirePermission("manage_resources"), libraryResourceController.updateResource)
  .delete(requirePermission("manage_resources"), libraryResourceController.deleteResource);

router.route("/resources/:id/move")
  .put(requirePermission("manage_resources"), libraryResourceController.moveResource)
  .patch(requirePermission("manage_resources"), libraryResourceController.moveResource);

router.route("/resources/:id/reorder")
  .put(requirePermission("manage_resources"), libraryResourceController.reorderResources)
  .patch(requirePermission("manage_resources"), libraryResourceController.reorderResources);

router.delete(
  "/resources/:id/purge",
  requirePermission("manage_resources"),
  libraryResourceController.purgeResource
);

router.get(
  "/resources/:id/view",
  requirePermission(["view_library", "manage_resources"]),
  libraryResourceController.adminViewResource
);

router.get(
  "/resources/:id/download",
  requirePermission(["view_library", "manage_resources"]),
  libraryResourceController.adminDownloadResource
);

module.exports = router;
