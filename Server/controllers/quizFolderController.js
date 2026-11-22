const mongoose = require("mongoose");
const QuizFolder = require("../models/QuizFolder");
const Quiz = require("../models/Quiz");
const Result = require("../models/Result");
const quizService = require("../services/quizService");

/**
 * GET /api/quizzes/explorer
 * Fetches folder breadcrumbs, child subfolders, and quizzes for the current folder view.
 */
exports.getFolderExplorer = async (req, res) => {
  try {
    const folderId = req.query.folderId && req.query.folderId !== "null" && req.query.folderId !== "root"
      ? req.query.folderId
      : null;
    const search = (req.query.search || "").trim();
    const examSeriesId = req.query.examSeriesId || null;

    let currentFolder = null;
    let breadcrumbs = [{ _id: null, title: "Home" }];

    if (folderId) {
      if (!mongoose.Types.ObjectId.isValid(folderId)) {
        return res.status(400).json({ success: false, message: "Invalid folder ID" });
      }

      currentFolder = await QuizFolder.findById(folderId).lean();
      if (!currentFolder) {
        return res.status(404).json({ success: false, message: "Folder not found" });
      }

      // Fetch ancestors for breadcrumb trail
      if (Array.isArray(currentFolder.ancestors) && currentFolder.ancestors.length > 0) {
        const ancestorDocs = await QuizFolder.find({
          _id: { $in: currentFolder.ancestors }
        })
          .select("_id title")
          .lean();

        // Maintain hierarchy order matching currentFolder.ancestors array
        const ancestorMap = new Map(ancestorDocs.map(doc => [doc._id.toString(), doc]));
        currentFolder.ancestors.forEach(ancId => {
          const match = ancestorMap.get(ancId.toString());
          if (match) breadcrumbs.push({ _id: match._id, title: match.title });
        });
      }

      breadcrumbs.push({ _id: currentFolder._id, title: currentFolder.title });
    }

    // Check if Deep Global Search across all directories was requested
    const isGlobal = req.query.global === "true" && Boolean(search && search.trim());
    if (isGlobal) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(safeSearch, "i");
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
      const skip = (page - 1) * limit;

      const [globalFolders, totalQuizzes, globalQuizzes] = await Promise.all([
        QuizFolder.find({
          $or: [{ title: searchRegex }, { description: searchRegex }]
        })
          .populate("ancestors", "_id title")
          .sort({ sortOrder: 1, title: 1 })
          .limit(50)
          .lean(),
        Quiz.countDocuments({
          isDeleted: { $ne: true },
          quizType: { $ne: "custom" },
          $or: [{ title: searchRegex }, { subject: searchRegex }, { description: searchRegex }]
        }),
        Quiz.find({
          isDeleted: { $ne: true },
          quizType: { $ne: "custom" },
          $or: [{ title: searchRegex }, { subject: searchRegex }, { description: searchRegex }]
        })
          .populate({
            path: "folderId",
            select: "_id title ancestors",
            populate: { path: "ancestors", select: "_id title" }
          })
          .select("title subject duration marksPerQuestion status published totalMarks isPaid price sortOrder questions sections createdAt updatedAt thumbnail folderId")
          .sort({ sortOrder: 1, title: 1 })
          .skip(skip)
          .limit(limit)
          .lean()
      ]);

      const globalFolderIds = globalFolders.map(f => f._id);
      const folderQuizCounts = await Quiz.aggregate([
        { $match: { folderId: { $in: globalFolderIds }, isDeleted: { $ne: true } } },
        { $group: { _id: "$folderId", count: { $sum: 1 } } }
      ]);
      const folderQuizCountMap = new Map(folderQuizCounts.map(item => [item._id.toString(), item.count]));

      const enrichedGlobalFolders = globalFolders.map(f => {
        const pathTitles = ["Home", ...(f.ancestors || []).map(a => a.title)];
        return {
          ...f,
          folderPath: pathTitles.join(" > "),
          quizCount: folderQuizCountMap.get(f._id.toString()) || 0
        };
      });

      const enrichedGlobalQuizzes = globalQuizzes.map(q => {
        let qCount = 0;
        if (Array.isArray(q.questions) && q.questions.length > 0) {
          qCount = q.questions.length;
        } else if (Array.isArray(q.sections)) {
          q.sections.forEach(sec => {
            if (Array.isArray(sec.questions)) qCount += sec.questions.length;
          });
        }

        let folderPath = "Home";
        if (q.folderId) {
          const ancTitles = (q.folderId.ancestors || []).map(a => a.title);
          folderPath = ["Home", ...ancTitles, q.folderId.title].join(" > ");
        }

        return {
          ...q,
          questionCount: qCount,
          folderPath,
          directFolderId: q.folderId ? q.folderId._id : null
        };
      });

      return res.json({
        success: true,
        currentFolder,
        breadcrumbs,
        folders: enrichedGlobalFolders,
        quizzes: enrichedGlobalQuizzes,
        pagination: {
          total: totalQuizzes,
          page,
          limit,
          totalPages: Math.ceil(totalQuizzes / limit)
        },
        isGlobalSearch: true
      });
    }

    // Build filter queries for current folder level
    const validCurrentFolderId = folderId && mongoose.Types.ObjectId.isValid(folderId)
      ? new mongoose.Types.ObjectId(folderId)
      : null;

    const folderFilter = validCurrentFolderId
      ? { parentId: validCurrentFolderId }
      : { $or: [{ parentId: null }, { parentId: { $exists: false } }] };

    const folderMatch = validCurrentFolderId
      ? { folderId: validCurrentFolderId }
      : { $or: [{ folderId: null }, { folderId: { $exists: false } }] };

    const quizFilter = {
      isDeleted: { $ne: true },
      quizType: { $ne: "custom" },
      $and: [folderMatch]
    };

    if (examSeriesId) {
      folderFilter.examSeriesId = examSeriesId;
      quizFilter.$and.push({ examSeriesId });
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      folderFilter.$or = [{ title: searchRegex }, { description: searchRegex }];
      quizFilter.$and.push({
        $or: [{ title: searchRegex }, { subject: searchRegex }, { description: searchRegex }]
      });
    }

    // Fetch child folders
    const subfolders = await QuizFolder.find(folderFilter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // Attach item counts (quizzes + subfolders) for each child folder
    const folderIds = subfolders.map(f => f._id);
    const [quizCounts, subfolderCounts] = await Promise.all([
      Quiz.aggregate([
        { $match: { folderId: { $in: folderIds }, isDeleted: { $ne: true } } },
        { $group: { _id: "$folderId", count: { $sum: 1 } } }
      ]),
      QuizFolder.aggregate([
        { $match: { parentId: { $in: folderIds } } },
        { $group: { _id: "$parentId", count: { $sum: 1 } } }
      ])
    ]);

    const quizCountMap = new Map(quizCounts.map(item => [item._id.toString(), item.count]));
    const subfolderCountMap = new Map(subfolderCounts.map(item => [item._id.toString(), item.count]));

    const enrichedFolders = subfolders.map(f => {
      const qCount = quizCountMap.get(f._id.toString()) || 0;
      const sCount = subfolderCountMap.get(f._id.toString()) || 0;
      return {
        ...f,
        quizCount: qCount,
        subfolderCount: sCount,
        totalItems: qCount + sCount
      };
    });

    // Fetch quizzes in current folder
    const quizzes = await Quiz.find(quizFilter)
      .select("title subject duration marksPerQuestion status published totalMarks isPaid price sortOrder questions sections createdAt updatedAt thumbnail")
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // Format quiz response with question count
    const enrichedQuizzes = quizzes.map(q => {
      let qCount = 0;
      if (Array.isArray(q.questions) && q.questions.length > 0) {
        qCount = q.questions.length;
      } else if (Array.isArray(q.sections)) {
        q.sections.forEach(sec => {
          if (Array.isArray(sec.questions)) qCount += sec.questions.length;
        });
      }
      return {
        ...q,
        questionCount: qCount
      };
    });

    res.json({
      success: true,
      currentFolder,
      breadcrumbs,
      folders: enrichedFolders,
      quizzes: enrichedQuizzes
    });
  } catch (error) {
    console.error("Error in getFolderExplorer:", error);
    res.status(500).json({ success: false, message: "Failed to fetch folder explorer contents", error: error.message });
  }
};

