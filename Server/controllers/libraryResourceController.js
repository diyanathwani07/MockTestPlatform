const libraryResourceService = require("../services/libraryResourceService");
const Resource = require("../models/Resource");
const cloudinaryService = require("../services/cloudinaryService");
const path = require("path");

/**
 * POST /api/admin/library/resources/upload
 * Uploads a file (PDF, DOCX, image) to Cloudinary and saves resource.
 */
async function uploadResource(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const resource = await libraryResourceService.createFileResource(
      req.file,
      req.body,
      req.user._id
    );

    res.status(201).json({ success: true, resource });
  } catch (error) {
    console.error("Library uploadResource error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * POST /api/admin/library/resources
 * Creates a link-based or text-based note resource.
 */
async function createResource(req, res) {
  try {
    const resource = await libraryResourceService.createLinkOrNoteResource(
      req.body,
      req.user._id
    );

    res.status(201).json({ success: true, resource });
  } catch (error) {
    console.error("Library createResource error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/admin/library/resources/:id
 * Updates resource metadata.
 */
async function updateResource(req, res) {
  try {
    const resource = await libraryResourceService.updateResource(
      req.params.id,
      req.body,
      req.user._id
    );

    res.json({ success: true, resource });
  } catch (error) {
    console.error("Library updateResource error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/admin/library/resources/:id/move
 * Moves a resource between folders.
 */
async function moveResource(req, res) {
  try {
    const { targetFolderId } = req.body;
    if (!targetFolderId) {
      return res.status(400).json({ success: false, message: "targetFolderId is required" });
    }

    const resource = await libraryResourceService.moveResource(
      req.params.id,
      targetFolderId,
      req.user._id
    );

    res.json({ success: true, resource });
  } catch (error) {
    console.error("Library moveResource error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * PUT /api/admin/library/resources/:id/reorder
 * Reorders resources within folder.
 */
async function reorderResources(req, res) {
  try {
    const { resourceOrders } = req.body;
    const result = await libraryResourceService.reorderResources(resourceOrders);
    res.json({ success: true, message: "Resources reordered successfully", count: result.count });
  } catch (error) {
    console.error("Library reorderResources error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/admin/library/resources/:id
 * Soft-deletes a resource.
 */
async function deleteResource(req, res) {
  try {
    const result = await libraryResourceService.softDeleteResource(req.params.id, req.user._id);
    res.json({ success: true, message: "Resource archived successfully", ...result });
  } catch (error) {
    console.error("Library deleteResource error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * DELETE /api/admin/library/resources/:id/purge
 * Permanently deletes resource and destroys Cloudinary asset (Super Admin only).
 */
async function purgeResource(req, res) {
  try {
    const result = await libraryResourceService.permanentPurgeResource(
      req.params.id,
      req.user,
      req.body
    );
    res.json({ success: true, message: "Resource permanently purged", ...result });
  } catch (error) {
    console.error("Library purgeResource error:", error);
    res.status(error.message.includes("restricted") ? 403 : 400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/library/resources/:id/view
 * Student endpoint: validates access and returns authorized view delivery.
 */
async function studentViewResource(req, res) {
  try {
    const result = await libraryResourceService.authorizeStudentAccess(
      req.params.id,
      req.user,
      { mode: "view" }
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Student view resource error:", error);
    const isDenied = error.message.includes("Access denied");
    res.status(isDenied ? 403 : 400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/library/resources/:id/download
 * Student endpoint: validates access and returns authorized download delivery.
 */
async function studentDownloadResource(req, res) {
  try {
    const result = await libraryResourceService.authorizeStudentAccess(
      req.params.id,
      req.user,
      { mode: "download" }
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Student download resource error:", error);
    const isDenied = error.message.includes("Access denied") || error.message.includes("cannot be downloaded");
    res.status(isDenied ? 403 : 400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/library/resources/:id/view
 * Admin endpoint: generates secure signed view delivery for previewing.
 */
async function adminViewResource(req, res) {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, isDeleted: false });
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found or has been archived" });
    }

    if (resource.cloudinaryPublicId) {
      const format = path.extname(resource.originalFileName || "").replace(".", "") || "pdf";
      const deliveryUrl = cloudinaryService.generateSignedViewUrl(
        resource.cloudinaryPublicId,
        format,
        resource.cloudinaryResourceType || "raw",
        resource.cloudinaryDeliveryType || "authenticated",
        3600
      );
      return res.json({
        success: true,
        deliveryUrl,
        resource: {
          _id: resource._id,
          title: resource.title,
          description: resource.description,
          resourceType: resource.resourceType,
          originalFileName: resource.originalFileName,
          fileSize: resource.fileSize,
          accessTier: resource.accessTier,
          isDownloadable: resource.isDownloadable
        },
        expiresInSeconds: 3600
      });
    }

    res.json({
      success: true,
      deliveryUrl: resource.fileUrl,
      noteContent: resource.resourceType === "note" ? resource.description : null,
      resource: {
        _id: resource._id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resourceType,
        accessTier: resource.accessTier,
        isDownloadable: false
      }
    });
  } catch (error) {
    console.error("Admin view resource error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/library/resources/:id/download
 * Admin endpoint: generates secure signed download delivery.
 */
async function adminDownloadResource(req, res) {
  try {
    const resource = await Resource.findOne({ _id: req.params.id, isDeleted: false });
    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found or has been archived" });
    }

    if (resource.cloudinaryPublicId) {
      const format = path.extname(resource.originalFileName || "").replace(".", "") || "pdf";
      const deliveryUrl = cloudinaryService.generateSignedDownloadUrl(
        resource.cloudinaryPublicId,
        format,
        resource.cloudinaryResourceType || "raw",
        resource.cloudinaryDeliveryType || "authenticated",
        3600
      );
      return res.json({
        success: true,
        deliveryUrl,
        resource: {
          _id: resource._id,
          title: resource.title,
          description: resource.description,
          resourceType: resource.resourceType,
          originalFileName: resource.originalFileName,
          fileSize: resource.fileSize,
          accessTier: resource.accessTier,
          isDownloadable: resource.isDownloadable
        },
        expiresInSeconds: 3600
      });
    }

    res.json({
      success: true,
      deliveryUrl: resource.fileUrl,
      noteContent: resource.resourceType === "note" ? resource.description : null
    });
  } catch (error) {
    console.error("Admin download resource error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/admin/library/resources
 * Lists resources in a folder (or root when folderId="root" or null)
 */
async function listResources(req, res) {
  try {
    const { folderId } = req.query;
    const targetFolderId = (!folderId || folderId === "root" || folderId === "null") ? null : folderId;
    const result = await libraryResourceService.listResourcesInFolder(targetFolderId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Library listResources error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  listResources,
  uploadResource,
  createResource,
  updateResource,
  moveResource,
  reorderResources,
  deleteResource,
  purgeResource,
  studentViewResource,
  studentDownloadResource,
  adminViewResource,
  adminDownloadResource
};
