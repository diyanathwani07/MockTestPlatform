const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const libraryFolderService = require("../services/libraryFolderService");
const libraryResourceService = require("../services/libraryResourceService");
const libraryResourceController = require("../controllers/libraryResourceController");
const Folder = require("../models/Folder");
const Resource = require("../models/Resource");
const User = require("../models/User");
const ExamSeries = require("../models/ExamSeries");

// All student library routes require authenticated student
router.use(protect);

/**
 * GET /api/library/folders/browse
 * Browse permitted global folders and exam-specific folders matching the student's active enrollments.
 */
router.get("/folders/browse", async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select("purchasedExams isPremium activePlan premiumExpiresAt");
    const purchasedExamIds = (student?.purchasedExams || []).map((id) => id.toString());

    // Fetch details of all enrolled exam series
    const purchasedExamSeries = await ExamSeries.find({ _id: { $in: purchasedExamIds }, isPublished: { $ne: false } })
      .select("title description category icon thumbnail")
      .lean();
    const seriesMap = new Map(purchasedExamSeries.map((s) => [s._id.toString(), s]));

    const { scope = "all", examSeriesId = null } = req.query;

    let globalTree = [];
    let examTrees = [];

    // 1. Fetch Global folders if requested
    if (scope === "all" || scope === "global") {
      globalTree = await libraryFolderService.getFolderTree({ scope: "global" });
    }

    // 2. Fetch Exam-specific folders if requested
    if (scope === "all" || scope === "exam_specific") {
      if (examSeriesId) {
        if (!purchasedExamIds.includes(examSeriesId.toString())) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You have not enrolled in or purchased this exam series."
          });
        }
        const seriesInfo = seriesMap.get(examSeriesId.toString());
        const tree = await libraryFolderService.getFolderTree({
          scope: "exam_specific",
          examSeriesId
        });
        examTrees.push({
          examSeriesId,
          examSeriesTitle: seriesInfo?.title || "Exam Series",
          examSeriesDescription: seriesInfo?.description || "",
          examSeriesIcon: seriesInfo?.icon || null,
          tree
        });
      } else {
        // Return folders for all purchased exams
        for (const eId of purchasedExamIds) {
          const seriesInfo = seriesMap.get(eId);
          const tree = await libraryFolderService.getFolderTree({
            scope: "exam_specific",
            examSeriesId: eId
          });
          if (tree && tree.length > 0) {
            examTrees.push({
              examSeriesId: eId,
              examSeriesTitle: seriesInfo?.title || "Exam Series",
              examSeriesDescription: seriesInfo?.description || "",
              examSeriesIcon: seriesInfo?.icon || null,
              tree
            });
          }
        }
      }
    }

    res.json({
      success: true,
      globalTree,
      examTrees,
      enrolledExams: purchasedExamSeries.map((s) => ({
        _id: s._id,
        title: s.title,
        description: s.description,
        category: s.category,
        icon: s.icon,
        thumbnail: s.thumbnail
      }))
    });
  } catch (error) {
    console.error("Student browse error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/library/search
 * Search across authorized folders and resources.
 */
router.get("/search", async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select("purchasedExams isPremium activePlan premiumExpiresAt");
    const purchasedExamIds = (student?.purchasedExams || []).map((id) => id.toString());
    const isStudentPremium =
      !!student?.isPremium && (!student.premiumExpiresAt || new Date(student.premiumExpiresAt) >= new Date());

    const { q = "", scope = "all", resourceType = "", accessTier = "" } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, folders: [], resources: [] });
    }

    const searchRegex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // 1. Determine permitted folder scope
    let folderScopeFilter = { isDeleted: false, isActive: true };
    if (scope === "global") {
      folderScopeFilter.scope = "global";
    } else if (scope === "exam_specific") {
      folderScopeFilter.scope = "exam_specific";
      folderScopeFilter.examSeriesId = { $in: purchasedExamIds };
    } else {
      folderScopeFilter.$or = [
        { scope: "global" },
        { scope: "exam_specific", examSeriesId: { $in: purchasedExamIds } }
      ];
    }

    // Match authorized folders
    const matchedFolders = await Folder.find({
      ...folderScopeFilter,
      $or: [{ name: searchRegex }, { description: searchRegex }]
    })
      .limit(10)
      .lean();

    // Match authorized resources
    const allPermittedFolderIds = await Folder.find(folderScopeFilter).distinct("_id");

    const resourceFilter = {
      folderId: { $in: allPermittedFolderIds },
      isDeleted: false,
      isPublished: true,
      $or: [{ title: searchRegex }, { description: searchRegex }]
    };

    if (resourceType) {
      resourceFilter.resourceType = resourceType;
    }
    if (accessTier) {
      resourceFilter.accessTier = accessTier;
    }

    const matchedResources = await Resource.find(resourceFilter)
      .populate("folderId", "name scope examSeriesId color")
      .limit(30)
      .lean();

    const annotatedResources = matchedResources.map((r) => {
      let isUnlocked = false;
      const folder = r.folderId;
      if (r.accessTier === "free") {
        isUnlocked = true;
      } else if (r.accessTier === "premium_subscriber") {
        isUnlocked = isStudentPremium;
      } else if (r.accessTier === "exam_enrolled") {
        isUnlocked = purchasedExamIds.includes(folder?.examSeriesId?.toString());
      }
      return {
        _id: r._id,
        title: r.title,
        description: r.description,
        resourceType: r.resourceType,
        originalFileName: r.originalFileName,
        fileSize: r.fileSize,
        accessTier: r.accessTier,
        isDownloadable: r.isDownloadable,
        isUnlocked,
        folder: folder ? { _id: folder._id, name: folder.name, scope: folder.scope } : null,
        createdAt: r.createdAt
      };
    });

    res.json({
      success: true,
      folders: matchedFolders.map((f) => ({
        _id: f._id,
        name: f.name,
        description: f.description,
        scope: f.scope,
        examSeriesId: f.examSeriesId,
        color: f.color,
        icon: f.icon
      })),
      resources: annotatedResources
    });
  } catch (error) {
    console.error("Student search error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/library/folders/:id
 * Retrieves authorized folder contents (breadcrumbs, child folders, and authorized resources).
 */
router.get("/folders/:id", async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select("purchasedExams isPremium activePlan premiumExpiresAt");
    const purchasedExamIds = (student?.purchasedExams || []).map((id) => id.toString());

    const folderData = await libraryFolderService.getFolderDetails(req.params.id);
    const folder = folderData.folder;

    if (!folder.isActive || folder.isDeleted) {
      return res.status(404).json({ success: false, message: "Folder not found or unavailable." });
    }

    // Check ancestors status
    if (folder.ancestors && folder.ancestors.length > 0) {
      const inactiveAncestors = await Folder.countDocuments({
        _id: { $in: folder.ancestors },
        $or: [{ isDeleted: true }, { isActive: false }]
      });
      if (inactiveAncestors > 0) {
        return res.status(403).json({
          success: false,
          message: "Access to this folder is blocked by an inactive parent."
        });
      }
    }

    // If exam_specific, check student's purchasedExams
    if (folder.scope === "exam_specific") {
      if (!purchasedExamIds.includes(folder.examSeriesId?.toString())) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You have not enrolled in or purchased this exam series."
        });
      }
    }

    // Fetch published resources inside this folder
    const resourcesData = await libraryResourceService.listResourcesInFolder(req.params.id, {
      ...req.query,
      includeUnpublished: false
    });

    const isStudentPremium =
      !!student.isPremium &&
      (!student.premiumExpiresAt || new Date(student.premiumExpiresAt) >= new Date());

    // Annotate resources with unlocking status
    const annotatedResources = resourcesData.resources.map((r) => {
      let isUnlocked = false;
      if (r.accessTier === "free") {
        isUnlocked = true;
      } else if (r.accessTier === "premium_subscriber") {
        isUnlocked = isStudentPremium;
      } else if (r.accessTier === "exam_enrolled") {
        isUnlocked = purchasedExamIds.includes(folder.examSeriesId?.toString());
      }

      return {
        _id: r._id,
        title: r.title,
        description: r.description,
        resourceType: r.resourceType,
        originalFileName: r.originalFileName,
        fileSize: r.fileSize,
        accessTier: r.accessTier,
        isDownloadable: r.isDownloadable,
        isUnlocked,
        order: r.order,
        createdAt: r.createdAt
      };
    });

    res.json({
      success: true,
      folder: {
        _id: folder._id,
        name: folder.name,
        description: folder.description,
        parentId: folder.parentId,
        scope: folder.scope,
        examSeriesId: folder.examSeriesId,
        color: folder.color,
        icon: folder.icon
      },
      breadcrumbs: folderData.breadcrumbs,
      children: folderData.immediateChildren.filter((c) => c.isActive && !c.isDeleted),
      resources: annotatedResources,
      totalCount: resourcesData.totalCount,
      currentPage: resourcesData.currentPage,
      totalPages: resourcesData.totalPages
    });
  } catch (error) {
    console.error("Student folder details error:", error);
    res.status(error.message.includes("not found") ? 404 : 400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/library/resources/:id/view
 * Validates access and returns authorized view delivery.
 */
router.get("/resources/:id/view", libraryResourceController.studentViewResource);

/**
 * GET /api/library/resources/:id/download
 * Validates download permission and returns authorized download delivery.
 */
router.get("/resources/:id/download", libraryResourceController.studentDownloadResource);

module.exports = router;
