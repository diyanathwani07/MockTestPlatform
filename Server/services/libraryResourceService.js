const mongoose = require("mongoose");
const Resource = require("../models/Resource");
const Folder = require("../models/Folder");
const User = require("../models/User");
const cloudinaryService = require("./cloudinaryService");
const path = require("path");

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
 * Checks if a user has enrolled in a specific exam series.
 * Safely handles ObjectIds, strings, populated documents, null/undefined, and malformed IDs.
 */
function userHasEnrolledInExam(purchasedExams, targetExamSeriesId) {
  if (!targetExamSeriesId || !Array.isArray(purchasedExams) || purchasedExams.length === 0) {
    return false;
  }
  return purchasedExams.some((purchasedId) => isMatchingObjectId(purchasedId, targetExamSeriesId));
}

/**
 * Creates a file-based study resource (PDF, DOCX, DOC, Image) uploaded to Cloudinary.
 */
async function createFileResource(file, bodyData, userId) {
  const {
    title,
    description = "",
    folderId,
    resourceType,
    accessTier = "free",
    isDownloadable = true,
    order = 0
  } = bodyData;

  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error("Resource title is required");
  }

  if (!folderId) {
    throw new Error("Target folderId is required");
  }

  const folder = await Folder.findOne({ _id: folderId, isDeleted: false });
  if (!folder) {
    throw new Error("Target folder not found or has been archived");
  }
  if (!folder.isActive) {
    throw new Error("Cannot add study resources to an inactive folder");
  }

  // Upload buffer to Cloudinary
  const sanitizedFileName = file.sanitizedFileName || file.originalname;
  let uploadResult;
  try {
    uploadResult = await cloudinaryService.uploadFile(
      file.buffer,
      "study_library",
      sanitizedFileName,
      { deliveryType: "authenticated" }
    );
  } catch (uploadErr) {
    console.error("Cloudinary Upload Error in libraryResourceService:", uploadErr);
    throw new Error(`File storage upload failed: ${uploadErr.message}`);
  }

  // Determine actual Cloudinary resource type
  const actualResourceType =
    uploadResult.resource_type || (file.mimetype.startsWith("image/") ? "image" : "raw");

  // Determine next order if not supplied
  let finalOrder = order;
  if (!finalOrder || finalOrder === 0) {
    const lastItem = await Resource.findOne({ folderId, isDeleted: false })
      .sort({ order: -1 })
      .select("order");
    finalOrder = lastItem ? (lastItem.order || 0) + 1 : 1;
  }

  const resource = new Resource({
    title: title.trim(),
    description: description ? description.trim() : "",
    folderId: folder._id,
    resourceType: resourceType || (file.mimetype === "application/pdf" ? "pdf" : file.mimetype.includes("word") ? "docx" : "image"),
    fileUrl: uploadResult.secure_url,
    cloudinaryPublicId: uploadResult.public_id,
    cloudinaryResourceType: actualResourceType,
    cloudinaryDeliveryType: "authenticated",
    originalFileName: sanitizedFileName,
    mimeType: file.mimetype,
    fileSize: file.size || (file.buffer ? file.buffer.length : 0),
    order: finalOrder,
    accessTier: accessTier || "free",
    isDownloadable: isDownloadable !== false && isDownloadable !== "false",
    uploadedBy: userId,
    isPublished: true,
    isDeleted: false
  });

  try {
    await resource.save();
    return resource;
  } catch (dbErr) {
    // Attempt compensation / cleanup of orphaned Cloudinary asset
    console.error("Database save failed. Attempting Cloudinary orphan cleanup...", dbErr);
    try {
      if (uploadResult && uploadResult.public_id) {
        await cloudinaryService.deleteFile(
          uploadResult.public_id,
          actualResourceType,
          "authenticated"
        );
      }
    } catch (cleanupErr) {
      console.error("Failed to clean up orphaned Cloudinary asset:", cleanupErr);
    }
    throw dbErr;
  }
}

/**
 * Creates link-based (video/web) or text-based (note) resources.
 */
