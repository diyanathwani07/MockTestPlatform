const VoiceSetting = require("../models/VoiceSetting");
const mammoth = require("mammoth");
const { testVoiceSample } = require("../services/geminiTtsService");
const { isValidTimeZone, VALID_DAYS, timeToMinutes } = require("../services/voiceScheduleHelper");

const VALID_VOICES = ["Aoede", "Charon", "Fenrir", "Kore", "Puck"];

// Simple in-memory rate limiter for voice audio previews (max 10 calls per minute per user/IP)
const previewRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_PREVIEWS_PER_WINDOW = 10;

function checkPreviewRateLimit(identifier) {
  const now = Date.now();
  const userTimestamps = previewRateLimitMap.get(identifier) || [];
  const validTimestamps = userTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_PREVIEWS_PER_WINDOW) {
    return false;
  }

  validTimestamps.push(now);
  previewRateLimitMap.set(identifier, validTimestamps);
  return true;
}

// 1. Get Voice Settings (Public for student app & Admin)
const getVoiceSettings = async (req, res) => {
  try {
    let settings = await VoiceSetting.findOne().populate("updatedBy", "fullName name email");
    if (!settings) {
      settings = await VoiceSetting.create({
        model: "gemini-2.5-flash-preview-tts",
        englishVoice: "Aoede",
        hindiVoice: "Aoede",
        defaultLanguage: "auto",
        englishPrompt:
          "You are an articulate, professional news anchor and educator. Read this news report aloud clearly in an engaging, natural, steady broadcasting tone with precise pronunciation.",
        hindiPrompt:
          "आप एक पेशेवर और स्पष्ट समाचार वाचक (News Broadcaster) हैं। इस समाचार को सहज, प्रामाणिक और प्रभावशाली हिंदी उच्चारण में स्पष्ट रूप से पढ़कर सुनाएं। कठिन शब्दों और तकनीकी नामों का उच्चारण अत्यंत स्पष्ट रखें।",
        callingSchedule: {
          enabled: true,
          allowedDays: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
          ],
          startTime: "08:00",
          endTime: "21:00",
          timeZone: "Asia/Kolkata"
        },
        retryRules: {
          maxRetryAttempts: 3,
          retryDelayMinutes: 15
        },
        reminderDefaults: {
          defaultTimingMinutes: 15,
          defaultTemplateEnglish:
            "Hello! This is your study reminder from Teaching Pariksha AI regarding: {taskTitle}.",
          defaultTemplateHindi:
            "नमस्ते! यह टीचिंग परीक्षा AI की ओर से आपके अध्ययन कार्य '{taskTitle}' के लिए एक अनुस्मारक है।"
        },
        enabled: true
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error("Error fetching voice settings:", error.message || error);
    res.status(500).json({ error: "Failed to fetch voice settings" });
  }
};

// 2. Update Voice Settings (Admin / Superadmin only)
const updateVoiceSettings = async (req, res) => {
  try {
    const {
      englishVoice,
      hindiVoice,
      defaultLanguage,
      englishPrompt,
      hindiPrompt,
      callingSchedule,
      retryRules,
      reminderDefaults,
      enabled
    } = req.body;

    let settings = await VoiceSetting.findOne();
    if (!settings) {
      settings = new VoiceSetting();
    }

    // Strictly retain single model gemini-2.5-flash-preview-tts
    settings.model = "gemini-2.5-flash-preview-tts";

    // 1. Voice validation
    if (englishVoice !== undefined) {
      if (!VALID_VOICES.includes(englishVoice)) {
        return res.status(400).json({
          success: false,
          error: `Invalid englishVoice: '${englishVoice}'. Supported voices: ${VALID_VOICES.join(", ")}.`
        });
      }
      settings.englishVoice = englishVoice;
    }

    if (hindiVoice !== undefined) {
      if (!VALID_VOICES.includes(hindiVoice)) {
        return res.status(400).json({
          success: false,
          error: `Invalid hindiVoice: '${hindiVoice}'. Supported voices: ${VALID_VOICES.join(", ")}.`
        });
      }
      settings.hindiVoice = hindiVoice;
    }

    // 2. Default language strategy validation
    if (defaultLanguage !== undefined) {
      if (!["en", "hi", "auto"].includes(defaultLanguage)) {
        return res.status(400).json({
          success: false,
          error: "Invalid defaultLanguage. Allowed options: 'en', 'hi', 'auto'."
        });
      }
      settings.defaultLanguage = defaultLanguage;
    }

    // 3. Prompt validation & sanitization
    if (englishPrompt !== undefined) {
      if (typeof englishPrompt !== "string") {
        return res.status(400).json({ success: false, error: "englishPrompt must be a string." });
      }
      const trimmed = englishPrompt.trim();
      if (trimmed.length > 2000) {
        return res.status(400).json({ success: false, error: "englishPrompt cannot exceed 2000 characters." });
      }
      settings.englishPrompt = trimmed;
    }

    if (hindiPrompt !== undefined) {
      if (typeof hindiPrompt !== "string") {
        return res.status(400).json({ success: false, error: "hindiPrompt must be a string." });
      }
      const trimmed = hindiPrompt.trim();
      if (trimmed.length > 2000) {
        return res.status(400).json({ success: false, error: "hindiPrompt cannot exceed 2000 characters." });
      }
      settings.hindiPrompt = trimmed;
    }

    // 4. Calling schedule validation
    if (callingSchedule !== undefined) {
      if (typeof callingSchedule !== "object" || callingSchedule === null) {
        return res.status(400).json({ success: false, error: "callingSchedule must be an object." });
      }

      if (!settings.callingSchedule) settings.callingSchedule = {};

      if (callingSchedule.enabled !== undefined) {
        if (typeof callingSchedule.enabled !== "boolean") {
          return res.status(400).json({ success: false, error: "callingSchedule.enabled must be a boolean." });
        }
        settings.callingSchedule.enabled = callingSchedule.enabled;
      }

      if (callingSchedule.allowedDays !== undefined) {
        if (!Array.isArray(callingSchedule.allowedDays) || callingSchedule.allowedDays.length === 0) {
          return res.status(400).json({
            success: false,
            error: "callingSchedule.allowedDays must be an array containing at least one valid day."
          });
        }
        for (const day of callingSchedule.allowedDays) {
          if (!VALID_DAYS.includes(day)) {
            return res.status(400).json({
              success: false,
              error: `Invalid day '${day}' in allowedDays. Valid options: ${VALID_DAYS.join(", ")}.`
            });
          }
        }
        settings.callingSchedule.allowedDays = [...new Set(callingSchedule.allowedDays)];
      }

      if (callingSchedule.startTime !== undefined) {
        if (timeToMinutes(callingSchedule.startTime) === null) {
          return res.status(400).json({
            success: false,
            error: "callingSchedule.startTime must be in HH:mm 24-hour format (e.g. '08:00')."
          });
        }
        settings.callingSchedule.startTime = callingSchedule.startTime;
      }

      if (callingSchedule.endTime !== undefined) {
        if (timeToMinutes(callingSchedule.endTime) === null) {
          return res.status(400).json({
            success: false,
            error: "callingSchedule.endTime must be in HH:mm 24-hour format (e.g. '21:00')."
          });
        }
        settings.callingSchedule.endTime = callingSchedule.endTime;
      }

      if (callingSchedule.timeZone !== undefined) {
        if (!isValidTimeZone(callingSchedule.timeZone)) {
          return res.status(400).json({
            success: false,
            error: `Invalid timeZone '${callingSchedule.timeZone}'. Must be a valid IANA timezone (e.g. 'Asia/Kolkata', 'UTC').`
          });
        }
        settings.callingSchedule.timeZone = callingSchedule.timeZone;
      }
    }

    // 5. Retry rules validation (Do not silently clamp - reject out of bounds)
    if (retryRules !== undefined) {
      if (typeof retryRules !== "object" || retryRules === null) {
        return res.status(400).json({ success: false, error: "retryRules must be an object." });
      }

      if (!settings.retryRules) settings.retryRules = {};

      if (retryRules.maxRetryAttempts !== undefined) {
        const val = retryRules.maxRetryAttempts;
        if (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 5) {
          return res.status(400).json({
            success: false,
            error: "retryRules.maxRetryAttempts must be an integer between 1 and 5."
          });
        }
        settings.retryRules.maxRetryAttempts = val;
      }

      if (retryRules.retryDelayMinutes !== undefined) {
        const val = retryRules.retryDelayMinutes;
        if (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 60) {
          return res.status(400).json({
            success: false,
            error: "retryRules.retryDelayMinutes must be an integer between 1 and 60."
          });
        }
        settings.retryRules.retryDelayMinutes = val;
      }
    }

    // 6. Reminder defaults validation
    if (reminderDefaults !== undefined) {
      if (typeof reminderDefaults !== "object" || reminderDefaults === null) {
        return res.status(400).json({ success: false, error: "reminderDefaults must be an object." });
      }

      if (!settings.reminderDefaults) settings.reminderDefaults = {};

      if (reminderDefaults.defaultTimingMinutes !== undefined) {
        const val = reminderDefaults.defaultTimingMinutes;
        if (typeof val !== "number" || !Number.isInteger(val) || val < 0 || val > 1440) {
          return res.status(400).json({
            success: false,
            error: "reminderDefaults.defaultTimingMinutes must be an integer between 0 and 1440."
          });
        }
        settings.reminderDefaults.defaultTimingMinutes = val;
      }

      if (reminderDefaults.defaultTemplateEnglish !== undefined) {
        if (typeof reminderDefaults.defaultTemplateEnglish !== "string") {
          return res.status(400).json({ success: false, error: "defaultTemplateEnglish must be a string." });
        }
        const trimmed = reminderDefaults.defaultTemplateEnglish.trim();
        if (trimmed.length > 1000) {
          return res.status(400).json({ success: false, error: "defaultTemplateEnglish cannot exceed 1000 characters." });
        }
        settings.reminderDefaults.defaultTemplateEnglish = trimmed;
      }

      if (reminderDefaults.defaultTemplateHindi !== undefined) {
        if (typeof reminderDefaults.defaultTemplateHindi !== "string") {
          return res.status(400).json({ success: false, error: "defaultTemplateHindi must be a string." });
        }
        const trimmed = reminderDefaults.defaultTemplateHindi.trim();
        if (trimmed.length > 1000) {
          return res.status(400).json({ success: false, error: "defaultTemplateHindi cannot exceed 1000 characters." });
        }
        settings.reminderDefaults.defaultTemplateHindi = trimmed;
      }
    }

    // 7. Master switch
    if (enabled !== undefined) {
      if (typeof enabled !== "boolean") {
        return res.status(400).json({ success: false, error: "enabled must be a boolean." });
      }
      settings.enabled = enabled;
    }

    // Track updating admin
    if (req.user && req.user._id) {
      settings.updatedBy = req.user._id;
    }
    settings.updatedAt = new Date();

    await settings.save();

    // Populate updatedBy before returning
    await settings.populate("updatedBy", "fullName name email");

    res.json({
      success: true,
      message: "Voice settings updated successfully",
      settings
    });
  } catch (error) {
    console.error("Error updating voice settings:", error.message || error);
    res.status(500).json({ error: "Failed to update voice settings" });
  }
};

// 3. Test Voice Audio Preview in Real-time (Admin / Superadmin only)
const testVoicePreview = async (req, res) => {
  try {
    const rateLimitKey = req.user?._id?.toString() || req.ip || "admin-client";
    if (!checkPreviewRateLimit(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        error: "Too many voice preview requests. Please wait a minute before trying again."
      });
    }

    const { sampleText, lang, voice, customPrompt } = req.body;

    // Strict input validation
    if (!sampleText || typeof sampleText !== "string" || sampleText.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "sampleText is required and cannot be empty."
      });
    }
    const cleanSampleText = sampleText.trim();
    if (cleanSampleText.length > 3000) {
      return res.status(400).json({
        success: false,
        error: "Text cannot exceed 3,000 characters for speech generation."
      });
    }

    if (voice && !VALID_VOICES.includes(voice)) {
      return res.status(400).json({
        success: false,
        error: `Invalid voice '${voice}'. Supported voices: ${VALID_VOICES.join(", ")}.`
      });
    }

    if (lang && !["en", "hi", "auto"].includes(lang)) {
      return res.status(400).json({
        success: false,
        error: "Invalid lang parameter. Must be 'en', 'hi', or 'auto'."
      });
    }

    if (customPrompt && typeof customPrompt === "string" && customPrompt.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "customPrompt cannot exceed 2000 characters."
      });
    }

    const result = await testVoiceSample({
      sampleText: cleanSampleText,
      lang: lang || "en",
      voice: voice || "Aoede",
      customPrompt: customPrompt || ""
    });

    res.json({
      success: true,
      audioUrl: result.audioUrl,
      voice: result.voice,
      durationSeconds: result.durationSeconds
    });
  } catch (error) {
    console.error("Error testing voice sample:", error.message || error);
    let rawMsg = error.message || "";
    try {
      if (typeof rawMsg === "string" && (rawMsg.trim().startsWith("{") || rawMsg.includes('"message"'))) {
        const parsed = JSON.parse(rawMsg);
        if (parsed.error && parsed.error.message) {
          rawMsg = parsed.error.message;
        } else if (parsed.message) {
          rawMsg = parsed.message;
        }
      }
    } catch (_) {
      // Not JSON string, keep as is
    }

    let safeMessage = "Failed to generate voice preview";
    if (rawMsg.includes("API_KEY") || rawMsg.includes("key=") || rawMsg.includes("CREDENTIALS")) {
      safeMessage = "TTS service configuration error: GEMINI_API_KEY is not configured or invalid.";
    } else if (rawMsg.includes("429") || rawMsg.toLowerCase().includes("quota") || rawMsg.toLowerCase().includes("rate limit") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
      safeMessage = "Gemini TTS quota exceeded. Please check your Google AI account quota.";
    } else if (rawMsg.toLowerCase().includes("timeout") || rawMsg.toLowerCase().includes("timed out")) {
      safeMessage = "TTS synthesis timed out after 30 seconds. Please try again.";
    } else if (rawMsg.includes("Malformed WAV") || rawMsg.includes("Invalid raw PCM")) {
      safeMessage = "TTS service returned unreadable audio format.";
    } else if (
      rawMsg.toLowerCase().includes("internal error") ||
      rawMsg.toLowerCase().includes("troubleshooting") ||
      rawMsg.includes("INTERNAL")
    ) {
      safeMessage = "Gemini TTS upstream service experienced a temporary internal error. Please retry in a moment.";
    } else if (rawMsg) {
      safeMessage = rawMsg.replace(/key=[a-zA-Z0-9_\-]+/gi, "key=REDACTED");
    }
    res.status(500).json({ success: false, error: safeMessage });
  }
};

