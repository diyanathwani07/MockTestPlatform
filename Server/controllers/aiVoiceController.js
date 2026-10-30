const mongoose = require("mongoose");
const fs = require("fs");
const Schedule = require("../models/Schedule");
const Call = require("../models/Call");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
  generateReminderPcm,
  deleteAudioFile,
  createWavHeader
} = require("../services/geminiTtsService");
const { emitToUser } = require("../services/socketService");
const { isVoiceSubsystemReady, getIntegrityDiagnostics } = require("../config/dbIntegrity");
const { getVoiceSettingsSafe, isWithinCallingSchedule } = require("../services/voiceScheduleHelper");

/**
 * Policy: Scheduled time must be in the future.
 * A 30-second leeway is allowed to account for client-server clock drift.
 */
const MIN_FUTURE_BUFFER_MS = -30 * 1000;

/**
 * Core internal generator function:
 * Validates eligibility, locks schedule, invokes Gemini TTS, writes PCM file, and updates DB.
 */
const generateScheduleAudioInternal = async (scheduleId, userId, force = false) => {
  if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
    throw { status: 400, message: "Invalid schedule ID format." };
  }

  // 1. Fetch schedule ensuring user ownership
  const schedule = await Schedule.findOne({ _id: scheduleId, user: userId });
  if (!schedule) {
    throw { status: 404, message: "Schedule not found." };
  }

  // 2. Disallow cancelled or completed schedules
  if (schedule.status === "CANCELLED") {
    throw { status: 400, message: "Cannot generate audio for a cancelled schedule." };
  }
  if (schedule.status === "COMPLETED") {
    throw { status: 400, message: "Cannot generate audio for a completed schedule." };
  }

  // 3. If already ready and file exists on disk (and force is not requested), return existing
  if (!force && schedule.preGeneratedAudioStatus === "READY" && schedule.preGeneratedAudioPath) {
    if (fs.existsSync(schedule.preGeneratedAudioPath)) {
      return {
        schedule,
        alreadyReady: true,
        filePath: schedule.preGeneratedAudioPath,
        durationSeconds: schedule.audioDurationSeconds
      };
    }
  }

  // 4. Lock generation atomically to prevent duplicate / concurrent processing
  const lockedSchedule = await Schedule.findOneAndUpdate(
    {
      _id: scheduleId,
      user: userId,
      preGeneratedAudioStatus: { $ne: "PROCESSING" }
    },
    {
      $set: { preGeneratedAudioStatus: "PROCESSING" }
    },
    { returnDocument: "after" }
  );

  if (!lockedSchedule) {
    throw { status: 409, message: "Audio generation is already in progress for this schedule." };
  }

  let generatedResult = null;
  try {
    generatedResult = await generateReminderPcm({
      scheduleId: schedule._id.toString(),
      text: schedule.reminderAudioText,
      lang: schedule.language || "auto",
      voice: schedule.voice || null
    });

    // Verify schedule was not cancelled or deleted during TTS synthesis
    const freshSchedule = await Schedule.findOne({ _id: scheduleId, user: userId });
    if (!freshSchedule || freshSchedule.status === "CANCELLED") {
      deleteAudioFile(generatedResult.filePath);
      throw { status: 400, message: "Schedule was cancelled or removed during audio generation." };
    }

    freshSchedule.preGeneratedAudioStatus = "READY";
    freshSchedule.preGeneratedAudioPath = generatedResult.filePath;
    freshSchedule.audioDurationSeconds = generatedResult.durationSeconds;
    await freshSchedule.save();

    return {
      schedule: freshSchedule,
      alreadyReady: false,
      filePath: generatedResult.filePath,
      durationSeconds: generatedResult.durationSeconds
    };
  } catch (error) {
    // Clean up newly created audio file on any failure
    if (generatedResult && generatedResult.filePath) {
      deleteAudioFile(generatedResult.filePath);
    }

    // Safely transition status to FAILED
    await Schedule.findOneAndUpdate(
      { _id: scheduleId, user: userId },
      { $set: { preGeneratedAudioStatus: "FAILED" } }
    ).catch(() => {});

    throw error;
  }
};

/**
 * POST /api/ai-voice/schedule
 * Creates a new task reminder voice call schedule.
 */
