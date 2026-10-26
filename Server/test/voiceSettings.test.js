const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const VoiceSetting = require("../models/VoiceSetting");
const Schedule = require("../models/Schedule");
const Call = require("../models/Call");
const { getVoiceSettings, updateVoiceSettings, testVoicePreview } = require("../controllers/voiceSettingController");
const { createSchedule } = require("../controllers/aiVoiceController");
const { dispatchDueSchedules } = require("../services/aiVoiceSchedulerService");
const {
  isWithinCallingSchedule,
  isValidTimeZone,
  timeToMinutes
} = require("../services/voiceScheduleHelper");

function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
}

test("Voice Settings Integration & Runtime Enforcement Tests", async (t) => {
  let inMemoryDoc = null;

  const originalFindOne = VoiceSetting.findOne;
  const originalCreate = VoiceSetting.create;

  t.after(() => {
    VoiceSetting.findOne = originalFindOne;
    VoiceSetting.create = originalCreate;
  });

  VoiceSetting.findOne = function () {
    return {
      populate(field, select) {
        return Promise.resolve(inMemoryDoc);
      },
      then(resolve) {
        return resolve(inMemoryDoc);
      }
    };
  };

  VoiceSetting.create = async function (data) {
    inMemoryDoc = {
      ...data,
      save: async function () {
        return this;
      },
      populate: async function () {
        return this;
      }
    };
    return inMemoryDoc;
  };

  // ==========================================
  // 1. SETTINGS PERSISTENCE & DEFAULTS
  // ==========================================
  await t.test("1. GET /api/voice-settings returns defaults and populates fields", async () => {
    inMemoryDoc = null;
    const req = {};
    const res = createMockRes();

    await getVoiceSettings(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.settings.model, "gemini-2.5-flash-preview-tts");
    assert.equal(res.data.settings.englishVoice, "Aoede");
    assert.equal(res.data.settings.hindiVoice, "Aoede");
    assert.equal(res.data.settings.callingSchedule.enabled, true);
    assert.equal(res.data.settings.callingSchedule.allowedDays.length, 7);
    assert.equal(res.data.settings.retryRules.maxRetryAttempts, 3);
    assert.equal(res.data.settings.reminderDefaults.defaultTimingMinutes, 15);
  });

  await t.test("2. PUT /api/voice-settings saves valid configuration and records updatedBy", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const mockAdmin = {
      _id: adminId,
      name: "Super Admin",
      email: "superadmin@prepmark.com"
    };

    inMemoryDoc = {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      defaultLanguage: "auto",
      callingSchedule: {
        enabled: true,
        allowedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        startTime: "08:00",
        endTime: "21:00",
        timeZone: "Asia/Kolkata"
      },
      retryRules: { maxRetryAttempts: 3, retryDelayMinutes: 15 },
      reminderDefaults: { defaultTimingMinutes: 15 },
      enabled: true,
      updatedBy: null,
      save: async function () { return this; },
      populate: async function () {
        this.updatedBy = { _id: mockAdmin._id, name: mockAdmin.name, email: mockAdmin.email };
        return this;
      }
    };

    const updatePayload = {
      englishVoice: "Charon",
      hindiVoice: "Kore",
      defaultLanguage: "hi",
      callingSchedule: {
        enabled: true,
        allowedDays: ["Monday", "Wednesday", "Friday"],
        startTime: "09:00",
        endTime: "18:00",
        timeZone: "Asia/Kolkata"
      },
      retryRules: {
        maxRetryAttempts: 4,
        retryDelayMinutes: 20
      },
      reminderDefaults: {
        defaultTimingMinutes: 30,
        defaultTemplateEnglish: "Exam reminder: {taskTitle}",
        defaultTemplateHindi: "परीक्षा स्मरण: {taskTitle}"
      },
      enabled: true
    };

    const req = { user: mockAdmin, body: updatePayload };
    const res = createMockRes();

    await updateVoiceSettings(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.settings.englishVoice, "Charon");
    assert.equal(res.data.settings.hindiVoice, "Kore");
    assert.equal(res.data.settings.retryRules.maxRetryAttempts, 4);
    assert.equal(res.data.settings.retryRules.retryDelayMinutes, 20);
    assert.equal(res.data.settings.reminderDefaults.defaultTimingMinutes, 30);
    assert.equal(res.data.settings.updatedBy.email, "superadmin@prepmark.com");
  });

  // ==========================================
  // 2. SECURITY & STRICT INPUT VALIDATION
  // ==========================================
  await t.test("3. PUT /api/voice-settings rejects out-of-bounds retry rules with 400 (no silent clamping)", async () => {
    const res1 = createMockRes();
    await updateVoiceSettings({ body: { retryRules: { maxRetryAttempts: 10 } } }, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.data.error, /maxRetryAttempts must be an integer between 1 and 5/);

    const res2 = createMockRes();
    await updateVoiceSettings({ body: { retryRules: { retryDelayMinutes: 0 } } }, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.data.error, /retryDelayMinutes must be an integer between 1 and 60/);

    const res3 = createMockRes();
    await updateVoiceSettings({ body: { reminderDefaults: { defaultTimingMinutes: 2000 } } }, res3);
    assert.equal(res3.statusCode, 400);
    assert.match(res3.data.error, /defaultTimingMinutes must be an integer between 0 and 1440/);
  });

  await t.test("4. PUT /api/voice-settings rejects unsupported voice names with 400", async () => {
    const res = createMockRes();
    await updateVoiceSettings({ body: { englishVoice: "NonExistentVoice" } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.data.error, /Invalid englishVoice/);
  });

  await t.test("5. PUT /api/voice-settings validates timeZone and time formats", async () => {
    const res1 = createMockRes();
    await updateVoiceSettings({ body: { callingSchedule: { timeZone: "Invalid/Fake_Zone" } } }, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.data.error, /Invalid timeZone/);

    const res2 = createMockRes();
    await updateVoiceSettings({ body: { callingSchedule: { startTime: "25:99" } } }, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.data.error, /startTime must be in HH:mm 24-hour format/);

    const res3 = createMockRes();
    await updateVoiceSettings({ body: { callingSchedule: { allowedDays: ["NotADay"] } } }, res3);
    assert.equal(res3.statusCode, 400);
    assert.match(res3.data.error, /Invalid day 'NotADay'/);
  });

  // ==========================================
  // 3. CALLING SCHEDULE & TIMEZONE BOUNDARIES
  // ==========================================
  await t.test("6. isWithinCallingSchedule handles regular windows, overnight windows, and timezone conversions", async () => {
    // A. Regular window: 08:00 - 21:00 IST
    const scheduleNormal = {
      enabled: true,
      allowedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      startTime: "08:00",
      endTime: "21:00",
      timeZone: "Asia/Kolkata"
    };

    // 2026-10-26 is a Monday. 04:30 UTC = 10:00 IST (Within window)
    const mondayMorningUtc = new Date("2026-10-26T04:30:00Z");
    assert.equal(isWithinCallingSchedule(scheduleNormal, mondayMorningUtc), true);

    // 2026-10-26 17:00 UTC = 22:30 IST (Outside window)
    const mondayNightUtc = new Date("2026-10-26T17:00:00Z");
    assert.equal(isWithinCallingSchedule(scheduleNormal, mondayNightUtc), false);

    // 2026-10-25 is a Sunday. 04:30 UTC = 10:00 IST (Outside allowed days)
    const sundayMorningUtc = new Date("2026-10-25T04:30:00Z");
    assert.equal(isWithinCallingSchedule(scheduleNormal, sundayMorningUtc), false);

    // B. Overnight window: 21:00 - 06:00 IST (startTime > endTime)
    const scheduleOvernight = {
      enabled: true,
      allowedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      startTime: "21:00",
      endTime: "06:00",
      timeZone: "Asia/Kolkata"
    };

    // 2026-10-26 17:00 UTC = 22:30 IST (Within overnight window)
    assert.equal(isWithinCallingSchedule(scheduleOvernight, mondayNightUtc), true);

    // 2026-10-26 04:30 UTC = 10:00 IST (Outside overnight window)
    assert.equal(isWithinCallingSchedule(scheduleOvernight, mondayMorningUtc), false);

    // C. When schedule is disabled, all times are permitted
    const scheduleDisabled = { enabled: false };
    assert.equal(isWithinCallingSchedule(scheduleDisabled, mondayNightUtc), true);
  });

  // ==========================================
  // 4. MASTER SUBSYSTEM SWITCH RUNTIME ENFORCEMENT
  // ==========================================
  await t.test("7. Master Switch disabled prevents new scheduled dispatches without deleting records", async () => {
    // Set in-memory VoiceSettings to disabled
    inMemoryDoc = {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      enabled: false // Master switch paused!
    };

    let scheduleQueryExecuted = false;
    const originalScheduleFind = Schedule.find;
    Schedule.find = function () {
      scheduleQueryExecuted = true;
      return {
        sort: () => ({ limit: () => Promise.resolve([]) })
      };
    };

    const stats = await dispatchDueSchedules({ now: new Date() });

    Schedule.find = originalScheduleFind;

    // Must return immediately without scanning or modifying schedules
    assert.equal(scheduleQueryExecuted, false);
    assert.equal(stats.scanned, 0);
    assert.equal(stats.dispatched, 0);
  });

  await t.test("8. Master Switch disabled prevents student schedule creation with 403 Forbidden", async () => {
    inMemoryDoc = {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      enabled: false // Subsystem paused by admin
    };

    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {
        taskTitle: "Exam Math Reminder",
        scheduledTime: new Date(Date.now() + 3600000).toISOString()
      }
    };
    const res = createMockRes();

    await createSchedule(req, res);

    assert.equal(res.statusCode, 403);
    assert.match(res.data.message, /disabled by administrator/i);
  });

  // ==========================================
  // 5. CALLING SCHEDULE AT SCHEDULING TIME
  // ==========================================
  await t.test("9. createSchedule enforces permitted calling window and rejects out-of-window requests with 400", async () => {
    inMemoryDoc = {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      enabled: true,
      callingSchedule: {
        enabled: true,
        allowedDays: ["Monday"],
        startTime: "09:00",
        endTime: "18:00",
        timeZone: "Asia/Kolkata"
      }
    };

    // Scheduled for Sunday (not allowed)
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {
        taskTitle: "Math Quiz",
        scheduledTime: "2026-11-01T10:00:00.000Z" // Sunday
      }
    };
    const res = createMockRes();

    await createSchedule(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.data.message, /falls outside permitted calling schedule/i);
  });

  // ==========================================
  // 6. RETRY RULES RUNTIME ENFORCEMENT
  // ==========================================
  await t.test("10. dispatchDueSchedules enforces max retry attempts and backoff delay from settings", async () => {
    inMemoryDoc = {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      enabled: true,
      callingSchedule: { enabled: false }, // bypass schedule window for test
      retryRules: {
        maxRetryAttempts: 2, // strictly 2 attempts max
        retryDelayMinutes: 25 // 25 minute backoff
      }
    };

    let queriedMaxAttempts = null;
    let claimedSchedule = null;
    let updatedFailureFields = null;

    const originalScheduleFind = Schedule.find;
    const originalScheduleFindOneAndUpdate = Schedule.findOneAndUpdate;

    Schedule.find = function (query) {
      queriedMaxAttempts = query.dispatchAttempts?.$lt;
      return {
        sort: () => ({
          limit: () =>
            Promise.resolve([
              {
                _id: new mongoose.Types.ObjectId(),
                user: new mongoose.Types.ObjectId(),
                scheduledTime: new Date(),
                preGeneratedAudioStatus: "READY",
                preGeneratedAudioPath: "Server/.reminder-audio/test.pcm",
                dispatchAttempts: 1
              }
            ])
        })
      };
    };

    let callCount = 0;
    Schedule.findOneAndUpdate = function (query, update) {
      callCount++;
      if (callCount === 1) {
        // Initial claim
        claimedSchedule = {
          _id: query._id,
          user: new mongoose.Types.ObjectId(),
          preGeneratedAudioPath: "Server/.reminder-audio/test.pcm",
          dispatchAttempts: 2 // Max reached
        };
        return Promise.resolve(claimedSchedule);
      } else if (callCount === 2) {
        // Simulate unexpected database error during step 6 transition to DISPATCHED
        throw new Error("Simulated database failure during dispatch transition");
      } else {
        // Error handler update
        updatedFailureFields = update.$set;
        return Promise.resolve(claimedSchedule);
      }
    };

    const originalFsExistsSync = require("fs").existsSync;
    require("fs").existsSync = () => true;

    const stats = await dispatchDueSchedules({
      now: new Date(),
      // Simulate socket emitter failure to trigger catch branch
      socketEmitter: () => {
        throw new Error("Simulated connection timeout");
      },
      fcmSender: () => Promise.resolve({ sent: false })
    });

    require("fs").existsSync = originalFsExistsSync;
    Schedule.find = originalScheduleFind;
    Schedule.findOneAndUpdate = originalScheduleFindOneAndUpdate;

    // Verify query honored configured max attempts (2)
    assert.equal(queriedMaxAttempts, 2);
    // Verify that reaching max attempts transitions to FAILED
    assert.ok(updatedFailureFields);
    assert.equal(updatedFailureFields.status, "FAILED");
    assert.match(updatedFailureFields.lastDispatchError, /Exceeded maximum retry attempts \(2\)/);
  });

  // ==========================================
  // 7. TEST AUDIO ENDPOINT SECURITY & RATE LIMITING
  // ==========================================
  await t.test("11. testVoicePreview validates inputs and enforces rate limiting", async () => {
    // A. Rejects empty sampleText
    const res1 = createMockRes();
    await testVoicePreview({ body: { sampleText: "   " } }, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.data.error, /sampleText is required/);

    // B. Rejects invalid voice
    const res2 = createMockRes();
    await testVoicePreview({ body: { sampleText: "Hello", voice: "HackerVoice" } }, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.data.error, /Invalid voice/);

    // C. Rejects invalid language
    const res3 = createMockRes();
    await testVoicePreview({ body: { sampleText: "Hello", lang: "french" } }, res3);
    assert.equal(res3.statusCode, 400);
    assert.match(res3.data.error, /Invalid lang parameter/);

    // D. Rate limiter triggers after 10 requests per minute
    const testAdmin = { _id: new mongoose.Types.ObjectId() };
    for (let i = 0; i < 10; i++) {
      const res = createMockRes();
      await testVoicePreview({ user: testAdmin, body: { sampleText: "Rate test" } }, res);
      // Calls will pass or fail with tts error, but not 429
      assert.notEqual(res.statusCode, 429);
    }

    // 11th request must be rejected with 429
    const res429 = createMockRes();
    await testVoicePreview({ user: testAdmin, body: { sampleText: "Rate test overflow" } }, res429);
    assert.equal(res429.statusCode, 429);
    assert.match(res429.data.error, /Too many voice preview requests/);
  });

  // ==========================================
  // 8. MID-FLIGHT CLAIM HALT WHEN SERVICE DISABLED
  // ==========================================
  await t.test("12. An already-claimed job is safely halted and reverted to PENDING if admin disables service", async () => {
    // Start with enabled=true so candidate is scanned, but toggle to disabled before dispatch
    let stateCalls = 0;
    const originalVoiceSettingFindOne = VoiceSetting.findOne;
    VoiceSetting.findOne = function () {
      stateCalls++;
      // First call (sweep start) enabled: true; Second call (claimed boundary check) enabled: false!
      const isEnabled = stateCalls === 1;
      return {
        populate: () => Promise.resolve({ enabled: isEnabled }),
        then: (resolve) => resolve({ enabled: isEnabled })
      };
    };

    let revertedFields = null;
    let attemptDecrement = null;

    const originalScheduleFind = Schedule.find;
    const originalScheduleFindOneAndUpdate = Schedule.findOneAndUpdate;

    Schedule.find = function () {
      return {
        sort: () => ({
          limit: () =>
            Promise.resolve([
              {
                _id: new mongoose.Types.ObjectId(),
                user: new mongoose.Types.ObjectId(),
                scheduledTime: new Date(),
                preGeneratedAudioStatus: "READY",
                preGeneratedAudioPath: "Server/.reminder-audio/test.pcm",
                dispatchAttempts: 0
              }
            ])
        })
      };
    };

    Schedule.findOneAndUpdate = function (query, update) {
      if (update.$inc && update.$inc.dispatchAttempts === 1) {
        // Initial claim
        return Promise.resolve({
          _id: query._id,
          user: new mongoose.Types.ObjectId(),
          preGeneratedAudioPath: "Server/.reminder-audio/test.pcm",
          dispatchAttempts: 1
        });
      }
      if (update.$set && update.$set.status === "PENDING") {
        // Mid-flight halt & revert to PENDING
        revertedFields = update.$set;
        attemptDecrement = update.$inc?.dispatchAttempts;
        return Promise.resolve({ _id: query._id, status: "PENDING" });
      }
      return Promise.resolve(null);
    };

    let signalSent = false;
    const stats = await dispatchDueSchedules({
      now: new Date(),
      socketEmitter: () => { signalSent = true; },
      fcmSender: () => { signalSent = true; return Promise.resolve({ sent: true }); }
    });

    VoiceSetting.findOne = originalVoiceSettingFindOne;
    Schedule.find = originalScheduleFind;
    Schedule.findOneAndUpdate = originalScheduleFindOneAndUpdate;

    // Verify signal was NOT sent
    assert.equal(signalSent, false);
    // Verify claimed job was reverted to PENDING with attempt refunded
    assert.ok(revertedFields);
    assert.equal(revertedFields.status, "PENDING");
    assert.equal(attemptDecrement, -1);
    assert.match(revertedFields.lastDispatchError, /service disabled by administrator/i);
  });

  // ==========================================
  // 9. ERROR SANITIZATION & SECRET PROTECTION
  // ==========================================
  await t.test("13. testVoicePreview redacts API keys and sensitive URLs in error responses", async () => {
    const { _setTtsProviderForTesting } = require("../services/geminiTtsService");

    // Simulate an external SDK error that leaked an API key in query parameters
    _setTtsProviderForTesting(() => {
      throw new Error("Google Gen AI failed: Request failed with status 400 for url https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyA1234567890SecretKey");
    });

    const res = createMockRes();
    await testVoicePreview({
      user: { _id: new mongoose.Types.ObjectId() },
      body: { sampleText: "Secret leak test" }
    }, res);

    _setTtsProviderForTesting(null);

    assert.equal(res.statusCode, 500);
    // Key must never leak in client response
    assert.doesNotMatch(res.data.error, /AIzaSyA1234567890SecretKey/);
    assert.match(res.data.error, /TTS service configuration error/);
  });
});
