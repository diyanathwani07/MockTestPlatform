const mongoose = require("mongoose");
const fs = require("fs");
const Schedule = require("../models/Schedule");
const Call = require("../models/Call");
const {
  generateReminderPcm,
  deleteAudioFile,
  createWavHeader
} = require("../services/geminiTtsService");
const { emitToUser } = require("../services/socketService");

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

    // 4. Validate reminderAudioText (default to sensible message if empty)
    let cleanAudioText = reminderAudioText;
    if (!cleanAudioText || typeof cleanAudioText !== "string" || cleanAudioText.trim() === "") {
      cleanAudioText = `Hello! This is your automated AI reminder for: ${cleanTitle}.`;
    } else {
      cleanAudioText = cleanAudioText.trim();
    }
    if (cleanAudioText.length > 1000) {
      return res.status(400).json({ success: false, message: "Reminder audio text cannot exceed 1000 characters." });
    }

    // 5. Validate language
    const validLanguages = ["en", "hi", "auto"];
    const resolvedLanguage = validLanguages.includes(language) ? language : "auto";

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
    const query = { user: req.user._id };

    if (req.query.status) {
      const allowedStatuses = ["PENDING", "PROCESSING", "DISPATCHED", "COMPLETED", "CANCELLED", "FAILED", "REJECTED"];
      const upperStatus = req.query.status.toUpperCase();
      if (allowedStatuses.includes(upperStatus)) {
        query.status = upperStatus;
      }
    }

    const schedules = await Schedule.find(query).sort({ scheduledTime: 1, createdAt: -1 });

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

    const schedule = await Schedule.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    if (schedule.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Cannot accept a cancelled reminder." });
    }

    // Atomically find or create the active Call session
    let call = null;
    try {
      call = await Call.findOne({ scheduleId: schedule._id, user: req.user._id });
      if (!call) {
        call = await Call.create({
          user: req.user._id,
          scheduleId: schedule._id,
          callType: schedule.callType || "TASK_REMINDER",
          status: "ONGOING",
          startTime: new Date()
        });
      } else if (call.status === "INITIATED" || call.status === "RINGING") {
        call.status = "ONGOING";
        call.startTime = call.startTime || new Date();
        await call.save();
      }
    } catch (callErr) {
      console.warn("[AiVoiceController] Call session creation notice:", callErr.message || callErr);
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

module.exports = {
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
  getSessionAudio
};