const createSchedule = async (req, res) => {
  try {
    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    // 0. Enforce Master Subsystem Switch
    const voiceSettings = await getVoiceSettingsSafe();
    if (voiceSettings && voiceSettings.enabled === false) {
      return res.status(403).json({
        success: false,
        message: "Voice reminder service is currently disabled by administrator."
      });
    }

    const {
      taskTitle,
      taskDescription = "",
      reminderAudioText,
      scheduledTime,
      callType = "TASK_REMINDER",
      timeZone = "Asia/Kolkata",
      language = "auto",
      voice = null,
      metadata = {}
    } = req.body;

    // 1. Validate taskTitle
    if (!taskTitle || typeof taskTitle !== "string" || taskTitle.trim() === "") {
      return res.status(400).json({ success: false, message: "Task title is required." });
    }
    const cleanTitle = taskTitle.trim();
    if (cleanTitle.length > 200) {
      return res.status(400).json({ success: false, message: "Task title cannot exceed 200 characters." });
    }

    // 2. Validate taskDescription
    const cleanDescription = typeof taskDescription === "string" ? taskDescription.trim() : "";
    if (cleanDescription.length > 1000) {
      return res.status(400).json({ success: false, message: "Task description cannot exceed 1000 characters." });
    }

    // 3. Validate scheduledTime
    if (!scheduledTime) {
      return res.status(400).json({ success: false, message: "Scheduled time is required." });
    }
    const parsedDate = new Date(scheduledTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid scheduled time format. Provide a valid ISO timestamp." });
    }

    // Enforce future time policy
    const now = new Date();
    if (parsedDate.getTime() - now.getTime() < MIN_FUTURE_BUFFER_MS) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future. Past dates cannot be scheduled."
      });
    }

    // Enforce Permitted Calling Schedule
    if (voiceSettings && voiceSettings.callingSchedule?.enabled) {
      const isAllowed = isWithinCallingSchedule(voiceSettings.callingSchedule, parsedDate);
      if (!isAllowed) {
        return res.status(400).json({
          success: false,
          message: `Scheduled time falls outside permitted calling schedule (${voiceSettings.callingSchedule.startTime} - ${voiceSettings.callingSchedule.endTime} ${voiceSettings.callingSchedule.timeZone || "Asia/Kolkata"}).`
        });
      }
    }

    // 4. Validate language & default templates
    const validLanguages = ["en", "hi", "auto"];
    const resolvedLanguage = validLanguages.includes(language) ? language : "auto";

    let cleanAudioText = reminderAudioText;
    if (!cleanAudioText || typeof cleanAudioText !== "string" || cleanAudioText.trim() === "") {
      const template =
        resolvedLanguage === "hi"
          ? voiceSettings?.reminderDefaults?.defaultTemplateHindi ||
            "नमस्ते! यह PrepMark की ओर से आपके अध्ययन कार्य '{taskTitle}' के लिए एक अनुस्मारक है।"
          : voiceSettings?.reminderDefaults?.defaultTemplateEnglish ||
            "Hello! This is your study reminder from PrepMark regarding: {taskTitle}.";

      const studentName = req.user?.name || req.user?.fullName || "Student";
      cleanAudioText = template
        .replace(/{taskTitle}/g, cleanTitle)
        .replace(/{studentName}/g, studentName);
    } else {
      cleanAudioText = cleanAudioText.trim();
    }
    if (cleanAudioText.length > 1000) {
      return res.status(400).json({ success: false, message: "Reminder audio text cannot exceed 1000 characters." });
    }

    // 6. Create schedule document (owner derived strictly from authenticated user)
    const schedule = await Schedule.create({
      user: req.user._id,
      taskTitle: cleanTitle,
      taskDescription: cleanDescription,
      reminderAudioText: cleanAudioText,
      scheduledTime: parsedDate,
      timeZone: typeof timeZone === "string" ? timeZone.trim() : "Asia/Kolkata",
      callType: ["TASK_REMINDER", "CUSTOM"].includes(callType) ? callType : "TASK_REMINDER",
      status: "PENDING",
      language: resolvedLanguage,
      voice: typeof voice === "string" && voice.trim() !== "" ? voice.trim() : null,
      preGeneratedAudioStatus: "PENDING",
      metadata: typeof metadata === "object" && metadata !== null ? metadata : {}
    });

    // 7. Fire asynchronous pre-generation in background so HTTP response returns fast
    setImmediate(async () => {
      try {
        await generateScheduleAudioInternal(schedule._id, req.user._id);
      } catch (genErr) {
        // Log cleanly without leaking sensitive details
        console.warn(`[AiVoiceController] Initial audio pre-generation for schedule ${schedule._id}:`, genErr.message || genErr);
      }
    });

    res.status(201).json({
      success: true,
      message: "Task reminder voice call scheduled successfully.",
      data: schedule
    });
  } catch (error) {
    console.error("[AiVoiceController] Create Schedule Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to create schedule." });
  }
};

/**
 * POST /api/ai-voice/schedule/:id/generate-audio
 * Explicitly triggers or refreshes reminder audio generation for a schedule.
 */
const generateScheduleAudio = async (req, res) => {
  try {
    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    const force = req.body && req.body.force === true;
    const result = await generateScheduleAudioInternal(req.params.id, req.user._id, force);

    res.json({
      success: true,
      message: result.alreadyReady
        ? "Audio is already generated and ready."
        : "Reminder audio generated successfully.",
      data: result.schedule
    });
  } catch (error) {
    const status = error.status || 500;
    console.error("[AiVoiceController] Generate Audio Error:", error.message || error);
    res.status(status).json({
      success: false,
      message: error.message || "Failed to generate reminder audio."
    });
  }
};

/**
 * POST /api/ai-voice/schedule/:id/retry-audio
 * Retries failed audio generation for an existing schedule.
 */
const retryScheduleAudio = async (req, res) => {
  try {
    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    const result = await generateScheduleAudioInternal(req.params.id, req.user._id, true);

    res.json({
      success: true,
      message: "Reminder audio generation retried successfully.",
      data: result.schedule
    });
  } catch (error) {
    const status = error.status || 500;
    console.error("[AiVoiceController] Retry Audio Error:", error.message || error);
    res.status(status).json({
      success: false,
      message: error.message || "Failed to retry reminder audio generation."
    });
  }
};

/**
 * GET /api/ai-voice/schedule/:id/audio-status
 * Retrieves current audio generation status for a schedule.
 */
