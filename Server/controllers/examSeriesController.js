const ExamSeries = require("../models/ExamSeries");
const Quiz = require("../models/Quiz");
const { notifyAllStudents } = require("../services/notificationService");

// Create Series
exports.createSeries = async (req, res) => {
  try {
    const { title, description, category, thumbnail, icon } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required." });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // Check if slug exists
    const existing = await ExamSeries.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "An Exam Series with a similar title already exists." });
    }

    const series = await ExamSeries.create({
      title,
      slug,
      description,
      category,
      thumbnail,
      icon,
      createdBy: req.user?._id,
      isPublished: true, // Default to true for ease of use
    });

    // TODO: broadcast to all students since User has no subject/category preference field yet - revisit if per-student targeting is added later.
    notifyAllStudents({
      type: "NEW_EXAM_SERIES",
      title: "New exam series available",
      message: `"${series.title}" is now live.`,
      link: `/exam-series/${series._id}`,
      relatedId: series._id
    });

    res.status(201).json(series);
  } catch (error) {
    console.error("Create Series Error:", error);
    res.status(500).json({ message: "Failed to create Exam Series." });
  }
};

// Get all Series
exports.getSeries = async (req, res) => {
  try {
    const query = {};
    // If not admin/superadmin, return only published series
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
      query.isPublished = true;
    }
    const series = await ExamSeries.find(query).sort({ createdAt: -1 });
    res.json(series);
  } catch (error) {
    console.error("Get Series Error:", error);
    res.status(500).json({ message: "Failed to retrieve Exam Series." });
  }
};

// Get ALL series with their published quizzes in one shot (for student dashboard)
exports.getAllSeriesWithQuizzes = async (req, res) => {
  try {
    const series = await ExamSeries.find({ isPublished: true }).sort({ createdAt: -1 });
    const seriesIds = series.map(s => s._id);

    // Fetch all published quizzes belonging to any of these series
    const allQuizzes = await Quiz.find({
      examSeriesId: { $in: seriesIds },
      isDeleted: { $ne: true },
      $or: [{ published: true }, { status: "Published" }]
    }).select("_id title subject examSeriesId quizType updatedAt createdAt").sort({ createdAt: -1 });

    // Group quizzes by examSeriesId
    const quizMap = {};
    allQuizzes.forEach(q => {
      const sid = String(q.examSeriesId);
      if (!quizMap[sid]) quizMap[sid] = [];
      quizMap[sid].push(q);
    });

    const result = series.map(s => ({
      ...s.toObject(),
      quizzes: quizMap[String(s._id)] || [],
      paperCount: (quizMap[String(s._id)] || []).length,
    }));

    res.json(result);
  } catch (error) {
    console.error("GetAllSeriesWithQuizzes Error:", error);
    res.status(500).json({ message: "Failed to retrieve exam series with quizzes." });
  }
};


exports.getSeriesById = async (req, res) => {
  try {
    console.log("[DEBUG] getSeriesById called with headers:", req.headers.authorization, "and user:", req.user ? req.user._id : "none");
    const series = await ExamSeries.findById(req.params.id);
    if (!series) return res.status(404).json({ message: "Exam Series not found." });

    // Fetch children quizzes belonging to this series
    const quizzes = await Quiz.find({ 
      examSeriesId: series._id, 
      isDeleted: { $ne: true },
      $or: [{ published: true }, { status: "Published" }]
    }).sort({ createdAt: -1 });

    // Attach isPurchased flag if user is authenticated
    let purchasedExamIds = [];
    if (req.user) {
      const User = require("../models/User");
      const user = await User.findById(req.user._id).select("purchasedExams");
      purchasedExamIds = (user?.purchasedExams || []).map(id => id.toString());
    }

    const quizzesWithPurchaseStatus = quizzes.map(q => {
      const qObj = q.toObject();
      qObj.isPurchased = req.user && (req.user.role === "admin" || req.user.role === "superadmin" || purchasedExamIds.includes(qObj._id.toString()));
      return qObj;
    });

    res.json({ series, quizzes: quizzesWithPurchaseStatus });
  } catch (error) {
    console.error("Get Series By ID Error:", error);
    res.status(500).json({ message: "Failed to retrieve Exam Series details." });
  }
};

// Update Series
exports.updateSeries = async (req, res) => {
  try {
    const { title, description, category, thumbnail, icon, isPublished } = req.body;
    const series = await ExamSeries.findById(req.params.id);
    if (!series) return res.status(404).json({ message: "Exam Series not found." });

    const wasPublished = series.isPublished;

    if (title) {
      series.title = title;
      series.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    if (description !== undefined) series.description = description;
    if (category !== undefined) series.category = category;
    if (thumbnail !== undefined) series.thumbnail = thumbnail;
    if (icon !== undefined) series.icon = icon;
    if (isPublished !== undefined) series.isPublished = isPublished;

    await series.save();

    // Trigger notification only if transitioning from unpublished to published
    if (!wasPublished && series.isPublished) {
      // TODO: broadcast to all students since User has no subject/category preference field yet - revisit if per-student targeting is added later.
      notifyAllStudents({
        type: "NEW_EXAM_SERIES",
        title: "New exam series available",
        message: `"${series.title}" is now live.`,
        link: `/exam-series/${series._id}`,
        relatedId: series._id
      });
    }

    res.json(series);
  } catch (error) {
    console.error("Update Series Error:", error);
    res.status(500).json({ message: "Failed to update Exam Series." });
  }
};

// Delete Series
exports.deleteSeries = async (req, res) => {
  try {
    const series = await ExamSeries.findById(req.params.id);
    if (!series) return res.status(404).json({ message: "Exam Series not found." });

    // Re-assign child quizzes to "null" or ungrouped
    await Quiz.updateMany({ examSeriesId: series._id }, { $set: { examSeriesId: null } });

    await ExamSeries.findByIdAndDelete(req.params.id);

    // Create Audit Log
    const AuditLog = require("../models/AuditLog");
    await AuditLog.create({
      action: "Deleted Exam Category",
      performedBy: req.user?.email || "Admin",
      details: `Deleted Exam Series: ${series.title}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      module: "ExamSeries",
    });

    res.json({ message: "Exam Series deleted successfully." });
  } catch (error) {
    console.error("Delete Series Error:", error);
    res.status(500).json({ message: "Failed to delete Exam Series." });
  }
};