/**
 * POST /api/quizzes/folders
 * Creates a new Quiz Folder.
 */
exports.createFolder = async (req, res) => {
  try {
    const { title, description = "", parentId = null, thumbnail = "", examSeriesId = null, sortOrder = 0, linkedQuizIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Folder title is required" });
    }

    let ancestors = [];
    let validParentId = null;

    if (parentId && parentId !== "null" && parentId !== "root" && parentId !== "") {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ success: false, message: "Invalid parent folder ID" });
      }

      const parentFolder = await QuizFolder.findById(parentId);
      if (!parentFolder) {
        return res.status(404).json({ success: false, message: "Parent folder not found" });
      }

      validParentId = parentFolder._id;
      ancestors = [...(parentFolder.ancestors || []), parentFolder._id];
    }

    const newFolder = await QuizFolder.create({
      title: title.trim(),
      description: (description || "").trim(),
      thumbnail: thumbnail || "",
      parentId: validParentId,
      ancestors,
      examSeriesId: examSeriesId && mongoose.Types.ObjectId.isValid(examSeriesId) ? examSeriesId : null,
      sortOrder: Number(sortOrder) || 0,
      price: req.body.price !== undefined ? Number(req.body.price) : 0,
      mrp: req.body.mrp !== undefined ? Number(req.body.mrp) : 0,
      isFeatured: Boolean(req.body.isFeatured),
      validityType: req.body.validityType || "lifetime",
      validityDays: req.body.validityDays ? Number(req.body.validityDays) : 365,
      validityDate: req.body.validityDate ? new Date(req.body.validityDate) : null,
      detailedDescription: req.body.detailedDescription || "",
      instructions: req.body.instructions || "",
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      createdBy: req.user?._id || null
    });

    // If linkedQuizIds was supplied, reparent those quizzes to this newly created folder
    if (Array.isArray(linkedQuizIds) && linkedQuizIds.length > 0) {
      await Quiz.updateMany(
        { _id: { $in: linkedQuizIds } },
        { $set: { folderId: newFolder._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: "Folder created successfully",
      folder: newFolder
    });
  } catch (error) {
    console.error("Error creating QuizFolder:", error);
    res.status(500).json({ success: false, message: "Failed to create folder", error: error.message });
  }
};