const getAudioStatus = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid schedule ID format." });
    }

    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select("preGeneratedAudioStatus preGeneratedAudioPath audioDurationSeconds status scheduledTime");

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    const fileExists = schedule.preGeneratedAudioPath
      ? fs.existsSync(schedule.preGeneratedAudioPath)
      : false;

    res.json({
      success: true,
      data: {
        scheduleId: schedule._id,
        preGeneratedAudioStatus: schedule.preGeneratedAudioStatus,
        hasAudio: fileExists,
        durationSeconds: schedule.audioDurationSeconds,
        scheduleStatus: schedule.status,
        scheduledTime: schedule.scheduledTime
      }
    });
  } catch (error) {
    console.error("[AiVoiceController] Get Audio Status Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to retrieve audio status." });
  }
};

/**
 * GET /api/ai-voice/schedule
 * Lists the authenticated user's schedules with optional status filter.
 */
const getSchedules = async (req, res) => {
  try {
    const isAdmin = ["admin", "superadmin", "manager"].includes(req.user.role);
    const query = isAdmin ? {} : { user: req.user._id };
    if (isAdmin && req.query.userId) {
      query.user = req.query.userId;
    }

    if (req.query.status) {
      const allowedStatuses = ["PENDING", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED", "FAILED", "REJECTED"];
      const upperStatus = req.query.status.toUpperCase();
      if (allowedStatuses.includes(upperStatus)) {
        query.status = upperStatus;
      }
    }

    const schedules = await Schedule.find(query).populate("user", "fullName name email phone role").sort({ createdAt: -1, scheduledTime: -1 });

    res.json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error("[AiVoiceController] Get Schedules Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to retrieve schedules." });
  }
};

/**
 * GET /api/ai-voice/schedule/:id
 * Retrieves a single schedule by ID belonging strictly to the authenticated user.
 */
const getScheduleById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid schedule ID format." });
    }

    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error("[AiVoiceController] Get Schedule By ID Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to retrieve schedule." });
  }
};

/**
 * PATCH /api/ai-voice/schedule/:id/cancel
 * Safely cancels a pending schedule.
 */
