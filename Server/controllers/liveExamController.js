const LiveExamination = require("../models/LiveExamination");
const LiveExamAttempt = require("../models/LiveExamAttempt");
const Quiz = require("../models/Quiz");
const Result = require("../models/Result");
const quizService = require("../services/quizService");
const logAction = require("../utils/logger");
const crypto = require("crypto");


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
  let dur = Number(duration);
  // Auto-normalize if provided in seconds (e.g., 600s = 10m, 1800s = 30m, 3600s = 60m)
  if (dur >= 300) {
    dur = Math.round(dur / 60);
  }

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
      duration: Number(duration) >= 300 ? Math.round(Number(duration) / 60) : Number(duration),
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
    const now = new Date();

    // Synchronize stored examination statuses in MongoDB based on elapsed / ongoing times
    await Promise.all([
      LiveExamination.updateMany(
        {
          isDeleted: false,
          status: { $in: ["scheduled", "lobby", "live"] },
          scheduledEndTime: { $lte: now },
        },
        { $set: { status: "completed" } }
      ),
      LiveExamination.updateMany(
        {
          isDeleted: false,
          status: "scheduled",
          scheduledStartTime: { $lte: now },
          scheduledEndTime: { $gt: now },
        },
        { $set: { status: "live" } }
      ),
    ]);

    const query = { isDeleted: false };

    if (status && status !== "all") {
      if (status === "live") {
        query.status = { $in: ["live", "lobby"] };
      } else if (status === "completed") {
        query.status = "completed";
      } else if (status === "scheduled") {
        query.status = "scheduled";
        query.scheduledStartTime = { $gt: now };
      } else if (status === "cancelled") {
        query.status = "cancelled";
      } else {
        query.status = status;
      }
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

    const [exams, total, globalCounts] = await Promise.all([
      LiveExamination.find(query)
        .populate("quizId", "title subject examName duration passPercentage")
        .populate("createdBy", "fullName email")
        .sort({ scheduledStartTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      LiveExamination.countDocuments(query),
      LiveExamination.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            live: { $sum: { $cond: [{ $in: ["$status", ["live", "lobby"]] }, 1, 0] } },
            scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const counts = globalCounts[0] || {
      total: 0,
      live: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
    };
    delete counts._id;

    // Aggregate real-time attempt counts for each live exam
    const examObjectIds = exams
      .map((e) => {
        try {
          return new mongoose.Types.ObjectId(e._id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    const examStringIds = exams.map((e) => e._id.toString());

    const attemptStats = await LiveExamAttempt.aggregate([
      {
        $match: {
          $or: [
            { liveExamId: { $in: examObjectIds } },
            { liveExamId: { $in: examStringIds } },
          ],
        },
      },
      {
        $group: {
          _id: { $toString: "$liveExamId" },
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
      if (st._id) {
        statsMap[st._id.toString()] = st;
      }
    });

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
      counts,
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
    const exam = await LiveExamination.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
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
    const finalDuration = Number(newDuration);
    exam.duration = finalDuration >= 300 ? Math.round(finalDuration / 60) : finalDuration;
    if (newEntryMin !== undefined) exam.entryWindowMinutes = Number(newEntryMin);
    if (allowLateEntry !== undefined) exam.allowLateEntry = Boolean(allowLateEntry);
    if (autoSubmitOnDeadline !== undefined) exam.autoSubmitOnDeadline = Boolean(autoSubmitOnDeadline);
    if (webcamRule) exam.webcamRule = webcamRule;
    if (newReleaseMode) exam.resultReleaseMode = newReleaseMode;
    exam.resultReleaseDate = newReleaseDate ? new Date(newReleaseDate) : null;

    // Recalculate status based on the updated time window
    const now = new Date();
    const scheduledStart = new Date(newStart);
    const scheduledEnd = new Date(newEnd);
    if (now >= scheduledEnd) {
      exam.status = "completed";
    } else if (now >= scheduledStart) {
      exam.status = "live";
    } else {
      exam.status = "scheduled";
    }

    if (exam.isDeleted) {
      exam.isDeleted = false;
      exam.deletedAt = null;
    }

    // If the exam is rescheduled or extended into the future, unblock unsubmitted attempts
    if (scheduledEnd > now) {
      await LiveExamAttempt.updateMany(
        {
          liveExamId: exam._id,
          status: "disqualified",
          resultId: null,
        },
        {
          $set: { status: "registered", startedAt: null, submittedAt: null },
        }
      );
    }

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

/**
 * Strict sanitizer for student exam player (ZERO answer leakage).
 * Removes correctAnswer, correctAnswerObfuscated, explanation, and option isCorrect flags.
 */
function sanitizeQuizForLivePlayer(quiz) {
  if (!quiz) return null;
  const raw = quiz.toObject ? quiz.toObject() : JSON.parse(JSON.stringify(quiz));

  const scrubQuestion = (q) => {
    if (!q) return;
    delete q.correctAnswer;
    delete q.correctAnswerObfuscated;
    delete q.explanation;
    delete q.explanations;
    delete q.solution;
    if (Array.isArray(q.options)) {
      q.options = q.options.map((opt) => {
        if (typeof opt === "object" && opt !== null) {
          const optCopy = { ...opt };
          delete optCopy.isCorrect;
          return optCopy;
        }
        return opt;
      });
    }
  };

  if (Array.isArray(raw.questions)) {
    raw.questions.forEach(scrubQuestion);
  }

  if (Array.isArray(raw.sections)) {
    raw.sections.forEach((sec) => {
      if (Array.isArray(sec.questions)) {
        sec.questions.forEach(scrubQuestion);
      }
      if (sec.subsections) {
        ["easy", "medium", "hard"].forEach((lvl) => {
          if (Array.isArray(sec.subsections[lvl])) {
            sec.subsections[lvl].forEach(scrubQuestion);
          }
        });
      }
    });
  }

  return raw;
}

/**
 * Server-side grading engine: preserves standard and BPSC marking rules.
 */
function gradeQuizAttempt(quiz, userAnswers) {
  let dbQuestions = quiz.questions || [];
  let sectionResults = [];

  if (dbQuestions.length === 0 && quiz.sections && quiz.sections.length > 0) {
    const normalizedSections = quiz.sections.map((sec) => {
      let qs = sec.questions || [];
      if (sec.type === "coding" && sec.subsections) {
        qs = [
          ...(sec.subsections.easy || []),
          ...(sec.subsections.medium || []),
          ...(sec.subsections.hard || []),
        ];
      }
      return qs.map((q) => {
        const qObj = q.toObject ? q.toObject() : JSON.parse(JSON.stringify(q));
        qObj.marksPerQuestion = sec.marksPerQuestion ?? quiz.marksPerQuestion ?? 1;
        qObj.negativeMarking = sec.negativeMarking ?? quiz.negativeMarking ?? 0;
        qObj.sectionId = sec._id;
        qObj.sectionTitle = sec.title;
        return qObj;
      });
    });
    dbQuestions = normalizedSections.flat();
  } else {
    dbQuestions = dbQuestions.map((q) => {
      const qObj = q.toObject ? q.toObject() : JSON.parse(JSON.stringify(q));
      qObj.marksPerQuestion = quiz.marksPerQuestion ?? 1;
      qObj.negativeMarking = quiz.negativeMarking ?? 0;
      return qObj;
    });
  }

  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  const total = dbQuestions.length;

  const difficultyBreakdown = {
    easy: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  };

  const sectionStatsMap = {};
  const isBpsc = quiz.markingPattern === "bpsc";

  dbQuestions.forEach((q, index) => {
    const userAns = Array.isArray(userAnswers) ? userAnswers[index] : userAnswers ? userAnswers[index] : undefined;
    const actualAnswer = q.correctAnswer;
    const isCorrect =
      userAns !== undefined &&
      userAns !== null &&
      String(userAns).trim().toLowerCase() === String(actualAnswer).trim().toLowerCase();
    const isNotAttemptedOption =
      userAns &&
      (String(userAns).trim().toUpperCase() === "E" ||
        String(userAns).trim().toLowerCase().includes("not attempted"));

    const diff = (q.difficulty || "medium").toLowerCase();
    if (difficultyBreakdown[diff]) {
      difficultyBreakdown[diff].total++;
      if (isCorrect) difficultyBreakdown[diff].correct++;
    }

    let qScore = 0;
    if (isBpsc) {
      if (userAns === undefined || userAns === null || userAns === "") {
        incorrect++;
        qScore = -(q.negativeMarking || 0);
        score += qScore;
      } else if (isNotAttemptedOption) {
        unanswered++;
      } else if (isCorrect) {
        correct++;
        qScore = q.marksPerQuestion || 1;
        score += qScore;
      } else {
        incorrect++;
        qScore = -(q.negativeMarking || 0);
        score += qScore;
      }
    } else {
      if (userAns === undefined || userAns === null || userAns === "") {
        unanswered++;
      } else if (isCorrect) {
        correct++;
        qScore = q.marksPerQuestion || 1;
        score += qScore;
      } else {
        incorrect++;
        qScore = -(q.negativeMarking || 0);
        score += qScore;
      }
    }

    if (q.sectionId) {
      const secIdStr = q.sectionId.toString();
      if (!sectionStatsMap[secIdStr]) {
        sectionStatsMap[secIdStr] = {
          sectionId: q.sectionId,
          sectionTitle: q.sectionTitle,
          score: 0,
          correct: 0,
          incorrect: 0,
          total: 0,
        };
      }
      sectionStatsMap[secIdStr].total++;
      if (isCorrect) {
        sectionStatsMap[secIdStr].correct++;
        sectionStatsMap[secIdStr].score += q.marksPerQuestion || 1;
      } else if (isBpsc) {
        if (!isNotAttemptedOption) {
          sectionStatsMap[secIdStr].incorrect++;
          sectionStatsMap[secIdStr].score -= q.negativeMarking || 0;
        }
      } else {
        if (userAns !== undefined && userAns !== null && userAns !== "") {
          sectionStatsMap[secIdStr].incorrect++;
          sectionStatsMap[secIdStr].score -= q.negativeMarking || 0;
        }
      }
    }
  });

  if (Object.keys(sectionStatsMap).length > 0) {
    sectionResults = Object.values(sectionStatsMap);
  }

  const percentage = total > 0 ? Number(((score / total) * 100).toFixed(2)) : 0;

  return {
    score,
    total,
    correct,
    incorrect,
    unanswered,
    percentage,
    sectionResults,
    difficultyBreakdown,
    dbQuestions,
  };
}

/**
 * GET student live exam state by slug or token
 * GET /api/live-exams/student-state/:slugOrToken
 */
const getStudentLiveExamState = async (req, res) => {
  try {
    const { slugOrToken } = req.params;

    const exam = await LiveExamination.findOne({
      $or: [{ shareSlug: slugOrToken }, { shareToken: slugOrToken }],
      isDeleted: false,
    }).populate("quizId", "title examName subject passPercentage marksPerQuestion negativeMarking duration questions sections markingPattern");

    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    const now = new Date();
    const calculatedStatus = exam.getCalculatedStatus ? exam.getCalculatedStatus() : "scheduled";

    // Find student attempt
    const attempt = await LiveExamAttempt.findOne({
      liveExamId: exam._id,
      studentId: req.user._id,
    }).lean();

    const lobbyStartTime = new Date(new Date(exam.scheduledStartTime).getTime() - (exam.entryWindowMinutes || 15) * 60 * 1000);
    const canEnterLobby = now >= lobbyStartTime && now < new Date(exam.scheduledEndTime) && exam.status !== "cancelled";

    let canStart = false;
    let startBlockReason = null;

    if (exam.status === "cancelled" || exam.isDeleted) {
      startBlockReason = "This examination has been cancelled.";
    } else if (now >= new Date(exam.scheduledEndTime)) {
      startBlockReason = "This examination has already ended.";
    } else if (now < new Date(exam.scheduledStartTime)) {
      startBlockReason = "The examination has not started yet. Please wait in the lobby.";
    } else if (!exam.allowLateEntry && now > new Date(new Date(exam.scheduledStartTime).getTime() + (exam.entryWindowMinutes || 15) * 60 * 1000)) {
      startBlockReason = "The allowed entry window has passed. Late entry is not permitted.";
    } else if (attempt && ["submitted", "auto_submitted"].includes(attempt.status)) {
      startBlockReason = "You have already submitted this examination.";
    } else if (
      attempt &&
      attempt.status === "disqualified" &&
      (attempt.resultId || (attempt.submittedAt && new Date(attempt.submittedAt) >= new Date(exam.scheduledStartTime)))
    ) {
      startBlockReason = "You have been disqualified from this examination.";
    } else {
      canStart = true;
    }

    // Question count calculation
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

    res.json({
      examId: exam._id,
      title: exam.title,
      instructions: exam.instructions,
      scheduledStartTime: exam.scheduledStartTime,
      scheduledEndTime: exam.scheduledEndTime,
      duration: exam.duration,
      entryWindowMinutes: exam.entryWindowMinutes,
      allowLateEntry: exam.allowLateEntry,
      webcamRule: exam.webcamRule,
      shareSlug: exam.shareSlug,
      calculatedStatus,
      canEnterLobby,
      canStart,
      startBlockReason,
      examName: exam.quizId?.examName || "Competitive Examination",
      subject: exam.quizId?.subject || "General Studies",
      totalQuestions: totalQuestionsCount,
      marksPerQuestion: exam.quizId?.marksPerQuestion || 1,
      negativeMarking: exam.quizId?.negativeMarking || 0,
      passPercentage: exam.quizId?.passPercentage || 50,
      attempt: attempt
        ? {
            _id: attempt._id,
            status: attempt.status,
            startedAt: attempt.startedAt,
            serverDeadline: attempt.serverDeadline,
            webcamStatus: attempt.webcamStatus,
            lobbyJoinedAt: attempt.lobbyJoinedAt,
            submittedAt: attempt.submittedAt,
            resultId: attempt.resultId,
            feedback: attempt.feedback,
            answeredCount: attempt.answeredCount || 0,
          }
        : null,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error("Get Student Live Exam State Error:", error);
    res.status(500).json({ message: "Failed to fetch student live exam state: " + error.message });
  }
};

/**
 * Student joins Lobby
 * POST /api/live-exams/:id/join-lobby
 */
const joinLiveExamLobby = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await LiveExamination.findOne({ _id: id, isDeleted: false });
    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    const now = new Date();
    if (exam.status === "cancelled") {
      return res.status(400).json({ message: "This examination has been cancelled." });
    }
    if (now >= new Date(exam.scheduledEndTime)) {
      return res.status(400).json({ message: "This examination has already concluded." });
    }

    let attempt = await LiveExamAttempt.findOne({
      liveExamId: exam._id,
      studentId: req.user._id,
    });

    if (!attempt) {
      attempt = await LiveExamAttempt.create({
        liveExamId: exam._id,
        studentId: req.user._id,
        quizId: exam.quizId,
        status: "in_lobby",
        lobbyJoinedAt: now,
        connectionStatus: "online",
        timeline: [
          {
            event: "JOINED_LOBBY",
            timestamp: now,
            metadata: { ip: req.ip },
          },
        ],
      });
    } else {
      if (
        attempt.status === "registered" ||
        (attempt.status === "disqualified" && !attempt.resultId && (!attempt.submittedAt || new Date(attempt.submittedAt) < new Date(exam.scheduledStartTime)))
      ) {
        attempt.status = "in_lobby";
        attempt.lobbyJoinedAt = now;
      }
      attempt.connectionStatus = "online";
      attempt.lastPingAt = now;
      attempt.logTimelineEvent("ENTERED_LOBBY", { ip: req.ip });
      await attempt.save();
    }

    res.json({
      message: "Entered lobby successfully.",
      attemptId: attempt._id,
      status: attempt.status,
      lobbyJoinedAt: attempt.lobbyJoinedAt,
    });
  } catch (error) {
    console.error("Join Lobby Error:", error);
    res.status(500).json({ message: "Failed to join lobby: " + error.message });
  }
};

/**
 * Start Exam Attempt (Server-Authoritative Timing)
 * POST /api/live-exams/:id/start-attempt
 */
const startLiveExamAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { webcamStatus } = req.body;

    const exam = await LiveExamination.findOne({ _id: id, isDeleted: false });
    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    if (exam.status === "cancelled") {
      return res.status(400).json({ message: "This examination has been cancelled." });
    }

    const now = new Date();
    if (now >= new Date(exam.scheduledEndTime)) {
      return res.status(400).json({ message: "This examination has already concluded." });
    }

    if (now < new Date(exam.scheduledStartTime)) {
      return res.status(400).json({ message: "Examination has not started yet. Please wait in the lobby." });
    }

    if (!exam.allowLateEntry) {
      const entryDeadline = new Date(new Date(exam.scheduledStartTime).getTime() + (exam.entryWindowMinutes || 15) * 60 * 1000);
      if (now > entryDeadline) {
        return res.status(400).json({ message: "The allowed entry window has closed. Late entry is not permitted." });
      }
    }

    if (exam.webcamRule === "mandatory" && webcamStatus !== "granted") {
      return res.status(400).json({ message: "Camera permission and readiness verification are required to start this examination." });
    }

    let attempt = await LiveExamAttempt.findOne({
      liveExamId: exam._id,
      studentId: req.user._id,
    });

    if (!attempt) {
      attempt = new LiveExamAttempt({
        liveExamId: exam._id,
        studentId: req.user._id,
        quizId: exam.quizId,
      });
    }

    if (["submitted", "auto_submitted"].includes(attempt.status) || attempt.resultId) {
      return res.status(400).json({ message: "You have already submitted this examination." });
    }
    if (attempt.status === "disqualified") {
      const isEligibleToStart =
        !attempt.resultId &&
        (!attempt.submittedAt || new Date(attempt.submittedAt) < new Date(exam.scheduledStartTime)) &&
        (!attempt.startedAt || new Date(attempt.startedAt) < new Date(exam.scheduledStartTime) || !attempt.savedAnswers || Object.keys(attempt.savedAnswers).length === 0);

      if (isEligibleToStart) {
        attempt.status = "in_lobby";
      } else {
        return res.status(403).json({ message: "You have been disqualified from this examination." });
      }
    }

    // Reconnection / Resume: keep existing startedAt and serverDeadline unless exam was rescheduled/expired within window
    if (attempt.status === "in_progress") {
      const scheduledEnd = new Date(exam.scheduledEndTime);
      const scheduledStart = new Date(exam.scheduledStartTime);
      const isPastOrRescheduled =
        !attempt.serverDeadline ||
        (attempt.startedAt && new Date(attempt.startedAt) < scheduledStart) ||
        (new Date(attempt.serverDeadline) <= now && now < scheduledEnd);

      if (isPastOrRescheduled) {
        const durationMs = exam.duration * 60 * 1000;
        const computedDeadline = new Date(now.getTime() + durationMs);
        attempt.startedAt = now;
        attempt.serverDeadline = computedDeadline < scheduledEnd ? computedDeadline : scheduledEnd;
      }

      attempt.connectionStatus = "online";
      attempt.lastPingAt = now;
      attempt.logTimelineEvent("RECONNECTED", { ip: req.ip });
      await attempt.save();

      return res.json({
        attemptId: attempt._id,
        startedAt: attempt.startedAt,
        serverDeadline: attempt.serverDeadline,
        duration: exam.duration,
        isResuming: true,
      });
    }

    // Fresh start: serverDeadline = MIN(now + duration, scheduledEndTime)
    const durationMs = exam.duration * 60 * 1000;
    const computedDeadline = new Date(now.getTime() + durationMs);
    const scheduledEnd = new Date(exam.scheduledEndTime);
    const serverDeadline = computedDeadline < scheduledEnd ? computedDeadline : scheduledEnd;

    attempt.status = "in_progress";
    attempt.startedAt = now;
    attempt.serverDeadline = serverDeadline;
    attempt.webcamStatus = webcamStatus || (exam.webcamRule === "disabled" ? "none" : "pending");
    attempt.connectionStatus = "online";
    attempt.lastPingAt = now;
    attempt.logTimelineEvent("STARTED_EXAM", {
      startedAt: now,
      serverDeadline,
      webcamStatus: attempt.webcamStatus,
    });

    await attempt.save();

    res.json({
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      serverDeadline: attempt.serverDeadline,
      duration: exam.duration,
      isResuming: false,
    });
  } catch (error) {
    console.error("Start Attempt Error:", error);
    res.status(500).json({ message: "Failed to start exam attempt: " + error.message });
  }
};

/**
 * Auto-submits and grades an attempt whose exam or deadline has passed.
 */
async function autoSubmitAttempt(attempt, exam) {
  try {
    if (!attempt || ["submitted", "auto_submitted", "disqualified"].includes(attempt.status)) {
      return attempt;
    }

    const answersToGrade = attempt.savedAnswers || [];
    let resultId = attempt.resultId || null;

    if (attempt.status === "in_progress") {
      try {
        const quizIdToPreview = attempt.quizId || exam.quizId?._id || exam.quizId;
        const quiz = await quizService.previewQuiz(quizIdToPreview);
        if (quiz) {
          const graded = gradeQuizAttempt(quiz, answersToGrade);
          const shareId = crypto.randomBytes(4).toString("hex");
          const scheduledEndTime = new Date(exam.scheduledEndTime);
          const startedAt = attempt.startedAt ? new Date(attempt.startedAt) : scheduledEndTime;
          const timeTaken = Math.max(0, Math.floor((scheduledEndTime.getTime() - startedAt.getTime()) / 1000));

          const result = await Result.create({
            userId: attempt.studentId,
            quizId: quiz._id,
            quizTitle: exam.title,
            subject: quiz.subject || "General Studies",
            examName: quiz.examName || exam.title,
            passPercentage: quiz.passPercentage ?? 50,
            score: graded.score,
            total: graded.total,
            correct: graded.correct,
            incorrect: graded.incorrect,
            percentage: graded.percentage,
            timeTaken,
            shareId,
            isPublic: true,
            sectionResults: graded.sectionResults,
            difficultyBreakdown: graded.difficultyBreakdown,
            questions: graded.dbQuestions,
            userAnswers: answersToGrade,
            status: "submitted",
          });

          resultId = result._id;
          attempt.answeredCount = graded.correct + graded.incorrect;
        }
      } catch (err) {
        console.error("Auto-grade error for attempt:", attempt._id, err);
      }

      attempt.status = "auto_submitted";
      if (resultId) attempt.resultId = resultId;
    } else {
      // In lobby or registered without starting
      attempt.status = "disqualified";
    }

    const examEndTime = new Date(exam.scheduledEndTime);
    attempt.submittedAt = examEndTime <= new Date() ? examEndTime : new Date();

    if (typeof attempt.logTimelineEvent === "function") {
      attempt.logTimelineEvent("AUTO_SUBMIT_DEADLINE", {
        reason: "Exam scheduled end time reached",
        resultId,
      });
    }

    await attempt.save();
    return attempt;
  } catch (error) {
    console.error("Failed to autoSubmitAttempt for attempt:", attempt._id, error);
    return attempt;
  }
}

/**
 * GET Play Data for Live Player (Zero Answer Leakage)
 * GET /api/live-exams/attempts/:attemptId/play-data
 */
const getLiveExamPlayData = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attempt = await LiveExamAttempt.findOne({
      _id: attemptId,
      studentId: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found or access denied." });
    }

    const exam = await LiveExamination.findOne({ _id: attempt.liveExamId, isDeleted: false });
    if (!exam) {
      return res.status(404).json({ message: "Live examination not found." });
    }

    const now = new Date();
    const isExamEnded = exam.status === "completed" || new Date(exam.scheduledEndTime) <= now;
    if (isExamEnded) {
      if (["in_progress", "in_lobby", "ready", "registered"].includes(attempt.status)) {
        await autoSubmitAttempt(attempt, exam);
      }
      return res.json({
        attemptId: attempt._id,
        liveExamId: exam._id,
        title: exam.title,
        status: attempt.status,
        resultId: attempt.resultId,
        alreadySubmitted: true,
        message: "This examination has concluded.",
      });
    }

    // Fetch quiz blueprint and sanitize questions
    const rawQuiz = await quizService.previewQuiz(attempt.quizId);
    if (!rawQuiz) {
      return res.status(404).json({ message: "Exam questions blueprint not found." });
    }

    // Recalculate deadline if rescheduled or expired while active window is ongoing
    if (attempt.status === "in_progress") {
      const scheduledEnd = new Date(exam.scheduledEndTime);
      const scheduledStart = new Date(exam.scheduledStartTime);
      const isPastOrRescheduled =
        !attempt.serverDeadline ||
        (attempt.startedAt && new Date(attempt.startedAt) < scheduledStart) ||
        (new Date(attempt.serverDeadline) <= now && now < scheduledEnd);

      if (isPastOrRescheduled) {
        const durationMs = exam.duration * 60 * 1000;
        const computedDeadline = new Date(now.getTime() + durationMs);
        attempt.startedAt = now;
        attempt.serverDeadline = computedDeadline < scheduledEnd ? computedDeadline : scheduledEnd;
        await attempt.save();
      }
    }

    const sanitizedQuiz = sanitizeQuizForLivePlayer(rawQuiz);

    res.json({
      attemptId: attempt._id,
      liveExamId: exam._id,
      title: exam.title,
      instructions: exam.instructions,
      scheduledStartTime: exam.scheduledStartTime,
      scheduledEndTime: exam.scheduledEndTime,
      startedAt: attempt.startedAt,
      serverDeadline: attempt.serverDeadline,
      duration: exam.duration,
      serverTime: new Date().toISOString(),
      savedAnswers: attempt.savedAnswers || {},
      currentQuestionIndex: attempt.currentQuestionIndex || 0,
      status: attempt.status,
      webcamRule: exam.webcamRule,
      quiz: sanitizedQuiz,
    });
  } catch (error) {
    console.error("Get Play Data Error:", error);
    res.status(500).json({ message: "Failed to fetch examination questions: " + error.message });
  }
};

/**
 * SAVE in-progress answers and heartbeat (supports refresh / disconnection recovery)
 * POST /api/live-exams/attempts/:attemptId/save-progress
 */
const saveLiveExamProgress = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { savedAnswers, currentQuestionIndex, answeredCount } = req.body;

    const attempt = await LiveExamAttempt.findOne({
      _id: attemptId,
      studentId: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found." });
    }

    if (["submitted", "auto_submitted"].includes(attempt.status)) {
      return res.status(400).json({ message: "Attempt already submitted." });
    }

    if (savedAnswers !== undefined) attempt.savedAnswers = savedAnswers;
    if (currentQuestionIndex !== undefined) attempt.currentQuestionIndex = currentQuestionIndex;
    if (answeredCount !== undefined) attempt.answeredCount = answeredCount;

    attempt.lastPingAt = new Date();
    attempt.connectionStatus = "online";

    await attempt.save();

    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Save Progress Error:", error);
    res.status(500).json({ message: "Failed to save progress: " + error.message });
  }
};

/**
 * SUBMIT Exam Attempt (Manual or Auto-Submit on Deadline)
 * POST /api/live-exams/attempts/:attemptId/submit
 */
const submitLiveExamAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { userAnswers, timeTaken, isAutoSubmit = false } = req.body;

    const attempt = await LiveExamAttempt.findOne({
      _id: attemptId,
      studentId: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found." });
    }

    if (["submitted", "auto_submitted"].includes(attempt.status)) {
      return res.json({
        message: "Exam was already submitted.",
        status: attempt.status,
        resultId: attempt.resultId,
        alreadySubmitted: true,
      });
    }

    const exam = await LiveExamination.findOne({ _id: attempt.liveExamId });
    if (!exam) {
      return res.status(404).json({ message: "Live exam not found." });
    }

    const answersToGrade = userAnswers !== undefined ? userAnswers : attempt.savedAnswers || [];

    // Load full quiz with answers for grading
    const quiz = await quizService.previewQuiz(attempt.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz blueprint not found for grading." });
    }

    const graded = gradeQuizAttempt(quiz, answersToGrade);
    const shareId = crypto.randomBytes(4).toString("hex");

    // Create Result document
    const result = await Result.create({
      userId: req.user._id,
      quizId: quiz._id,
      quizTitle: exam.title,
      subject: quiz.subject || "General Studies",
      examName: quiz.examName || exam.title,
      passPercentage: quiz.passPercentage ?? 50,
      score: graded.score,
      total: graded.total,
      correct: graded.correct,
      incorrect: graded.incorrect,
      percentage: graded.percentage,
      timeTaken: timeTaken || 0,
      shareId,
      isPublic: true,
      sectionResults: graded.sectionResults,
      difficultyBreakdown: graded.difficultyBreakdown,
      questions: graded.dbQuestions,
      userAnswers: answersToGrade,
      status: "submitted",
    });

    const now = new Date();
    attempt.status = isAutoSubmit ? "auto_submitted" : "submitted";
    attempt.submittedAt = now;
    attempt.resultId = result._id;
    attempt.savedAnswers = answersToGrade;
    attempt.answeredCount = graded.correct + graded.incorrect;
    attempt.logTimelineEvent(isAutoSubmit ? "AUTO_SUBMIT_DEADLINE" : "STUDENT_SUBMIT", {
      timeTaken,
      score: graded.score,
      total: graded.total,
      percentage: graded.percentage,
    });

    await attempt.save();

    let showResultNow = exam.resultReleaseMode === "immediate";
    if (exam.resultReleaseMode === "scheduled" && exam.resultReleaseDate) {
      showResultNow = now >= new Date(exam.resultReleaseDate);
    }

    res.json({
      success: true,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      resultId: result._id,
      resultReleaseMode: exam.resultReleaseMode,
      resultReleaseDate: exam.resultReleaseDate,
      showResultNow,
    });
  } catch (error) {
    console.error("Submit Live Exam Error:", error);
    res.status(500).json({ message: "Failed to submit live examination: " + error.message });
  }
};

/**
 * SUBMIT Live Exam Feedback
 * POST /api/live-exams/attempts/:attemptId/feedback
 */
const submitLiveExamFeedback = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { rating, reaction, comments } = req.body;

    const attempt = await LiveExamAttempt.findOne({
      _id: attemptId,
      studentId: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found." });
    }

    const now = new Date();
    attempt.feedback = {
      rating: rating ? Number(rating) : null,
      reaction: reaction || "",
      comments: comments ? comments.trim() : "",
      submittedAt: now,
    };

    attempt.logTimelineEvent("SUBMITTED_FEEDBACK", {
      rating,
      reaction,
    });

    await attempt.save();

    if (attempt.resultId) {
      await Result.findByIdAndUpdate(attempt.resultId, {
        reaction: reaction || "",
        feedbackMessage: comments ? comments.trim() : "",
      });
    }

    res.json({
      success: true,
      message: "Feedback submitted successfully. Thank you!",
    });
  } catch (error) {
    console.error("Submit Feedback Error:", error);
    res.status(500).json({ message: "Failed to submit feedback: " + error.message });
  }
};

/**
 * GET Live Examinations Feed for Student Portal
 * GET /api/live-exams/student-feed
 */
const getStudentLiveExamsFeed = async (req, res) => {
  try {
    const studentId = req.user._id;
    const now = new Date();

    // 1. Keep status updated in background
    await Promise.all([
      LiveExamination.updateMany(
        {
          isDeleted: false,
          status: { $in: ["scheduled", "lobby", "live"] },
          scheduledEndTime: { $lte: now },
        },
        { $set: { status: "completed" } }
      ),
      LiveExamination.updateMany(
        {
          isDeleted: false,
          status: "scheduled",
          scheduledStartTime: { $lte: now },
          scheduledEndTime: { $gt: now },
        },
        { $set: { status: "live" } }
      ),
    ]);

    // 2. Fetch all non-deleted live exams
    const exams = await LiveExamination.find({
      isDeleted: false,
      status: { $ne: "cancelled" },
    })
      .populate("quizId", "title subject examName duration marksPerQuestion negativeMarking passPercentage questions sections")
      .sort({ scheduledStartTime: -1 })
      .lean();

    // 3. Auto-submit any expired/concluded attempts for this student
    const examMap = new Map();
    exams.forEach((e) => examMap.set(e._id.toString(), e));

    const activeAttempts = await LiveExamAttempt.find({
      studentId: studentId,
      status: { $in: ["in_progress", "in_lobby", "ready", "registered"] },
    });

    for (const att of activeAttempts) {
      const examDoc = examMap.get(att.liveExamId.toString());
      if (examDoc) {
        const isExamEnded = examDoc.status === "completed" || new Date(examDoc.scheduledEndTime) <= now;
        const isDeadlinePassed = att.serverDeadline && new Date(att.serverDeadline) <= now;
        if (isExamEnded || isDeadlinePassed) {
          await autoSubmitAttempt(att, examDoc);
        }
      }
    }

    // 4. Fetch student's attempts for all these exams (now fully updated)
    const examIds = exams.map((e) => e._id);
    const studentAttempts = await LiveExamAttempt.find({
      liveExamId: { $in: examIds },
      studentId: studentId,
    }).lean();

    const attemptsMap = new Map();
    studentAttempts.forEach((att) => {
      attemptsMap.set(att.liveExamId.toString(), att);
    });

    let liveCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let myAttemptsCount = 0;

    const formattedExams = exams.map((exam) => {
      const startTime = new Date(exam.scheduledStartTime);
      const endTime = new Date(exam.scheduledEndTime);
      const lobbyStartTime = new Date(startTime.getTime() - (exam.entryWindowMinutes || 15) * 60 * 1000);

      let computedStatus = "scheduled";
      if (exam.status === "completed" || now >= endTime) {
        computedStatus = "completed";
      } else if (now >= startTime && now < endTime) {
        computedStatus = "live";
      } else if (now >= lobbyStartTime && now < startTime) {
        computedStatus = "lobby";
      } else {
        computedStatus = "scheduled";
      }

      if (computedStatus === "live" || computedStatus === "lobby") {
        liveCount++;
      } else if (computedStatus === "scheduled") {
        upcomingCount++;
      } else if (computedStatus === "completed") {
        completedCount++;
      }

      // Check student attempt
      const attempt = attemptsMap.get(exam._id.toString());
      if (attempt) {
        myAttemptsCount++;
      }

      // Calculate question count
      let totalQuestions = 0;
      if (exam.quizId) {
        if (Array.isArray(exam.quizId.questions) && exam.quizId.questions.length > 0) {
          totalQuestions = exam.quizId.questions.length;
        } else if (Array.isArray(exam.quizId.sections)) {
          exam.quizId.sections.forEach((s) => {
            if (Array.isArray(s.questions)) totalQuestions += s.questions.length;
          });
        }
      }

      return {
        _id: exam._id,
        title: exam.title,
        instructions: exam.instructions,
        scheduledStartTime: exam.scheduledStartTime,
        scheduledEndTime: exam.scheduledEndTime,
        duration: exam.duration,
        entryWindowMinutes: exam.entryWindowMinutes || 15,
        allowLateEntry: exam.allowLateEntry !== undefined ? exam.allowLateEntry : true,
        webcamRule: exam.webcamRule || "disabled",
        shareSlug: exam.shareSlug,
        shareToken: exam.shareToken,
        resultReleaseMode: exam.resultReleaseMode,
        status: computedStatus,
        examName: exam.quizId?.examName || "Competitive Exam",
        subject: exam.quizId?.subject || "General Studies",
        marksPerQuestion: exam.quizId?.marksPerQuestion || 1,
        negativeMarking: exam.quizId?.negativeMarking || 0,
        totalQuestions: totalQuestions,
        myAttempt: attempt
          ? {
              attemptId: attempt._id,
              status: computedStatus === "completed" && attempt.status === "in_progress" ? "auto_submitted" : attempt.status,
              startedAt: attempt.startedAt,
              submittedAt: attempt.submittedAt || (computedStatus === "completed" ? exam.scheduledEndTime : null),
              resultId: attempt.resultId,
            }
          : null,
      };
    });

    res.json({
      exams: formattedExams,
      counts: {
        all: formattedExams.length,
        live: liveCount,
        upcoming: upcomingCount,
        completed: completedCount,
        myAttempts: myAttemptsCount,
      },
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error("Student Live Exams Feed Error:", error);
    res.status(500).json({ message: "Failed to fetch student live exams: " + error.message });
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
  getStudentLiveExamState,
  getStudentLiveExamsFeed,
  joinLiveExamLobby,
  startLiveExamAttempt,
  getLiveExamPlayData,
  saveLiveExamProgress,
  submitLiveExamAttempt,
  submitLiveExamFeedback,
  autoSubmitAttempt,
};