/**
 * GET /api/quizzes/folders/:id
 * Fetches single folder with its direct quizzes for AppX Course Editor
 */
exports.getFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid folder ID" });
    }

    const folder = await QuizFolder.findById(id).populate("examSeriesId", "title name").lean();
    if (!folder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    const quizzes = await Quiz.find({ folderId: folder._id, isDeleted: { $ne: true } })
      .select("title subject duration questions isPaid price status published sortOrder")
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      folder,
      quizzes: quizzes.map(q => ({
        ...q,
        questionCount: Array.isArray(q.questions) ? q.questions.length : 0
      }))
    });
  } catch (error) {
    console.error("Error in getFolderById:", error);
    res.status(500).json({ success: false, message: "Failed to fetch folder details", error: error.message });
  }
};

/**
 * PATCH /api/quizzes/folders/:id
 * Updates an existing Quiz Folder.
 */
exports.updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      thumbnail,
      isPublished,
      sortOrder,
      examSeriesId,
      price,
      mrp,
      isFeatured,
      validityType,
      validityDays,
      validityDate,
      detailedDescription,
      instructions,
      tags,
      linkedQuizIds
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid folder ID" });
    }

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (thumbnail !== undefined) updates.thumbnail = thumbnail;
    if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
    if (examSeriesId !== undefined) {
      updates.examSeriesId = examSeriesId && mongoose.Types.ObjectId.isValid(examSeriesId) ? examSeriesId : null;
    }
    if (price !== undefined) updates.price = Number(price);
    if (mrp !== undefined) updates.mrp = Number(mrp);
    if (isFeatured !== undefined) updates.isFeatured = Boolean(isFeatured);
    if (validityType !== undefined) updates.validityType = validityType;
    if (validityDays !== undefined) updates.validityDays = Number(validityDays);
    if (validityDate !== undefined) updates.validityDate = validityDate ? new Date(validityDate) : null;
    if (detailedDescription !== undefined) updates.detailedDescription = detailedDescription;
    if (instructions !== undefined) updates.instructions = instructions;
    if (tags !== undefined && Array.isArray(tags)) updates.tags = tags;

    const updatedFolder = await QuizFolder.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updatedFolder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    // If linkedQuizIds was supplied, reparent those quizzes to this folder
    if (Array.isArray(linkedQuizIds) && linkedQuizIds.length > 0) {
      await Quiz.updateMany(
        { _id: { $in: linkedQuizIds } },
        { $set: { folderId: updatedFolder._id } }
      );
    }

    res.json({
      success: true,
      message: "Folder updated successfully",
      folder: updatedFolder
    });
  } catch (error) {
    console.error("Error updating QuizFolder:", error);
    res.status(500).json({ success: false, message: "Failed to update folder", error: error.message });
  }
};