const cancelSchedule = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid schedule ID format." });
    }

    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    if (["COMPLETED", "PROCESSING"].includes(schedule.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a schedule that is already ${schedule.status.toLowerCase()}.`
      });
    }

    if (schedule.status === "CANCELLED") {
      return res.json({
        success: true,
        message: "Schedule is already cancelled.",
        data: schedule
      });
    }

    schedule.status = "CANCELLED";
    await schedule.save();

    res.json({
      success: true,
      message: "Schedule cancelled successfully.",
      data: schedule
    });
  } catch (error) {
    console.error("[AiVoiceController] Cancel Schedule Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to cancel schedule." });
  }
};

/**
 * DELETE /api/ai-voice/schedule/:id
 * Deletes a schedule belonging to the authenticated user and cleans up any audio file.
 */
const deleteSchedule = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid schedule ID format." });
    }

    const schedule = await Schedule.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    // Safely remove associated cached PCM file from disk
    if (schedule.preGeneratedAudioPath) {
      deleteAudioFile(schedule.preGeneratedAudioPath);
    }

    res.json({
      success: true,
      message: "Schedule deleted successfully."
    });
  } catch (error) {
    console.error("[AiVoiceController] Delete Schedule Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to delete schedule." });
  }
};

/**
 * GET /api/ai-voice/history
 * Returns the authenticated user's call history.
 */
const getCallHistory = async (req, res) => {
  try {
    const calls = await Call.find({ user: req.user._id })
      .populate("scheduleId", "taskTitle taskDescription scheduledTime")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: calls.length,
      data: calls
    });
  } catch (error) {
    console.error("[AiVoiceController] Get Call History Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to retrieve call history." });
  }
};

/**
 * POST /api/ai-voice/schedule/:id/accept
 * User acknowledges and accepts an incoming reminder (Phase 4).
 */
const acceptSchedule = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid schedule ID format." });
    }

    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    if (["CANCELLED", "COMPLETED"].includes(schedule.status)) {
      return res.status(400).json({
        success: false,
        message: schedule.status === "CANCELLED"
          ? "Cannot accept a cancelled reminder."
          : "Cannot accept a reminder that is already completed."
      });
    }

    // Atomically find or create the active Call session
    let call = null;
    try {
      call = await Call.findOneAndUpdate(
        { scheduleId: schedule._id, user: req.user._id },
        {
          $setOnInsert: {
            user: req.user._id,
            scheduleId: schedule._id,
            callType: schedule.callType || "TASK_REMINDER",
            status: "ONGOING",
            startTime: new Date()
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // If existing call was INITIATED or RINGING, promote to ONGOING
      if (call && ["INITIATED", "RINGING"].includes(call.status)) {
        call.status = "ONGOING";
        call.startTime = call.startTime || new Date();
        await call.save();
      }
    } catch (callErr) {
      if (callErr.code === 11000) {
        call = await Call.findOne({ scheduleId: schedule._id, user: req.user._id });
      } else {
        console.warn("[AiVoiceController] Call session creation notice:", callErr.message || callErr);
      }
    }

    if (!schedule.metadata) {
      schedule.metadata = new Map();
    }
    schedule.metadata.set("acceptedAt", new Date().toISOString());
    if (call) {
      schedule.metadata.set("activeCallId", call._id.toString());
    }
    // Schedule remains in DISPATCHED while Call is ONGOING, avoiding premature completion
    await schedule.save();

    // Notify connected user via Socket.IO
    if (call) {
      emitToUser(req.user._id, "call-accepted", {
        callId: call._id,
        scheduleId: schedule._id,
        taskTitle: schedule.taskTitle,
        taskDescription: schedule.taskDescription,
        reminderAudioText: schedule.reminderAudioText,
        durationSeconds: schedule.audioDurationSeconds || 0
      });
    }

    res.json({
      success: true,
      message: "Reminder accepted successfully.",
      callId: call ? call._id : null,
      scheduleId: schedule._id,
      call,
      data: schedule
    });
  } catch (error) {
    console.error("[AiVoiceController] Accept Schedule Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to accept reminder." });
  }
};

/**
 * POST /api/ai-voice/schedule/:id/reject
 * User declines / rejects an incoming reminder (Phase 4).
 */
const rejectSchedule = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid schedule ID format." });
    }

    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    if (schedule.status === "CANCELLED") {
      return res.json({
        success: true,
        message: "Reminder is already cancelled or rejected.",
        data: schedule
      });
    }

    if (schedule.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Cannot reject a reminder that has already been completed."
      });
    }

    // Terminate any initiated/ringing call session if present
    const activeCall = await Call.findOne({ scheduleId: schedule._id, user: req.user._id });
    if (activeCall && ["INITIATED", "RINGING"].includes(activeCall.status)) {
      activeCall.status = "REJECTED";
      activeCall.endTime = new Date();
      activeCall.terminationReason = "REJECTED";
      await activeCall.save();
    }

    schedule.status = "CANCELLED";
    if (!schedule.metadata) {
      schedule.metadata = new Map();
    }
    schedule.metadata.set("rejectedAt", new Date().toISOString());
    await schedule.save();

    emitToUser(req.user._id, "call-rejected", {
      scheduleId: schedule._id,
      callId: activeCall ? activeCall._id : null
    });

    res.json({
      success: true,
      message: "Reminder rejected and cancelled successfully.",
      data: schedule
    });
  } catch (error) {
    console.error("[AiVoiceController] Reject Schedule Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to reject reminder." });
  }
};

/**
 * POST /api/ai-voice/session/:callId/end
 * Ends an active call session idempotently.
 */
const endCallSession = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.callId)) {
      return res.status(400).json({ success: false, message: "Invalid call ID format." });
    }

    const call = await Call.findOne({
      _id: req.params.callId,
      user: req.user._id
    });

    if (!call) {
      return res.status(404).json({ success: false, message: "Call session not found." });
    }

    if (["COMPLETED", "REJECTED", "MISSED", "FAILED"].includes(call.status)) {
      return res.json({
        success: true,
        message: "Call session has already ended.",
        data: call
      });
    }

    call.status = "COMPLETED";
    call.endTime = new Date();
    call.terminationReason = req.body?.terminationReason || "USER_HANGUP";
    if (call.startTime) {
      call.durationSeconds = Math.max(0, Math.round((call.endTime.getTime() - call.startTime.getTime()) / 1000));
    }
    await call.save();

    // Safely mark associated schedule as COMPLETED now that voice call has finished
    try {
      await Schedule.findOneAndUpdate(
        { _id: call.scheduleId, user: req.user._id },
        { $set: { status: "COMPLETED" } }
      );
    } catch (_) {}

    emitToUser(req.user._id, "call-ended", {
      callId: call._id,
      scheduleId: call.scheduleId,
      durationSeconds: call.durationSeconds,
      terminationReason: call.terminationReason
    });

    res.json({
      success: true,
      message: "Call session ended successfully.",
      data: call
    });
  } catch (error) {
    console.error("[AiVoiceController] End Call Session Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to end call session." });
  }
};

/**
 * GET /api/ai-voice/session/:callId/audio
 * Streams cached reminder audio wrapped with standard 44-byte WAV header.
 */
const getSessionAudio = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.callId)) {
      return res.status(400).json({ success: false, message: "Invalid call ID format." });
    }

    const call = await Call.findOne({
      _id: req.params.callId,
      user: req.user._id
    });

    if (!call) {
      return res.status(404).json({ success: false, message: "Call session not found." });
    }

    if (["REJECTED", "FAILED"].includes(call.status)) {
      return res.status(403).json({
        success: false,
        message: "Cannot stream audio for a rejected or failed call session."
      });
    }

    const schedule = await Schedule.findOne({
      _id: call.scheduleId,
      user: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    let pcmPath = schedule.preGeneratedAudioPath;

    // Ephemeral disk recovery: If missing from disk, attempt on-demand regeneration
    if (!pcmPath || !fs.existsSync(pcmPath)) {
      try {
        const generated = await generateScheduleAudioInternal(schedule._id, req.user._id, true);
        pcmPath = generated.filePath;
      } catch (genErr) {
        console.error("[AiVoiceController] Ephemeral audio regeneration failed:", genErr.message || genErr);
        return res.status(404).json({ success: false, message: "Audio file is unavailable." });
      }
    }

    if (!fs.existsSync(pcmPath)) {
      return res.status(404).json({ success: false, message: "Audio file not found on disk." });
    }

    const pcmBuffer = fs.readFileSync(pcmPath);
    if (!pcmBuffer || pcmBuffer.length === 0) {
      return res.status(404).json({ success: false, message: "Audio file is empty or corrupted." });
    }
    // Wrap 24,000 Hz 16-bit mono PCM into standard WAV container
    const wavHeader = createWavHeader(pcmBuffer.length, 24000, 1, 16);
    const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", wavBuffer.length);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.status(200).send(wavBuffer);
  } catch (error) {
    console.error("[AiVoiceController] Get Session Audio Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to stream session audio." });
  }
};

/**
 * GET /api/ai-voice/metrics
 * Returns operational telemetry for monitoring dashboards (authenticated).
 */
const getVoiceMetrics = async (req, res) => {
  try {
    const { getSchedulerMetrics } = require("../services/aiVoiceSchedulerService");
    const activeCallsCount = await Call.countDocuments({ status: "ONGOING" });
    const pendingSchedulesCount = await Schedule.countDocuments({ status: "PENDING" });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      subsystemStatus: {
        ready: isVoiceSubsystemReady(),
        diagnostics: getIntegrityDiagnostics()
      },
      scheduler: getSchedulerMetrics(),
      realtime: {
        activeCallsCount,
        pendingSchedulesCount
      }
    });
  } catch (error) {
    console.error("[AiVoiceController] Get Voice Metrics Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to retrieve voice metrics." });
  }
};

/**
 * POST /api/ai-voice/exam-reminder
 * Schedules an automated voice reminder for an exam or quiz.
 */
const scheduleExamReminder = async (req, res) => {
  try {
    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    // 0. Enforce Master Voice Subsystem Switch
    const voiceSettings = await getVoiceSettingsSafe();
    if (voiceSettings && voiceSettings.enabled === false) {
      return res.status(403).json({
        success: false,
        message: "Voice reminder service is currently disabled by administrator."
      });
    }

    const {
      quizId,
      examDate = null,
      timingType = "30_MIN_BEFORE",
      customScheduledTime = null,
      recipients = null,
      reminderAudioText = null,
      language = "auto",
      voice = null
    } = req.body;

    // 1. Validate Quiz / Exam
    if (!quizId || !mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: "Valid quiz or exam ID is required." });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz || quiz.isDeleted) {
      return res.status(404).json({ success: false, message: "Quiz or exam not found." });
    }

    const userRole = req.user.role;
    const isAdminOrTeacher = userRole === "admin" || userRole === "superadmin" || userRole === "teacher" || userRole === "manager";

    // Students can only view & schedule for published quizzes they are taking
    if (!isAdminOrTeacher) {
      const isAvailable = quiz.published || quiz.status === "Published" || quiz.status === "Scheduled";
      if (!isAvailable) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to schedule a reminder for an unpublished quiz."
        });
      }
    }

    // 2. Derive base exam date and calculate target reminder time
    let examDateObj = examDate ? new Date(examDate) : (quiz.scheduledDate ? new Date(quiz.scheduledDate) : null);
    if (!examDateObj || isNaN(examDateObj.getTime())) {
      examDateObj = customScheduledTime ? new Date(customScheduledTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    let targetScheduledTime = null;
    const validIntervals = {
      "15_MIN_BEFORE": 15 * 60 * 1000,
      "30_MIN_BEFORE": 30 * 60 * 1000,
      "1_HOUR_BEFORE": 60 * 60 * 1000,
      "1_DAY_BEFORE": 24 * 60 * 60 * 1000
    };

    if (timingType === "EXACT_TIME") {
      if (!customScheduledTime) {
        return res.status(400).json({ success: false, message: "A specific scheduled date and time is required for EXACT_TIME mode." });
      }
      targetScheduledTime = new Date(customScheduledTime);
    } else if (customScheduledTime && !isNaN(new Date(customScheduledTime).getTime())) {
      targetScheduledTime = new Date(customScheduledTime);
    } else if (validIntervals[timingType]) {
      targetScheduledTime = new Date(examDateObj.getTime() - validIntervals[timingType]);
    } else {
      targetScheduledTime = new Date(examDateObj.getTime() - 30 * 60 * 1000);
    }

    if (isNaN(targetScheduledTime.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid scheduled reminder time computed." });
    }

    // 3. Timing Policies: Must be in future (> now)
    const now = new Date();
    if (targetScheduledTime.getTime() - now.getTime() < MIN_FUTURE_BUFFER_MS) {
      return res.status(400).json({
        success: false,
        message: "The calculated reminder time is in the past. Please choose a future reminder time or interval."
      });
    }

    // 4. Enforce Permitted Calling Schedule (Master Window)
    if (voiceSettings && voiceSettings.callingSchedule?.enabled) {
      const isAllowed = isWithinCallingSchedule(voiceSettings.callingSchedule, targetScheduledTime);
      if (!isAllowed) {
        const { startTime, endTime, timeZone } = voiceSettings.callingSchedule;
        return res.status(400).json({
          success: false,
          message: `The reminder time (${targetScheduledTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}) falls outside the permitted calling window (${startTime} - ${endTime} ${timeZone || "Asia/Kolkata"}).`
        });
      }
    }

    // 5. Determine Target Recipients
    let targetStudents = [];
    if (!isAdminOrTeacher) {
      targetStudents = [req.user];
    } else {
      if (Array.isArray(recipients) && recipients.length > 0) {
        const validIds = recipients.filter(id => mongoose.Types.ObjectId.isValid(id));
        targetStudents = await User.find({ _id: { $in: validIds }, status: "Active", isDeleted: { $ne: true } })
          .select("_id name fullName email role")
          .limit(100);
      } else {
        targetStudents = [req.user];
      }
    }

    if (targetStudents.length === 0) {
      return res.status(400).json({ success: false, message: "No eligible recipients found for this reminder." });
    }

    // 6. Template Placeholder Resolution
    const resolvedLanguage = ["en", "hi", "auto"].includes(language) ? language : "auto";
    const defaultTpl = resolvedLanguage === "hi"
      ? (voiceSettings?.reminderDefaults?.defaultTemplateHindi || "नमस्ते {studentName}! टीचिंग परीक्षा AI की ओर से आपकी परीक्षा '{taskTitle}' {examDate} को निर्धारित है। कृपया समय पर तैयार रहें।")
      : (voiceSettings?.reminderDefaults?.defaultTemplateEnglish || "Hello {studentName}! This is your PrepMark voice reminder: your exam '{taskTitle}' is scheduled for {examDate}. Please be ready!");

    const rawTemplate = (typeof reminderAudioText === "string" && reminderAudioText.trim()) ? reminderAudioText.trim() : defaultTpl;

    const tz = voiceSettings?.callingSchedule?.timeZone || "Asia/Kolkata";
    const formattedExamDate = examDateObj.toLocaleDateString("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" });
    const formattedExamTime = examDateObj.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true });

    // 7. Duplicate Check & Document Creation
    const createdSchedules = [];
    const skippedUsers = [];

    for (const student of targetStudents) {
      const existing = await Schedule.findOne({
        user: student._id,
        quiz: quiz._id,
        status: { $in: ["PENDING", "PROCESSING"] }
      });

      if (existing) {
        skippedUsers.push(student.name || student.fullName || student._id);
        if (targetStudents.length === 1) {
          return res.status(409).json({
            success: false,
            message: `A voice reminder is already active for "${quiz.title}". Next run: ${new Date(existing.scheduledTime).toLocaleString("en-GB", { timeZone: tz })}`,
            existingSchedule: existing
          });
        }
        continue;
      }

      const studentName = student.fullName || student.name || "Student";
      const finalAudioText = rawTemplate
        .replace(/{taskTitle}/g, quiz.title)
        .replace(/{studentName}/g, studentName)
        .replace(/{examDate}/g, formattedExamDate)
        .replace(/{examTime}/g, formattedExamTime);

      const schedule = await Schedule.create({
        user: student._id,
        quiz: quiz._id,
        scheduledBy: req.user._id,
        callType: "EXAM_REMINDER",
        taskTitle: quiz.title,
        taskDescription: `Scheduled reminder for ${quiz.title} (${quiz.subject || "General"})`,
        reminderAudioText: finalAudioText.slice(0, 1000),
        scheduledTime: targetScheduledTime,
        timeZone: tz,
        status: "PENDING",
        language: resolvedLanguage,
        voice: voice || voiceSettings?.englishVoice || "Aoede",
        reminderTimingType: timingType,
        examDateTime: examDateObj,
        preGeneratedAudioStatus: "PENDING"
      });

      createdSchedules.push(schedule);

      // Async Audio Pre-generation
      setImmediate(async () => {
        try {
          await generateScheduleAudioInternal(schedule._id, student._id);
        } catch (audioErr) {
          console.warn(`[AiVoiceController] Pre-gen error for schedule ${schedule._id}:`, audioErr.message || audioErr);
        }
      });
    }

    // 8. Audit Logging for Admin actions
    if (isAdminOrTeacher && createdSchedules.length > 0) {
      try {
        await AuditLog.create({
          action: "SCHEDULE_EXAM_REMINDER",
          performedBy: req.user.email || req.user.name || req.user._id.toString(),
          details: `Scheduled voice reminder for quiz "${quiz.title}" (${quiz._id}) for ${createdSchedules.length} recipient(s). Scheduled time: ${targetScheduledTime.toISOString()}`,
          module: "VOICE_REMINDERS",
          ipAddress: req.ip || req.connection.remoteAddress
        });
      } catch (auditErr) {
        console.warn("[AiVoiceController] Audit log write warning:", auditErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: createdSchedules.length === 1
        ? "Exam voice reminder scheduled successfully."
        : `Scheduled voice reminders for ${createdSchedules.length} student(s).`,
      count: createdSchedules.length,
      skippedCount: skippedUsers.length,
      nextScheduledTime: targetScheduledTime,
      data: createdSchedules.length === 1 ? createdSchedules[0] : createdSchedules
    });
  } catch (error) {
    console.error("[AiVoiceController] Schedule Exam Reminder Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to schedule exam reminder." });
  }
};

/**
 * GET /api/ai-voice/exam-reminders
 * Retrieves scheduled exam voice reminders with role-scoped authorization.
 */
const getExamReminders = async (req, res) => {
  try {
    const userRole = req.user.role;
    const isAdminOrTeacher = userRole === "admin" || userRole === "superadmin" || userRole === "teacher" || userRole === "manager";

    const query = {
      $or: [
        { callType: "EXAM_REMINDER" },
        { quiz: { $ne: null } }
      ]
    };

    if (!isAdminOrTeacher) {
      query.user = req.user._id;
    }

    if (req.query.quizId && mongoose.Types.ObjectId.isValid(req.query.quizId)) {
      query.quiz = req.query.quizId;
    }

    if (req.query.status) {
      const allowed = ["PENDING", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED", "FAILED"];
      const upper = req.query.status.toUpperCase();
      if (allowed.includes(upper)) {
        query.status = upper;
      }
    }

    const reminders = await Schedule.find(query)
      .populate("quiz", "title subject examName duration scheduledDate status published")
      .populate("user", "name fullName email role")
      .populate("scheduledBy", "name fullName email")
      .sort({ scheduledTime: 1, createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: reminders.length,
      data: reminders
    });
  } catch (error) {
    console.error("[AiVoiceController] Get Exam Reminders Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to fetch exam reminders." });
  }
};

/**
 * PATCH /api/ai-voice/exam-reminder/:id/cancel
 * Cancels a pending exam reminder with authorization check.
 */
const cancelExamReminder = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid schedule ID." });
    }

    const userRole = req.user.role;
    const isAdminOrTeacher = userRole === "admin" || userRole === "superadmin" || userRole === "teacher" || userRole === "manager";

    const query = { _id: req.params.id };
    if (!isAdminOrTeacher) {
      query.user = req.user._id;
    }

    const schedule = await Schedule.findOne(query);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Reminder schedule not found." });
    }

    if (["COMPLETED", "PROCESSING"].includes(schedule.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a reminder that is already ${schedule.status.toLowerCase()}.`
      });
    }

    if (schedule.status === "CANCELLED") {
      return res.json({
        success: true,
        message: "Reminder is already cancelled.",
        data: schedule
      });
    }

    schedule.status = "CANCELLED";
    await schedule.save();

    if (isAdminOrTeacher) {
      try {
        await AuditLog.create({
          action: "CANCEL_EXAM_REMINDER",
          performedBy: req.user.email || req.user.name || req.user._id.toString(),
          details: `Cancelled voice reminder for task "${schedule.taskTitle}" (${schedule._id})`,
          module: "VOICE_REMINDERS",
          ipAddress: req.ip || req.connection.remoteAddress
        });
      } catch (err) {}
    }

    res.json({
      success: true,
      message: "Exam reminder cancelled successfully.",
      data: schedule
    });
  } catch (error) {
    console.error("[AiVoiceController] Cancel Exam Reminder Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to cancel exam reminder." });
  }
};

