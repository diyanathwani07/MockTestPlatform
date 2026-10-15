const LiveExamination = require("../models/LiveExamination");
const LiveExamAttempt = require("../models/LiveExamAttempt");
const Quiz = require("../models/Quiz");
const logAction = require("../utils/logger");

/**
 * Validates scheduling times and duration rules.
 */
function validateExamSchedule({ scheduledStartTime, scheduledEndTime, duration, entryWindowMinutes, resultReleaseMode, resultReleaseDate }) {
  const start = new Date(scheduledStartTime);
  const end = new Date(scheduledEndTime);

  if (isNaN(start.getTime())) {
    return "Invalid scheduled start time format.";
  }
  if (isNaN(end.getTime())) {
    return "Invalid scheduled end time format.";
  }
  if (end <= start) {
    return "Scheduled end time must be later than the scheduled start time.";
  }

  const windowMinutes = Math.floor((end.getTime() - start.getTime()) / (60 * 1000));
  const dur = Number(duration);

  if (isNaN(dur) || dur <= 0) {
    return "Exam duration must be a positive number of minutes.";
  }

  if (dur > windowMinutes) {
    return `Exam duration (${dur} mins) cannot exceed the total scheduled window (${windowMinutes} mins) between start and end times.`;
  }

  if (entryWindowMinutes !== undefined && entryWindowMinutes !== null) {
    const entryMin = Number(entryWindowMinutes);
    if (isNaN(entryMin) || entryMin < 0) {
      return "Entry window must be 0 or more minutes.";
    }
  }

  if (resultReleaseMode === "scheduled") {
    if (!resultReleaseDate) {
      return "Result release date is required when release mode is set to 'scheduled'.";
    }
    const relDate = new Date(resultReleaseDate);
    if (isNaN(relDate.getTime())) {
      return "Invalid result release date format.";
    }
    if (relDate < end) {
      return "Result release date cannot be before the scheduled exam end time.";
    }
  }

  return null;
}

/**
 * CREATE a new Live Examination
 * POST /api/live-exams
 */
const createLiveExam = async (req, res) => {
  try {
    const {
      quizId,
      title,
      instructions,
      scheduledStartTime,
      scheduledEndTime,
      duration,
      entryWindowMinutes = 15,
      allowLateEntry = true,
      autoSubmitOnDeadline = true,
      webcamRule = "disabled",
      resultReleaseMode = "manual",
      resultReleaseDate = null,
    } = req.body;

    if (!quizId) {
      return res.status(400).json({ message: "Please select a valid quiz blueprint." });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Live examination title is required." });
    }

    // Validate schedule & duration rules
    const scheduleError = validateExamSchedule({
      scheduledStartTime,
      scheduledEndTime,
      duration,
      entryWindowMinutes,
      resultReleaseMode,
      resultReleaseDate,
    });
    if (scheduleError) {
      return res.status(400).json({ message: scheduleError });
    }

    if (!["disabled", "optional", "mandatory"].includes(webcamRule)) {
      return res.status(400).json({ message: "Invalid webcamRule. Must be 'disabled', 'optional', or 'mandatory'." });
    }
    if (!["manual", "immediate", "scheduled"].includes(resultReleaseMode)) {
      return res.status(400).json({ message: "Invalid resultReleaseMode. Must be 'manual', 'immediate', or 'scheduled'." });
    }

    // Verify Quiz blueprint exists and is active
    const quiz = await Quiz.findOne({ _id: quizId, isDeleted: false });
    if (!quiz) {
      return res.status(404).json({ message: "Selected quiz blueprint not found or has been deleted." });
    }

    // Generate unique unguessable share slug and token
    const { shareSlug, shareToken } = await LiveExamination.generateUniqueSlugAndToken(title);

    const liveExam = await LiveExamination.create({
      quizId,
      title: title.trim(),
      instructions: instructions ? instructions.trim() : "",
      scheduledStartTime: new Date(scheduledStartTime),
      scheduledEndTime: new Date(scheduledEndTime),
      duration: Number(duration),
      entryWindowMinutes: Number(entryWindowMinutes),
      allowLateEntry: Boolean(allowLateEntry),
      autoSubmitOnDeadline: Boolean(autoSubmitOnDeadline),
      webcamRule,
      resultReleaseMode,
      resultReleaseDate: resultReleaseDate ? new Date(resultReleaseDate) : null,
      shareSlug,
      shareToken,
      status: "scheduled",
      createdBy: req.user._id,
    });

    await logAction(
      "CREATE_LIVE_EXAM",
      req.user?.fullName || "Admin",
      `Created Live Examination: "${liveExam.title}" (ID: ${liveExam._id})`,
      "LiveExam",
      req.ip
    );

    res.status(201).json(liveExam);
  } catch (error) {
    console.error("Create Live Exam Error:", error);
    res.status(500).json({ message: "Failed to create live examination: " + error.message });
  }
};

