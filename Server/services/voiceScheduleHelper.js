const VoiceSetting = require("../models/VoiceSetting");

const VALID_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

/**
 * Validates whether an IANA timezone string is recognized by the runtime.
 */
function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Parses "HH:mm" 24-hour time string into total minutes from midnight (0 - 1439).
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Checks whether a given Date is within the permitted calling schedule.
 * Correctly accounts for timezone, allowed days of week, and overnight time windows.
 */
function isWithinCallingSchedule(scheduleConfig, date = new Date()) {
  if (!scheduleConfig || scheduleConfig.enabled === false) {
    return true;
  }

  const tz = isValidTimeZone(scheduleConfig.timeZone) ? scheduleConfig.timeZone : "Asia/Kolkata";
  const validDays = Array.isArray(scheduleConfig.allowedDays) && scheduleConfig.allowedDays.length > 0
    ? scheduleConfig.allowedDays
    : VALID_DAYS;

  // Format the given date in the target timezone
  let weekday = "";
  let hour = 0;
  let minute = 0;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });

    const parts = formatter.formatToParts(date);
    for (const part of parts) {
      if (part.type === "weekday") weekday = part.value;
      else if (part.type === "hour") hour = parseInt(part.value, 10);
      else if (part.type === "minute") minute = parseInt(part.value, 10);
    }
  } catch (err) {
    console.error("[voiceScheduleHelper] Timezone format error:", err.message);
    return true; // Fallback to permissive on unexpected date-format error
  }

  // 1. Day of week check
  if (!validDays.includes(weekday)) {
    return false;
  }

  // 2. Time window check
  const startMinutes = timeToMinutes(scheduleConfig.startTime || "08:00");
  const endMinutes = timeToMinutes(scheduleConfig.endTime || "21:00");

  if (startMinutes === null || endMinutes === null) {
    return true; // If times unparseable, don't block
  }

  const currentMinutes = hour * 60 + minute;

  if (startMinutes <= endMinutes) {
    // Normal same-day window (e.g. 08:00 to 21:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight window (e.g. 21:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Fetches current VoiceSettings document or sensible defaults.
 */
async function getVoiceSettingsSafe() {
  try {
    let settings = await VoiceSetting.findOne();
    if (!settings) {
      settings = await VoiceSetting.create({
        model: "gemini-2.5-flash-preview-tts",
        englishVoice: "Aoede",
        hindiVoice: "Aoede",
        defaultLanguage: "auto",
        enabled: true
      });
    }
    return settings;
  } catch (err) {
    console.error("[voiceScheduleHelper] Error fetching voice settings:", err.message);
    return {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      defaultLanguage: "auto",
      enabled: true,
      callingSchedule: { enabled: true, allowedDays: VALID_DAYS, startTime: "08:00", endTime: "21:00", timeZone: "Asia/Kolkata" },
      retryRules: { maxRetryAttempts: 3, retryDelayMinutes: 15 },
      reminderDefaults: { defaultTimingMinutes: 15 }
    };
  }
}

module.exports = {
  VALID_DAYS,
  isValidTimeZone,
  timeToMinutes,
  isWithinCallingSchedule,
  getVoiceSettingsSafe
};