/**
 * DELETE /api/quizzes/folders/:id
 * Deletes a Quiz Folder and safely handles child items (moves them up to parent folder).
 */
exports.deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid folder ID" });
    }

    const targetFolder = await QuizFolder.findById(id);
    if (!targetFolder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    const newParentId = targetFolder.parentId || null;

    // 1. Move all direct subfolders to the deleted folder's parent
    await QuizFolder.updateMany(
      { parentId: targetFolder._id },
      { $set: { parentId: newParentId } }
    );

    // 2. Remove deleted folder ID from all descendants' ancestors arrays (handles arbitrarily deep trees)
    await QuizFolder.updateMany(
      { ancestors: targetFolder._id },
      { $pull: { ancestors: targetFolder._id } }
    );

    // 3. Move all child quizzes to the deleted folder's parent
    await Quiz.updateMany(
      { folderId: targetFolder._id },
      { $set: { folderId: newParentId } }
    );

    await QuizFolder.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Folder deleted successfully. Contents moved to upper level."
    });
  } catch (error) {
    console.error("Error deleting QuizFolder:", error);
    res.status(500).json({ success: false, message: "Failed to delete folder", error: error.message });
  }
};

/**
 * POST /api/quizzes/folders/:id/clone
 * Deep clones a folder, its subfolders recursively, and all quizzes inside.
 */
exports.cloneFolder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid folder ID" });
    }

    const sourceFolder = await QuizFolder.findById(id).lean();
    if (!sourceFolder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    // Recursive helper to clone folder and its sub-hierarchy
    const cloneDirectoryRecursive = async (srcFolder, newParentId, newAncestors) => {
      const cloned = await QuizFolder.create({
        title: `${srcFolder.title} (Copy)`,
        description: srcFolder.description || "",
        thumbnail: srcFolder.thumbnail || "",
        parentId: newParentId,
        ancestors: newAncestors,
        sortOrder: (srcFolder.sortOrder || 0) + 1,
        isPublished: false, // Default to draft for safety
        price: srcFolder.price || 0,
        mrp: srcFolder.mrp || 0,
        isFeatured: false,
        validityType: srcFolder.validityType || "lifetime",
        validityDays: srcFolder.validityDays || 365,
        validityDate: srcFolder.validityDate || null,
        detailedDescription: srcFolder.detailedDescription || "",
        instructions: srcFolder.instructions || "",
        tags: srcFolder.tags || [],
        examSeriesId: srcFolder.examSeriesId || null,
        createdBy: req.user?._id || null
      });

      // Clone quizzes inside this folder with independent sections and questions
      const childQuizzes = await Quiz.find({ folderId: srcFolder._id, isDeleted: { $ne: true } });
      for (const q of childQuizzes) {
        const clonedQuiz = await quizService.duplicateQuiz(q._id, req.user?._id);
        clonedQuiz.folderId = cloned._id;
        clonedQuiz.published = false;
        clonedQuiz.status = "Draft";
        await clonedQuiz.save();
      }

      // Clone subfolders recursively
      const childFolders = await QuizFolder.find({ parentId: srcFolder._id }).lean();
      for (const child of childFolders) {
        await cloneDirectoryRecursive(child, cloned._id, [...newAncestors, cloned._id]);
      }

      return cloned;
    };

    const clonedRoot = await cloneDirectoryRecursive(
      sourceFolder,
      sourceFolder.parentId || null,
      sourceFolder.ancestors || []
    );

    res.json({
      success: true,
      message: `Folder "${sourceFolder.title}" and its contents duplicated successfully`,
      folder: clonedRoot
    });
  } catch (error) {
    console.error("Error cloning folder tree:", error);
    res.status(500).json({ success: false, message: "Failed to clone folder hierarchy", error: error.message });
  }
};