// 4. Extract Plain Text from Word Document (.docx)
const extractDocxText = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: "No Word document file uploaded. Please select a .docx file."
      });
    }

    const originalName = req.file.originalname || "document.docx";
    if (!originalName.toLowerCase().endsWith(".docx")) {
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Only Word documents (.docx) are supported."
      });
    }

    // Extract raw plain text using Mammoth
    let extractionResult;
    try {
      extractionResult = await mammoth.extractRawText({ buffer: req.file.buffer });
    } catch (parseErr) {
      console.error("[VoiceSettings] Mammoth extraction error:", parseErr.message);
      return res.status(400).json({
        success: false,
        error: "Failed to parse document. The file may be damaged, corrupted, or not a valid .docx document."
      });
    }

    const rawText = (extractionResult?.value || "").trim();

    if (!rawText) {
      return res.status(400).json({
        success: false,
        error: "The uploaded Word document contains no readable text."
      });
    }

    const characterCount = rawText.length;
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const maxSpeechLimit = 3000;
    const exceedsLimit = characterCount > maxSpeechLimit;

    res.json({
      success: true,
      fileName: originalName,
      fileSize: req.file.size,
      text: rawText,
      characterCount,
      wordCount,
      maxSpeechLimit,
      exceedsLimit,
      warning: exceedsLimit
        ? `Document contains ${characterCount.toLocaleString()} characters. The maximum single-turn speech synthesis limit is ${maxSpeechLimit.toLocaleString()} characters. Please trim the text before generating audio.`
        : null
    });
  } catch (error) {
    console.error("[VoiceSettings] extractDocxText unhandled error:", error.message || error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred while processing the document."
    });
  }
};

module.exports = {
  getVoiceSettings,
  updateVoiceSettings,
  testVoicePreview,
  extractDocxText
};