async function createLinkOrNoteResource(data, userId) {
  const {
    title,
    description = "",
    folderId,
    resourceType,
    fileUrl = null,
    accessTier = "free",
    isDownloadable = false,
    order = 0
  } = data;

  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error("Resource title is required");
  }

  if (!folderId) {
    throw new Error("Target folderId is required");
  }

  const folder = await Folder.findOne({ _id: folderId, isDeleted: false });
  if (!folder) {
    throw new Error("Target folder not found or has been archived");
  }
  if (!folder.isActive) {
    throw new Error("Cannot add study resources to an inactive folder");
  }

  if (["video_link", "web_link"].includes(resourceType)) {
    if (!fileUrl || typeof fileUrl !== "string" || !fileUrl.trim()) {
      throw new Error(`Link-based resource (${resourceType}) requires a valid target URL`);
    }
  }

  let finalOrder = order;
  if (!finalOrder || finalOrder === 0) {
    const lastItem = await Resource.findOne({ folderId, isDeleted: false })
      .sort({ order: -1 })
      .select("order");
    finalOrder = lastItem ? (lastItem.order || 0) + 1 : 1;
  }

  const resource = new Resource({
    title: title.trim(),
    description: description ? description.trim() : "",
    folderId: folder._id,
    resourceType,
    fileUrl: fileUrl ? fileUrl.trim() : null,
    cloudinaryPublicId: null,
    cloudinaryResourceType: "raw",
    originalFileName: null,
    mimeType: resourceType === "note" ? "text/plain" : "text/uri-list",
    fileSize: 0,
    order: finalOrder,
    accessTier: accessTier || "free",
    isDownloadable: isDownloadable === true || isDownloadable === "true",
    uploadedBy: userId,
    isPublished: true,
    isDeleted: false
  });

  await resource.save();
  return resource;
}

/**
 * Updates resource metadata (title, description, access tier, order, status).
 */
async function updateResource(resourceId, updateData, userId) {
  const resource = await Resource.findOne({ _id: resourceId, isDeleted: false });
  if (!resource) {
    throw new Error("Resource not found or has been archived");
  }

  const allowedFields = ["title", "description", "accessTier", "isDownloadable", "isPublished", "order"];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (typeof updateData[field] === "string") {
        resource[field] = updateData[field].trim();
      } else {
        resource[field] = updateData[field];
      }
    }
  });

  await resource.save();
  return resource;
}

/**
 * Moves a resource to a new folder, ensuring cross-scope and cross-exam isolation.
 */
async function moveResource(resourceId, targetFolderId, userId) {
  const resource = await Resource.findOne({ _id: resourceId, isDeleted: false });
  if (!resource) {
    throw new Error("Resource not found or has been archived");
  }

  const [currentFolder, targetFolder] = await Promise.all([
    Folder.findOne({ _id: resource.folderId, isDeleted: false }),
    Folder.findOne({ _id: targetFolderId, isDeleted: false })
  ]);

  if (!targetFolder) {
    throw new Error("Target destination folder does not exist or has been archived");
  }
  if (!targetFolder.isActive) {
    throw new Error("Cannot move resource into an inactive folder");
  }

  if (currentFolder) {
    if (currentFolder.scope !== targetFolder.scope) {
      throw new Error("Cannot move resource across different library scopes (global vs exam_specific)");
    }
    if (currentFolder.scope === "exam_specific") {
      if (!isMatchingObjectId(currentFolder.examSeriesId, targetFolder.examSeriesId)) {
        throw new Error("Cannot move resource across different exam series");
      }
    }
  }

  resource.folderId = targetFolder._id;
  await resource.save();
  return resource;
}

/**
 * Reorders resources inside a folder.
 */
async function reorderResources(resourceOrders) {
  if (!Array.isArray(resourceOrders) || resourceOrders.length === 0) {
    throw new Error("resourceOrders array with { resourceId, order } items is required");
  }

  const bulkOps = resourceOrders.map((item) => ({
    updateOne: {
      filter: { _id: item.resourceId, isDeleted: false },
      update: { $set: { order: Number(item.order) || 0 } }
    }
  }));

  await Resource.bulkWrite(bulkOps);
  return { success: true, count: resourceOrders.length };
}

/**
 * Soft-deletes a resource. Preserves Cloudinary asset and record metadata.
 */
async function softDeleteResource(resourceId, userId) {
  const resource = await Resource.findOne({ _id: resourceId, isDeleted: false });
  if (!resource) {
    throw new Error("Resource not found or is already archived");
  }

  resource.isDeleted = true;
  await resource.save();
  return { success: true, resourceId, isDeleted: true };
}

/**
 * Permanently purges a resource from database and destroys Cloudinary asset.
 * Restricted strictly to Super Admin.
 */
async function permanentPurgeResource(resourceId, user, { confirmPurge = false } = {}) {
  if (!user || user.role !== "superadmin") {
    throw new Error("Permanent purge is restricted strictly to Super Administrators");
  }

  if (!confirmPurge) {
    throw new Error("Explicit confirmPurge: true flag is required to permanently destroy a resource");
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new Error("Resource not found");
  }

  // Destroy Cloudinary asset using actual stored resource_type and deliveryType
  if (resource.cloudinaryPublicId) {
    try {
      await cloudinaryService.deleteFile(
        resource.cloudinaryPublicId,
        resource.cloudinaryResourceType || "raw",
        resource.cloudinaryDeliveryType || "authenticated"
      );
    } catch (cErr) {
      console.error(`Failed to destroy Cloudinary asset (${resource.cloudinaryPublicId}):`, cErr);
    }
  }

  await Resource.findByIdAndDelete(resourceId);
  return { success: true, resourceId, purged: true };
}

/**
 * Lists resources in a folder with pagination, sorting, and search.
 */