/**
 * GET /api/quizzes/folders/all
 * Returns all folders for picker modal / hierarchy selection
 */
exports.getAllFolders = async (req, res) => {
  try {
    const folders = await QuizFolder.find({}).sort({ sortOrder: 1, title: 1 }).lean();
    res.json({ success: true, folders });
  } catch (error) {
    console.error("Error fetching all folders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch all folders", error: error.message });
  }
};

/**
 * PATCH /api/quizzes/reshuffle
 * AppX Bulk Reshuffle: updates the sortOrder numerical rank for multiple folders and quizzes atomically.
 */
exports.reshuffleItems = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Items array is required" });
    }

    const folderOps = [];
    const quizOps = [];

    items.forEach(item => {
      if (!item.id || !mongoose.Types.ObjectId.isValid(item.id)) return;
      const order = Number(item.sortOrder);
      if (isNaN(order)) return;

      if (item.type === "folder") {
        folderOps.push({
          updateOne: {
            filter: { _id: item.id },
            update: { $set: { sortOrder: order } }
          }
        });
      } else {
        quizOps.push({
          updateOne: {
            filter: { _id: item.id },
            update: { $set: { sortOrder: order } }
          }
        });
      }
    });

    if (folderOps.length > 0) await QuizFolder.bulkWrite(folderOps);
    if (quizOps.length > 0) await Quiz.bulkWrite(quizOps);

    res.json({
      success: true,
      message: `Successfully reshuffled ${folderOps.length + quizOps.length} items`
    });
  } catch (error) {
    console.error("Error reshuffling items:", error);
    res.status(500).json({ success: false, message: "Failed to reshuffle items", error: error.message });
  }
};

/**
 * PATCH /api/quizzes/move
 * Moves quizzes or folders into a new destination folder.
 */
exports.moveItems = async (req, res) => {
  try {
    const { itemIds, quizIds, itemType = "quiz", destinationFolderId = null } = req.body;
    const ids = itemIds || quizIds || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "itemIds array is required" });
    }

    let targetParent = null;
    let targetAncestors = [];

    if (destinationFolderId && destinationFolderId !== "null" && destinationFolderId !== "root") {
      if (!mongoose.Types.ObjectId.isValid(destinationFolderId)) {
        return res.status(400).json({ success: false, message: "Invalid destination folder ID" });
      }

      targetParent = await QuizFolder.findById(destinationFolderId);
      if (!targetParent) {
        return res.status(404).json({ success: false, message: "Destination folder not found" });
      }
      targetAncestors = [...(targetParent.ancestors || []), targetParent._id];
    }

    // Always update matching quizzes
    await Quiz.updateMany(
      { _id: { $in: ids } },
      { $set: { folderId: targetParent ? targetParent._id : null } }
    );

    // Also update any matching folders
    for (const folderId of ids) {
      if (targetParent && (targetParent._id.toString() === folderId.toString() || targetParent.ancestors.some(a => a.toString() === folderId.toString()))) {
        return res.status(400).json({
          success: false,
          message: "Cannot move a folder into itself or one of its subfolders."
        });
      }

      const folderToMove = await QuizFolder.findById(folderId);
      if (folderToMove) {
        folderToMove.parentId = targetParent ? targetParent._id : null;
        folderToMove.ancestors = targetAncestors;
        await folderToMove.save();

        const descendants = await QuizFolder.find({ ancestors: folderToMove._id });
        for (const desc of descendants) {
          const indexInAncestors = desc.ancestors.findIndex(a => a.toString() === folderToMove._id.toString());
          const subAncestors = indexInAncestors >= 0 ? desc.ancestors.slice(indexInAncestors) : [folderToMove._id];
          desc.ancestors = [...targetAncestors, ...subAncestors];
          await desc.save();
        }
      }
    }

    res.json({
      success: true,
      message: `Moved ${ids.length} item(s) successfully`
    });
  } catch (error) {
    console.error("Error moving items:", error);
    res.status(500).json({ success: false, message: "Failed to move items", error: error.message });
  }
};