/**
 * GET /api/ai-voice/eligible-exams
 * Returns exams/quizzes available for scheduling reminders based on user role.
 */
const getEligibleExamsForReminders = async (req, res) => {
  try {
    const userRole = req.user.role;
    const isAdminOrTeacher = userRole === "admin" || userRole === "superadmin" || userRole === "teacher" || userRole === "manager";

    let query = { isDeleted: false };
    if (!isAdminOrTeacher) {
      query = {
        isDeleted: false,
        $or: [
          { published: true },
          { status: "Published" },
          { status: "Scheduled" }
        ]
      };
    }

    const quizzes = await Quiz.find(query)
      .select("title subject examName duration scheduledDate status published quizType")
      .sort({ scheduledDate: -1, createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    console.error("[AiVoiceController] Get Eligible Exams Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to retrieve eligible exams." });
  }
};


/**
 * POST /api/ai-voice/admin/schedule-call
 * Admin schedules or instantly dispatches an AI Voice Call to any selected user.
 */
const adminScheduleCall = async (req, res) => {
  try {
    if (!isVoiceSubsystemReady()) {
      return res.status(503).json({
        success: false,
        message: "Voice reminder subsystem is temporarily unavailable due to database maintenance."
      });
    }

    const voiceSettings = await getVoiceSettingsSafe();
    if (voiceSettings && voiceSettings.enabled === false) {
      return res.status(403).json({
        success: false,
        message: "Voice reminder service is currently disabled by administrator in Voice Settings."
      });
    }

    const {
      targetUserId,
      userId,
      taskTitle,
      taskDescription = "",
      reminderAudioText,
      scheduledTime,
      callNow = false,
      callType = "TASK_REMINDER",
      language = "auto",
      voice = null
    } = req.body;

    const resolvedUserId = targetUserId || userId;
    if (!resolvedUserId || !mongoose.Types.ObjectId.isValid(resolvedUserId)) {
      return res.status(400).json({ success: false, message: "Valid target user ID is required." });
    }

    const targetUser = await User.findById(resolvedUserId).select("fullName name email phone");
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Selected user not found." });
    }

    if (!taskTitle || typeof taskTitle !== "string" || taskTitle.trim() === "") {
      return res.status(400).json({ success: false, message: "Call title is required." });
    }
    const cleanTitle = taskTitle.trim().slice(0, 200);

    const now = new Date();
    let finalScheduledTime = now;
    if (!callNow && scheduledTime) {
      const parsedDate = new Date(scheduledTime);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid scheduled time format." });
      }
      finalScheduledTime = parsedDate;
    }

    const validLanguages = ["en", "hi", "auto"];
    const resolvedLanguage = validLanguages.includes(language) ? language : "auto";

    let cleanAudioText = reminderAudioText;
    const recipientName = targetUser.fullName || targetUser.name || "Student";
    if (!cleanAudioText || typeof cleanAudioText !== "string" || cleanAudioText.trim() === "") {
      const template =
        resolvedLanguage === "hi"
          ? voiceSettings?.reminderDefaults?.defaultTemplateHindi ||
            "नमस्ते {studentName}! यह PrepMark की ओर से आपके अध्ययन कार्य '{taskTitle}' के लिए एक AI वॉइस कॉल है।"
          : voiceSettings?.reminderDefaults?.defaultTemplateEnglish ||
            "Hello {studentName}! This is an AI voice call from PrepMark regarding: {taskTitle}.";

      cleanAudioText = template
        .replace(/{taskTitle}/g, cleanTitle)
        .replace(/{studentName}/g, recipientName);
    } else {
      cleanAudioText = cleanAudioText
        .replace(/{studentName}/g, recipientName)
        .replace(/{taskTitle}/g, cleanTitle)
        .trim();
    }

    if (cleanAudioText.length > 1000) {
      cleanAudioText = cleanAudioText.slice(0, 1000);
    }

    const schedule = await Schedule.create({
      user: targetUser._id,
      scheduledBy: req.user._id,
      taskTitle: cleanTitle,
      taskDescription: typeof taskDescription === "string" ? taskDescription.trim().slice(0, 1000) : "",
      reminderAudioText: cleanAudioText,
      scheduledTime: finalScheduledTime,
      callType: ["TASK_REMINDER", "CUSTOM"].includes(callType) ? callType : "CUSTOM",
      status: "PENDING",
      language: resolvedLanguage,
      voice: typeof voice === "string" && voice.trim() !== "" ? voice.trim() : (voiceSettings?.defaultVoice || "Aoede"),
      preGeneratedAudioStatus: "PENDING"
    });

    const { dispatchImmediateSchedule } = require("../services/aiVoiceSchedulerService");
    let audioGenResult = null;
    try {
      audioGenResult = await generateScheduleAudioInternal(schedule._id, targetUser._id, true);
    } catch (genErr) {
      console.warn(`[AiVoiceController] Admin call audio generation warning for schedule ${schedule._id}:`, genErr.message || genErr);
    }

    let immediateDispatchResult = null;
    if (callNow || Math.abs(finalScheduledTime.getTime() - now.getTime()) <= 30000) {
      try {
        immediateDispatchResult = await dispatchImmediateSchedule(schedule._id, {
          callerName: "PrepMark AI"
        });
        console.log(`[AiVoiceController] Instant call dispatched to user ${targetUser._id} (${targetUser.email}):`, immediateDispatchResult);
      } catch (dispErr) {
        console.error(`[AiVoiceController] Immediate dispatch failed:`, dispErr.message);
      }
    }

    await AuditLog.create({
      action: "ADMIN_SCHEDULED_AI_VOICE_CALL",
      performedBy: req.user._id,
      targetUser: targetUser._id,
      details: {
        scheduleId: schedule._id,
        callNow: !!callNow,
        taskTitle: cleanTitle,
        dispatched: !!immediateDispatchResult?.success
      }
    }).catch(() => {});

    const freshSchedule = await Schedule.findById(schedule._id);

    res.status(201).json({
      success: true,
      message: callNow
        ? "AI Voice Call dispatched immediately to student!"
        : "AI Voice Call scheduled successfully.",
      data: {
        schedule: freshSchedule,
        dispatchedImmediately: !!immediateDispatchResult?.success,
        dispatchDetails: immediateDispatchResult
      }
    });
  } catch (error) {
    console.error("[AiVoiceController] Admin Schedule Call Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to schedule AI voice call." });
  }
};