async function listResourcesInFolder(folderId, queryParams = {}) {
  const {
    page = 1,
    limit = 20,
    search = "",
    resourceType = "",
    accessTier = "",
    includeUnpublished = true
  } = queryParams;

  const filter = {
    folderId,
    isDeleted: false
  };

  if (!includeUnpublished) {
    filter.isPublished = true;
  }

  if (resourceType) {
    filter.resourceType = resourceType;
  }

  if (accessTier) {
    filter.accessTier = accessTier;
  }

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { title: { $regex: s, $options: "i" } },
      { description: { $regex: s, $options: "i" } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [resources, totalCount] = await Promise.all([
    Resource.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("uploadedBy", "fullName email avatar")
      .lean(),
    Resource.countDocuments(filter)
  ]);

  return {
    resources,
    totalCount,
    currentPage: pageNum,
    totalPages: Math.ceil(totalCount / limitNum),
    limit: limitNum
  };
}

/**
 * Validates student entitlement to a study resource and returns authorized view or download delivery.
 */
async function authorizeStudentAccess(resourceId, studentUser, { mode = "view" } = {}) {
  const resource = await Resource.findOne({
    _id: resourceId,
    isDeleted: false,
    isPublished: true
  });

  if (!resource) {
    throw new Error("Study resource not found or is currently unpublished");
  }

  const folder = await Folder.findOne({
    _id: resource.folderId,
    isDeleted: false,
    isActive: true
  });

  if (!folder) {
    throw new Error("The folder containing this resource is unavailable");
  }

  // Verify that no ancestor folder is deleted or inactive
  if (folder.ancestors && folder.ancestors.length > 0) {
    const inactiveAncestors = await Folder.countDocuments({
      _id: { $in: folder.ancestors },
      $or: [{ isDeleted: true }, { isActive: false }]
    });
    if (inactiveAncestors > 0) {
      throw new Error("Access to this study resource is blocked by an archived parent folder");
    }
  }

  // 1. Exam Scope Check
  if (folder.scope === "exam_specific") {
    const hasExam = userHasEnrolledInExam(studentUser.purchasedExams, folder.examSeriesId);
    if (!hasExam) {
      throw new Error("Access denied. You have not enrolled in or purchased this exam series");
    }
  }

  // 2. Resource Access Tier Check
  if (resource.accessTier === "premium_subscriber") {
    const isPremium = !!studentUser.isPremium;
    const isExpired = studentUser.premiumExpiresAt && new Date(studentUser.premiumExpiresAt) < new Date();
    if (!isPremium || isExpired) {
      throw new Error("Access denied. This premium study resource requires an active subscription");
    }
  } else if (resource.accessTier === "exam_enrolled") {
    if (folder.scope === "exam_specific") {
      const hasExam = userHasEnrolledInExam(studentUser.purchasedExams, folder.examSeriesId);
      if (!hasExam) {
        throw new Error("Access denied. Enrollment in this exam series is required");
      }
    }
  }

  // 3. Download permission check
  if (mode === "download") {
    if (resource.isDownloadable === false) {
      throw new Error("This study resource is configured for online viewing only and cannot be downloaded");
    }
    // Increment download count atomically
    await Resource.updateOne({ _id: resource._id }, { $inc: { downloadCount: 1 } });
  } else {
    // Increment view count atomically
    await Resource.updateOne({ _id: resource._id }, { $inc: { viewCount: 1 } });
  }

  // 4. Secure delivery generation
  if (resource.cloudinaryPublicId) {
    const format = path.extname(resource.originalFileName || "").replace(".", "") || "pdf";
    const deliveryType = resource.cloudinaryDeliveryType || "authenticated";
    const deliveryUrl =
      mode === "download"
        ? cloudinaryService.generateSignedDownloadUrl(
            resource.cloudinaryPublicId,
            format,
            resource.cloudinaryResourceType || "raw",
            deliveryType,
            3600
          )
        : cloudinaryService.generateSignedViewUrl(
            resource.cloudinaryPublicId,
            resource.cloudinaryResourceType || "raw",
            deliveryType,
            3600
          );

    return {
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
      deliveryUrl,
      expiresInSeconds: 3600
    };
  }

  // Link-based or note resource
  return {
    resource: {
      _id: resource._id,
      title: resource.title,
      description: resource.description,
      resourceType: resource.resourceType,
      accessTier: resource.accessTier,
      isDownloadable: false
    },
    deliveryUrl: resource.fileUrl,
    noteContent: resource.resourceType === "note" ? resource.description : null,
    expiresInSeconds: null
  };
}

module.exports = {
  createFileResource,
  createLinkOrNoteResource,
  updateResource,
  moveResource,
  reorderResources,
  softDeleteResource,
  permanentPurgeResource,
  listResourcesInFolder,
  authorizeStudentAccess,
  isMatchingObjectId,
  userHasEnrolledInExam
};