/**
 * PATCH /api/quizzes/bulk-status
 * Updates status (Published / Draft) for multiple quizzes in one request.
 */
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { itemIds, quizIds, published } = req.body;
    const ids = itemIds || quizIds || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "IDs array is required" });
    }

    const isPub = Boolean(published);
    await Quiz.updateMany(
      { _id: { $in: ids } },
      { $set: { published: isPub, status: isPub ? "Published" : "Draft" } }
    );

    await QuizFolder.updateMany(
      { _id: { $in: ids } },
      { $set: { isPublished: isPub } }
    );

    res.json({
      success: true,
      message: `Updated status for ${ids.length} item(s)`
    });
  } catch (error) {
    console.error("Error in bulkUpdateStatus:", error);
    res.status(500).json({ success: false, message: "Failed to update bulk status", error: error.message });
  }
};

/**
 * POST /api/quizzes/bulk-delete
 * Moves multiple quizzes to recycle bin.
 */
exports.bulkDeleteQuizzes = async (req, res) => {
  try {
    const { itemIds, quizIds } = req.body;
    const ids = itemIds || quizIds || [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "IDs array is required" });
    }

    await Quiz.updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    // Also handle any folders in the selection
    const foldersToDelete = await QuizFolder.find({ _id: { $in: ids } });
    for (const folder of foldersToDelete) {
      const newParentId = folder.parentId || null;
      await QuizFolder.updateMany(
        { parentId: folder._id },
        { $set: { parentId: newParentId } }
      );
      await QuizFolder.updateMany(
        { ancestors: folder._id },
        { $pull: { ancestors: folder._id } }
      );
      await Quiz.updateMany(
        { folderId: folder._id },
        { $set: { folderId: newParentId } }
      );
      await QuizFolder.findByIdAndDelete(folder._id);
    }

    res.json({
      success: true,
      message: `Deleted ${ids.length} item(s)`
    });
  } catch (error) {
    console.error("Error in bulkDeleteQuizzes:", error);
    res.status(500).json({ success: false, message: "Failed to delete quizzes", error: error.message });
  }
};

/**
 * GET /api/quizzes/recycle-bin
 * Returns all deleted quizzes with original folder information
 */
exports.getRecycleBin = async (req, res) => {
  try {
    const deletedQuizzes = await Quiz.find({ isDeleted: true })
      .populate("folderId", "_id title")
      .select("title subject duration questions deletedAt folderId isPaid price")
      .sort({ deletedAt: -1 })
      .lean();

    res.json({
      success: true,
      quizzes: deletedQuizzes.map(q => ({
        ...q,
        questionCount: Array.isArray(q.questions) ? q.questions.length : 0,
        originalFolderName: q.folderId?.title || "Home"
      }))
    });
  } catch (error) {
    console.error("Error fetching recycle bin:", error);
    res.status(500).json({ success: false, message: "Failed to fetch recycle bin items", error: error.message });
  }
};

/**
 * GET /api/quizzes/folders/:id/analytics
 * Returns learner performance, attempts, and accuracy stats for quizzes in this folder
 */