/**
 * GET all Live Examinations (with filters, pagination, and attempt aggregates)
 * GET /api/live-exams
 */
const getLiveExams = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = { isDeleted: false };

    if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { shareSlug: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [exams, total] = await Promise.all([
      LiveExamination.find(query)
        .populate("quizId", "title subject examName duration passPercentage")
        .populate("createdBy", "fullName email")
        .sort({ scheduledStartTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      LiveExamination.countDocuments(query),
    ]);

    // Aggregate real-time attempt counts for each live exam
    const examIds = exams.map((e) => e._id);
    const attemptStats = await LiveExamAttempt.aggregate([
      { $match: { liveExamId: { $in: examIds } } },
      {
        $group: {
          _id: "$liveExamId",
          total: { $sum: 1 },
          inLobby: { $sum: { $cond: [{ $eq: ["$status", "in_lobby"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          submitted: {
            $sum: {
              $cond: [{ $in: ["$status", ["submitted", "auto_submitted"]] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statsMap = {};
    attemptStats.forEach((st) => {
      statsMap[st._id.toString()] = st;
    });

    const now = new Date();
    const enrichedExams = exams.map((exam) => {
      // Refresh status dynamically if scheduled/live times have elapsed
      let computedStatus = exam.status;
      if (exam.status !== "cancelled" && exam.status !== "completed") {
        if (now >= new Date(exam.scheduledEndTime)) {
          computedStatus = "completed";
        } else if (now >= new Date(exam.scheduledStartTime)) {
          computedStatus = "live";
        } else {
          const lobbyStart = new Date(new Date(exam.scheduledStartTime).getTime() - (exam.entryWindowMinutes || 15) * 60 * 1000);
          if (now >= lobbyStart) {
            computedStatus = "lobby";
          }
        }
      }

      const stats = statsMap[exam._id.toString()] || { total: 0, inLobby: 0, inProgress: 0, submitted: 0 };
      return {
        ...exam,
        status: computedStatus,
        stats,
      };
    });

    res.json({
      exams: enrichedExams,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Get Live Exams Error:", error);
    res.status(500).json({ message: "Failed to fetch live examinations: " + error.message });
  }
};

/**
 * GET single Live Examination details
 * GET /api/live-exams/:id
 */
const getLiveExamById = async (req, res) => {
  try {
    const exam = await LiveExamination.findOne({ _id: req.params.id, isDeleted: false })
      .populate("quizId", "title subject examName duration passPercentage questions sections")
      .populate("createdBy", "fullName email")
      .lean();

    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    // Calculate total questions count safely
    let totalQuestionsCount = 0;
    if (exam.quizId) {
      if (Array.isArray(exam.quizId.questions) && exam.quizId.questions.length > 0) {
        totalQuestionsCount = exam.quizId.questions.length;
      } else if (Array.isArray(exam.quizId.sections)) {
        exam.quizId.sections.forEach((sec) => {
          if (Array.isArray(sec.questions)) totalQuestionsCount += sec.questions.length;
        });
      }
    }

    // Aggregate attempts
    const attempts = await LiveExamAttempt.find({ liveExamId: exam._id })
      .select("status webcamStatus connectionStatus startedAt submittedAt")
      .lean();

    const stats = {
      totalRegistered: attempts.length,
      inLobby: attempts.filter((a) => a.status === "in_lobby").length,
      inProgress: attempts.filter((a) => a.status === "in_progress").length,
      submitted: attempts.filter((a) => a.status === "submitted").length,
      autoSubmitted: attempts.filter((a) => a.status === "auto_submitted").length,
      webcamGranted: attempts.filter((a) => a.webcamStatus === "granted").length,
      webcamDenied: attempts.filter((a) => a.webcamStatus === "denied").length,
    };

    res.json({
      ...exam,
      totalQuestionsCount,
      stats,
    });
  } catch (error) {
    console.error("Get Live Exam Detail Error:", error);
    res.status(500).json({ message: "Failed to fetch examination details." });
  }
};

/**
 * UPDATE Live Examination configuration
 * PUT /api/live-exams/:id
 */
const updateLiveExam = async (req, res) => {
  try {
    const exam = await LiveExamination.findOne({ _id: req.params.id, isDeleted: false });
    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    if (exam.status === "completed" || exam.status === "cancelled") {
      return res.status(400).json({ message: `Cannot modify an examination that is already ${exam.status}.` });
    }

    const {
      title,
      instructions,
      scheduledStartTime,
      scheduledEndTime,
      duration,
      entryWindowMinutes,
      allowLateEntry,
      autoSubmitOnDeadline,
      webcamRule,
      resultReleaseMode,
      resultReleaseDate,
    } = req.body;

    const newStart = scheduledStartTime || exam.scheduledStartTime;
    const newEnd = scheduledEndTime || exam.scheduledEndTime;
    const newDuration = duration !== undefined ? duration : exam.duration;
    const newEntryMin = entryWindowMinutes !== undefined ? entryWindowMinutes : exam.entryWindowMinutes;
    const newReleaseMode = resultReleaseMode || exam.resultReleaseMode;
    const newReleaseDate = resultReleaseDate !== undefined ? resultReleaseDate : exam.resultReleaseDate;

    // Validate schedule
    const scheduleError = validateExamSchedule({
      scheduledStartTime: newStart,
      scheduledEndTime: newEnd,
      duration: newDuration,
      entryWindowMinutes: newEntryMin,
      resultReleaseMode: newReleaseMode,
      resultReleaseDate: newReleaseDate,
    });
    if (scheduleError) {
      return res.status(400).json({ message: scheduleError });
    }

    if (title && title.trim()) exam.title = title.trim();
    if (instructions !== undefined) exam.instructions = instructions ? instructions.trim() : "";
    exam.scheduledStartTime = new Date(newStart);
    exam.scheduledEndTime = new Date(newEnd);
    exam.duration = Number(newDuration);
    if (newEntryMin !== undefined) exam.entryWindowMinutes = Number(newEntryMin);
    if (allowLateEntry !== undefined) exam.allowLateEntry = Boolean(allowLateEntry);
    if (autoSubmitOnDeadline !== undefined) exam.autoSubmitOnDeadline = Boolean(autoSubmitOnDeadline);
    if (webcamRule) exam.webcamRule = webcamRule;
    if (newReleaseMode) exam.resultReleaseMode = newReleaseMode;
    exam.resultReleaseDate = newReleaseDate ? new Date(newReleaseDate) : null;

    await exam.save();

    await logAction(
      "UPDATE_LIVE_EXAM",
      req.user?.fullName || "Admin",
      `Updated Live Examination: "${exam.title}" (ID: ${exam._id})`,
      "LiveExam",
      req.ip
    );

    res.json(exam);
  } catch (error) {
    console.error("Update Live Exam Error:", error);
    res.status(500).json({ message: "Failed to update live examination: " + error.message });
  }
};

/**
 * CANCEL / SOFT-DELETE Live Examination
 * DELETE /api/live-exams/:id
 */
const deleteLiveExam = async (req, res) => {
  try {
    const exam = await LiveExamination.findOne({ _id: req.params.id, isDeleted: false });
    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    exam.isDeleted = true;
    exam.deletedAt = new Date();
    exam.status = "cancelled";
    await exam.save();

    // If there were active attempts, update them with cancellation notice
    await LiveExamAttempt.updateMany(
      { liveExamId: exam._id, status: { $in: ["registered", "in_lobby", "in_progress"] } },
      {
        $set: { status: "disqualified" },
        $push: {
          timeline: {
            event: "ADMIN_CANCEL_EXAM",
            timestamp: new Date(),
            metadata: { cancelledBy: req.user?.fullName || "Admin" },
          },
        },
      }
    );

    await logAction(
      "CANCEL_LIVE_EXAM",
      req.user?.fullName || "Admin",
      `Cancelled Live Examination: "${exam.title}" (ID: ${exam._id})`,
      "LiveExam",
      req.ip
    );

    res.json({ message: "Live examination cancelled successfully." });
  } catch (error) {
    console.error("Delete Live Exam Error:", error);
    res.status(500).json({ message: "Failed to delete live examination: " + error.message });
  }
};

/**
 * END Live Examination immediately (Protected Admin Action)
 * POST /api/live-exams/:id/end
 */
const endLiveExam = async (req, res) => {
  try {
    const exam = await LiveExamination.findOne({ _id: req.params.id, isDeleted: false });
    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    if (exam.status === "completed") {
      return res.status(400).json({ message: "This examination has already concluded." });
    }

    const now = new Date();
    exam.status = "completed";
    exam.endedAt = now;
    exam.endedBy = req.user._id;
    await exam.save();

    // Safely auto-close any in-progress or lobby attempts
    const activeAttempts = await LiveExamAttempt.find({
      liveExamId: exam._id,
      status: { $in: ["in_progress", "in_lobby", "ready", "registered"] },
    });

    for (const attempt of activeAttempts) {
      const isProgress = attempt.status === "in_progress";
      attempt.status = isProgress ? "auto_submitted" : "disqualified";
      attempt.submittedAt = now;
      attempt.timeline.push({
        event: "ADMIN_FORCE_END",
        timestamp: now,
        metadata: {
          adminId: req.user._id,
          adminName: req.user.fullName,
          note: isProgress
            ? "Attempt automatically closed upon admin exam termination."
            : "Attempt closed before start due to early exam termination.",
        },
      });
      await attempt.save();
    }

    await logAction(
      "END_LIVE_EXAM",
      req.user?.fullName || "Admin",
      `Admin manually ended Live Examination: "${exam.title}" (ID: ${exam._id}). ${activeAttempts.length} active attempt(s) closed.`,
      "LiveExam",
      req.ip
    );

    res.json({
      message: "Examination ended successfully. All active attempts have been safely closed.",
      closedAttemptsCount: activeAttempts.length,
      exam,
    });
  } catch (error) {
    console.error("End Live Exam Error:", error);
    res.status(500).json({ message: "Failed to end live examination: " + error.message });
  }
};

/**
 * GET Attendance & Attempt Records for a Live Exam
 * GET /api/live-exams/:id/attendance
 */
const getLiveExamAttendance = async (req, res) => {
  try {
    const exam = await LiveExamination.findOne({ _id: req.params.id, isDeleted: false });
    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    const attempts = await LiveExamAttempt.find({ liveExamId: exam._id })
      .populate("studentId", "fullName email phone avatar")
      .populate("resultId", "score total percentage passPercentage timeTaken correct incorrect")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      examTitle: exam.title,
      scheduledStartTime: exam.scheduledStartTime,
      scheduledEndTime: exam.scheduledEndTime,
      status: exam.status,
      attempts,
    });
  } catch (error) {
    console.error("Get Attendance Error:", error);
    res.status(500).json({ message: "Failed to fetch attendance records: " + error.message });
  }
};

/**
 * EXPORT Attendance & Results data (JSON format ready for CSV/Excel export)
 * GET /api/live-exams/:id/export
 */
const exportLiveExamAttendance = async (req, res) => {
  try {
    const exam = await LiveExamination.findOne({ _id: req.params.id, isDeleted: false })
      .populate("quizId", "title examName subject passPercentage")
      .lean();

    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    const attempts = await LiveExamAttempt.find({ liveExamId: exam._id })
      .populate("studentId", "fullName email phone")
      .populate("resultId", "score total percentage timeTaken correct incorrect")
      .sort({ createdAt: -1 })
      .lean();

    const rows = attempts.map((a, idx) => ({
      index: idx + 1,
      studentName: a.studentId?.fullName || "Unknown",
      studentEmail: a.studentId?.email || "Unknown",
      studentPhone: a.studentId?.phone || "N/A",
      attemptStatus: a.status,
      lobbyJoinedAt: a.lobbyJoinedAt ? new Date(a.lobbyJoinedAt).toISOString() : "N/A",
      startedAt: a.startedAt ? new Date(a.startedAt).toISOString() : "N/A",
      submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : "N/A",
      webcamStatus: a.webcamStatus,
      connectionStatus: a.connectionStatus,
      answeredCount: a.answeredCount || 0,
      score: a.resultId?.score !== undefined ? a.resultId.score : "Pending",
      totalMarks: a.resultId?.total !== undefined ? a.resultId.total : "Pending",
      percentage: a.resultId?.percentage !== undefined ? `${a.resultId.percentage}%` : "Pending",
      timeTakenMinutes: a.resultId?.timeTaken ? Math.round(a.resultId.timeTaken / 60) : "N/A",
    }));

    res.json({
      examTitle: exam.title,
      scheduledDate: exam.scheduledStartTime,
      exportTimestamp: new Date().toISOString(),
      recordsCount: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Export Attendance Error:", error);
    res.status(500).json({ message: "Failed to export attendance data." });
  }
};

/**
 * GET Public Live Exam Info by shareSlug or shareToken
 * (Zero Answer Leakage: Does NOT return questions or answers!)
 * GET /api/live-exams/public/:slugOrToken
 */
const getPublicLiveExamInfo = async (req, res) => {
  try {
    const { slugOrToken } = req.params;

    const exam = await LiveExamination.findOne({
      $or: [{ shareSlug: slugOrToken }, { shareToken: slugOrToken }],
      isDeleted: false,
    })
      .populate("quizId", "title examName subject passPercentage marksPerQuestion negativeMarking duration questions sections")
      .lean();

    if (!exam) {
      return res.status(404).json({ message: "Live examination not found or link has expired." });
    }

    // Compute total question count
    let totalQuestionsCount = 0;
    if (exam.quizId) {
      if (Array.isArray(exam.quizId.questions) && exam.quizId.questions.length > 0) {
        totalQuestionsCount = exam.quizId.questions.length;
      } else if (Array.isArray(exam.quizId.sections)) {
        exam.quizId.sections.forEach((s) => {
          if (Array.isArray(s.questions)) totalQuestionsCount += s.questions.length;
        });
      }
    }

    // Dynamic calculated status
    const now = new Date();
    let computedStatus = exam.status;
    if (exam.status !== "cancelled" && exam.status !== "completed") {
      if (now >= new Date(exam.scheduledEndTime)) {
        computedStatus = "completed";
      } else if (now >= new Date(exam.scheduledStartTime)) {
        computedStatus = "live";
      } else {
        const lobbyStart = new Date(new Date(exam.scheduledStartTime).getTime() - (exam.entryWindowMinutes || 15) * 60 * 1000);
        if (now >= lobbyStart) {
          computedStatus = "lobby";
        }
      }
    }

    // Return strictly sanitized public metadata
    res.json({
      _id: exam._id,
      title: exam.title,
      instructions: exam.instructions,
      scheduledStartTime: exam.scheduledStartTime,
      scheduledEndTime: exam.scheduledEndTime,
      duration: exam.duration,
      entryWindowMinutes: exam.entryWindowMinutes,
      allowLateEntry: exam.allowLateEntry,
      webcamRule: exam.webcamRule,
      status: computedStatus,
      shareSlug: exam.shareSlug,
      examName: exam.quizId?.examName || "Competitive Examination",
      subject: exam.quizId?.subject || "General Studies",
      totalQuestions: totalQuestionsCount,
      marksPerQuestion: exam.quizId?.marksPerQuestion || 1,
      negativeMarking: exam.quizId?.negativeMarking || 0,
      passPercentage: exam.quizId?.passPercentage || 50,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error("Get Public Live Exam Info Error:", error);
    res.status(500).json({ message: "Failed to fetch live exam information." });
  }
};

module.exports = {
  createLiveExam,
  getLiveExams,
  getLiveExamById,
  updateLiveExam,
  deleteLiveExam,
  endLiveExam,
  getLiveExamAttendance,
  exportLiveExamAttendance,
  getPublicLiveExamInfo,
};
