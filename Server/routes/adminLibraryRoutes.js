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
  "/folders/tree",
  requirePermission(["view_library", "manage_folders", "manage_resources"]),
  libraryFolderController.getTree
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

router.put(
  "/folders/:id",
  requirePermission("manage_folders"),
  libraryFolderController.updateFolder
);

router.put(
  "/folders/:id/move",
  requirePermission("manage_folders"),
  libraryFolderController.moveFolder
);

router.put(
  "/folders/:id/reorder",
  requirePermission("manage_folders"),
  libraryFolderController.reorderFolders
);

router.delete(
  "/folders/:id",
  requirePermission("manage_folders"),
  libraryFolderController.deleteFolder
);

// -------------------------------------------------------------
// RESOURCE MANAGEMENT ROUTES
// -------------------------------------------------------------
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

router.put(
  "/resources/:id",
  requirePermission("manage_resources"),
  libraryResourceController.updateResource
);

router.put(
  "/resources/:id/move",
  requirePermission("manage_resources"),
  libraryResourceController.moveResource
);

router.put(
  "/resources/:id/reorder",
  requirePermission("manage_resources"),
  libraryResourceController.reorderResources
);

router.delete(
  "/resources/:id",
  requirePermission("manage_resources"),
  libraryResourceController.deleteResource
);

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