exports.getFolderAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid folder ID" });
    }

    const folder = await QuizFolder.findById(id).lean();
    if (!folder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    // Find all quizzes in this folder or subfolders
    const descendantFolders = await QuizFolder.find({ ancestors: folder._id }).select("_id").lean();
    const allFolderIds = [folder._id, ...descendantFolders.map(d => d._id)];

    const quizzes = await Quiz.find({ folderId: { $in: allFolderIds }, isDeleted: { $ne: true } })
      .select("_id title questions sections duration marksPerQuestion")
      .lean();

    const quizIds = quizzes.map(q => q._id);

    if (quizIds.length === 0) {
      return res.json({
        success: true,
        folder: {
          _id: folder._id,
          title: folder.title,
          price: folder.price || 0
        },
        stats: {
          totalQuizzes: 0,
          totalAttempts: 0,
          uniqueStudents: 0,
          avgScorePercent: 0,
          accuracyPercent: 0
        },
        quizzes: []
      });
    }

    // High-performance MongoDB aggregations — zero documents loaded into Node.js heap memory
    const [overallStats, perQuizStats] = await Promise.all([
      Result.aggregate([
        { $match: { quizId: { $in: quizIds } } },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" },
            sumScore: { $sum: "$score" },
            sumTotal: { $sum: "$total" },
            sumCorrect: { $sum: "$correct" },
            sumIncorrect: { $sum: "$incorrect" }
          }
        }
      ]),
      Result.aggregate([
        { $match: { quizId: { $in: quizIds } } },
        {
          $group: {
            _id: "$quizId",
            attempts: { $sum: 1 },
            sumScore: { $sum: "$score" },
            sumTotal: { $sum: "$total" }
          }
        }
      ])
    ]);

    const overall = overallStats[0] || {
      totalAttempts: 0,
      uniqueUsers: [],
      sumScore: 0,
      sumTotal: 0,
      sumCorrect: 0,
      sumIncorrect: 0
    };

    const totalPossible = overall.sumTotal || 0;
    const totalScore = overall.sumScore || 0;
    const totalQuestionsAnswered = (overall.sumCorrect || 0) + (overall.sumIncorrect || 0);

    const avgScorePercent = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    const accuracyPercent = totalQuestionsAnswered > 0 ? Math.round(((overall.sumCorrect || 0) / totalQuestionsAnswered) * 100) : 0;

    const perQuizMap = new Map(perQuizStats.map(item => [item._id.toString(), item]));

    // Per quiz breakdown
    const quizStats = quizzes.map(q => {
      const qAgg = perQuizMap.get(q._id.toString()) || { attempts: 0, sumScore: 0, sumTotal: 0 };
      const qAvg = qAgg.sumTotal > 0 ? Math.round((qAgg.sumScore / qAgg.sumTotal) * 100) : 0;
      let qCount = 0;
      if (Array.isArray(q.questions) && q.questions.length > 0) {
        qCount = q.questions.length;
      } else if (Array.isArray(q.sections)) {
        q.sections.forEach(sec => {
          if (Array.isArray(sec.questions)) qCount += sec.questions.length;
        });
      }
      return {
        _id: q._id,
        title: q.title,
        attempts: qAgg.attempts,
        avgScore: qAvg,
        questionCount: qCount
      };
    });

    res.json({
      success: true,
      folder: {
        _id: folder._id,
        title: folder.title,
        price: folder.price || 0
      },
      stats: {
        totalQuizzes: quizzes.length,
        totalAttempts: overall.totalAttempts,
        uniqueStudents: overall.uniqueUsers.length,
        avgScorePercent,
        accuracyPercent
      },
      quizzes: quizStats
    });
  } catch (error) {
    console.error("Error fetching folder analytics:", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics", error: error.message });
  }
};

/**
 * GET /api/quizzes/folders/:id/export
 * Exports complete course package (folder metadata + nested subfolders + quiz definitions)
 */
exports.exportFolderPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid folder ID" });
    }

    const folder = await QuizFolder.findById(id).lean();
    if (!folder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    const subfolders = await QuizFolder.find({ ancestors: folder._id }).lean();
    const allFolderIds = [folder._id, ...subfolders.map(f => f._id)];

    const quizzes = await Quiz.find({ folderId: { $in: allFolderIds }, isDeleted: { $ne: true } })
      .populate({
        path: "sections.sectionId",
        populate: [
          { path: "questions" },
          { path: "subsections.easy" },
          { path: "subsections.medium" },
          { path: "subsections.hard" }
        ]
      })
      .lean();

    const packageData = {
      exportVersion: "1.0",
      exportedAt: new Date().toISOString(),
      course: folder,
      subfolders,
      quizzes
    };

    res.setHeader("Content-Disposition", `attachment; filename="${folder.title.replace(/[^a-z0-9]/gi, "_")}_export.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(packageData);
  } catch (error) {
    console.error("Error exporting folder package:", error);
    res.status(500).json({ success: false, message: "Failed to export package", error: error.message });
  }
};