/**
 * GET /api/ai-voice/admin/users
 * Lists candidate users for AI voice calls with device tokens & platform info.
 */
const getCallCandidates = async (req, res) => {
  try {
    const NotificationDevice = require("../models/NotificationDevice");
    const { search = "", limit = 50 } = req.query;

    const query = { isDeleted: { $ne: true } };
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    const users = await User.find(query)
      .select("fullName name email phone role avatar createdAt")
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 50)
      .lean();

    const userIds = users.map(u => u._id);
    const devices = await NotificationDevice.find({ userId: { $in: userIds } })
      .select("userId platform token lastActive createdAt")
      .lean();

    const deviceMap = {};
    devices.forEach(d => {
      const uid = d.userId.toString();
      if (!deviceMap[uid]) deviceMap[uid] = [];
      deviceMap[uid].push(d);
    });

    const candidates = users.map(u => {
      const userDevs = deviceMap[u._id.toString()] || [];
      const hasAndroid = userDevs.some(d => d.platform === "android");
      const hasIos = userDevs.some(d => d.platform === "ios");
      const hasWeb = userDevs.some(d => d.platform === "web");
      return {
        ...u,
        devicesCount: userDevs.length,
        hasAndroid,
        hasIos,
        hasWeb,
        deviceSummary: hasAndroid ? "Android (FCM Ready)" : hasWeb ? "Web App" : userDevs.length > 0 ? "Registered" : "No device registered"
      };
    });

    res.json({
      success: true,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    console.error("[AiVoiceController] Get Call Candidates Error:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve call candidates." });
  }
};


module.exports = {
  adminScheduleCall,
  getCallCandidates,
  createSchedule,
  generateScheduleAudio,
  retryScheduleAudio,
  getAudioStatus,
  getSchedules,
  getScheduleById,
  cancelSchedule,
  deleteSchedule,
  getCallHistory,
  generateScheduleAudioInternal,
  acceptSchedule,
  rejectSchedule,
  endCallSession,
  getSessionAudio,
  getVoiceMetrics,
  scheduleExamReminder,
  getExamReminders,
  cancelExamReminder,
  getEligibleExamsForReminders
};
