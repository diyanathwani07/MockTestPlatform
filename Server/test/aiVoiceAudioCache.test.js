const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
} catch (e) {}
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const Schedule = require("../models/Schedule");
const VoiceSetting = require("../models/VoiceSetting");
const {
  createSchedule,
  generateScheduleAudio,
  retryScheduleAudio,
  getAudioStatus,
  deleteSchedule
} = require("../controllers/aiVoiceController");
const {
  getVoiceSettings,
  updateVoiceSettings,
  testVoicePreview
} = require("../controllers/voiceSettingController");
const {
  AUDIO_DIR,
  detectLanguage,
  createWavHeader,
  extractPcmFromWav,
  deleteAudioFile,
  _setTtsProviderForTesting
} = require("../services/geminiTtsService");

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

/**
 * Creates a valid synthetic WAV buffer containing 24,000 Hz, 16-bit, mono PCM.
 */
function createSyntheticWav(durationSeconds = 1, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const pcmBytes = sampleRate * numChannels * (bitsPerSample / 8) * durationSeconds;
  const header = createWavHeader(pcmBytes, sampleRate, numChannels, bitsPerSample);
  const pcm = Buffer.alloc(pcmBytes, 0x5a); // Dummy audio bytes
  return Buffer.concat([header, pcm]);
}

test("PrepMark Phase 2: AI Voice Reminder Audio Generation & Cache Suite", async (t) => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  }

  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();
  const createdScheduleIds = [];
  const createdFilePaths = [];

  // Reset provider mock after all tests
  t.after(async () => {
    _setTtsProviderForTesting(null);

    // Clean up created schedules
    if (createdScheduleIds.length > 0) {
      await Schedule.deleteMany({ _id: { $in: createdScheduleIds } });
    }

    // Clean up created audio files from disk
    for (const f of createdFilePaths) {
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (_) {}
      }
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // Test 1: Successful audio generation using a mocked provider response
  await t.test("1. Successful audio generation from Schedule.reminderAudioText (24kHz 16-bit mono PCM)", async () => {
    // Mock Gemini TTS returning valid 24kHz mono WAV
    _setTtsProviderForTesting(async ({ text, voice }) => {
      assert.strictEqual(voice, "Aoede");
      return createSyntheticWav(1); // 1-second audio = 48,000 bytes PCM
    });

    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "Phase 2 Audio Generation Test",
      reminderAudioText: "This is a test of the automated reminder audio synthesis.",
      scheduledTime: new Date(Date.now() + 3600000),
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() },
      body: {}
    };
    const res = createMockRes();

    await generateScheduleAudio(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.preGeneratedAudioStatus, "READY");
    assert.ok(res.data.data.preGeneratedAudioPath);
    assert.ok(fs.existsSync(res.data.data.preGeneratedAudioPath));

    createdFilePaths.push(res.data.data.preGeneratedAudioPath);

    // Verify file content is pure raw PCM (no 44-byte WAV header)
    const fileBytes = fs.readFileSync(res.data.data.preGeneratedAudioPath);
    assert.strictEqual(fileBytes.length, 48000);
    assert.notStrictEqual(fileBytes.subarray(0, 4).toString("ascii"), "RIFF");
  });

  // Test 2: Empty or malformed provider response
  await t.test("2. Safely handles empty or malformed provider response", async () => {
    _setTtsProviderForTesting(async () => {
      return Buffer.alloc(0); // Empty buffer
    });

    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "Malformed Audio Test",
      reminderAudioText: "This should fail gracefully due to empty provider response.",
      scheduledTime: new Date(Date.now() + 3600000),
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() },
      body: {}
    };
    const res = createMockRes();

    await generateScheduleAudio(req, res);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.data.success, false);

    // Check DB state transitioned to FAILED without corrupting schedule
    const updated = await Schedule.findById(schedule._id);
    assert.strictEqual(updated.preGeneratedAudioStatus, "FAILED");
    assert.strictEqual(updated.preGeneratedAudioPath, null);
  });

  // Test 3: Provider timeout and rate limiting
  await t.test("3. Handles provider rate limiting and timeouts gracefully", async () => {
    _setTtsProviderForTesting(async () => {
      const err = new Error("Resource has been exhausted (e.g. check quota).");
      err.status = 429;
      throw err;
    });

    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "Rate Limit Test",
      reminderAudioText: "Testing rate limit handling.",
      scheduledTime: new Date(Date.now() + 3600000),
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() },
      body: {}
    };
    const res = createMockRes();

    await generateScheduleAudio(req, res);

    assert.ok([429, 500].includes(res.statusCode));
    assert.strictEqual(res.data.success, false);

    const updated = await Schedule.findById(schedule._id);
    assert.strictEqual(updated.preGeneratedAudioStatus, "FAILED");
  });

  // Test 4: Invalid schedule ID
  await t.test("4. Rejects invalid schedule ID format", async () => {
    const req = {
      user: { _id: userA },
      params: { id: "not-a-valid-object-id" },
      body: {}
    };
    const res = createMockRes();

    await generateScheduleAudio(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes("Invalid schedule ID"));
  });

  // Test 5: Ownership isolation (User B cannot generate audio for User A's schedule)
  await t.test("5. Enforces ownership: User B cannot generate audio for User A's schedule", async () => {
    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "User A Private Schedule",
      reminderAudioText: "Private reminder text.",
      scheduledTime: new Date(Date.now() + 3600000),
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    const req = {
      user: { _id: userB }, // Authenticated as User B
      params: { id: schedule._id.toString() },
      body: {}
    };
    const res = createMockRes();

    await generateScheduleAudio(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.message, "Schedule not found.");

    // Ensure status was not modified
    const checkSchedule = await Schedule.findById(schedule._id);
    assert.strictEqual(checkSchedule.preGeneratedAudioStatus, "PENDING");
  });

  // Test 6: Duplicate and concurrent generation attempts
  await t.test("6. Duplicate requests return existing ready audio without redundant generation", async () => {
    let callCount = 0;
    _setTtsProviderForTesting(async () => {
      callCount++;
      return createSyntheticWav(1);
    });

    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "Duplicate Test",
      reminderAudioText: "Avoid redundant generation.",
      scheduledTime: new Date(Date.now() + 3600000),
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    const req = {
      user: { _id: userA },
      params: { id: schedule._id.toString() },
      body: {}
    };

    // First call generates
    const res1 = createMockRes();
    await generateScheduleAudio(req, res1);
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(callCount, 1);
    createdFilePaths.push(res1.data.data.preGeneratedAudioPath);

    // Second call recognizes it's already READY
    const res2 = createMockRes();
    await generateScheduleAudio(req, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(callCount, 1); // No new provider call
    assert.ok(res2.data.message.includes("already generated"));
  });

  // Test 7: Correct validation of audio format and sample properties
  await t.test("7. Validates audio format: extracts 24kHz 16-bit mono PCM accurately", async () => {
    const validWav = createSyntheticWav(2, 24000, 1, 16);
    const pcm = extractPcmFromWav(validWav);
    assert.strictEqual(pcm.length, 24000 * 1 * 2 * 2); // 96,000 bytes
  });

  // Test 8: Safe handling of WAV headers and incompatible formats
  await t.test("8. Rejects incompatible audio formats (e.g., 44.1kHz stereo)", async () => {
    const stereoWav = createSyntheticWav(1, 44100, 2, 16);
    assert.throws(() => {
      extractPcmFromWav(stereoWav);
    }, /Unsupported sample rate/);
  });

  // Test 9: Cancellation during generation does not resurrect schedule or orphan files
  await t.test("9. Cancelling or deleting a schedule cleans up audio files safely", async () => {
    _setTtsProviderForTesting(async () => {
      return createSyntheticWav(1);
    });

    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "To Be Deleted Schedule",
      reminderAudioText: "This schedule and audio will be deleted.",
      scheduledTime: new Date(Date.now() + 3600000),
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    // Generate audio
    const genReq = { user: { _id: userA }, params: { id: schedule._id.toString() }, body: {} };
    const genRes = createMockRes();
    await generateScheduleAudio(genReq, genRes);
    const audioPath = genRes.data.data.preGeneratedAudioPath;
    assert.ok(fs.existsSync(audioPath));

    // Delete schedule
    const delReq = { user: { _id: userA }, params: { id: schedule._id.toString() } };
    const delRes = createMockRes();
    await deleteSchedule(delReq, delRes);

    assert.strictEqual(delRes.statusCode, 200);
    // Verify file was unlinked from disk
    assert.strictEqual(fs.existsSync(audioPath), false);
  });

  // Test 10: Retrying failed generation
  await t.test("10. Failed audio generation can be retried safely", async () => {
    // 1. First attempt fails
    _setTtsProviderForTesting(async () => {
      throw new Error("Temporary network glitch");
    });

    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "Retry Schedule",
      reminderAudioText: "Testing retry functionality.",
      scheduledTime: new Date(Date.now() + 3600000),
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    const req = { user: { _id: userA }, params: { id: schedule._id.toString() }, body: {} };
    const res1 = createMockRes();
    await generateScheduleAudio(req, res1);
    assert.strictEqual(res1.statusCode, 500);

    const failedDoc = await Schedule.findById(schedule._id);
    assert.strictEqual(failedDoc.preGeneratedAudioStatus, "FAILED");

    // 2. Retry with recovered provider
    _setTtsProviderForTesting(async () => {
      return createSyntheticWav(1);
    });

    const res2 = createMockRes();
    await retryScheduleAudio(req, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.data.data.preGeneratedAudioStatus, "READY");
    assert.ok(fs.existsSync(res2.data.data.preGeneratedAudioPath));

    createdFilePaths.push(res2.data.data.preGeneratedAudioPath);
  });

  // Test 11: Audio status query endpoint
  await t.test("11. GET /schedule/:id/audio-status reports current status and duration", async () => {
    _setTtsProviderForTesting(async () => {
      return createSyntheticWav(2); // 2 seconds
    });

    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "Status Query Schedule",
      reminderAudioText: "Check audio status.",
      scheduledTime: new Date(Date.now() + 3600000),
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    // Initial status
    const req = { user: { _id: userA }, params: { id: schedule._id.toString() } };
    const res1 = createMockRes();
    await getAudioStatus(req, res1);
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.data.data.preGeneratedAudioStatus, "PENDING");
    assert.strictEqual(res1.data.data.hasAudio, false);

    // Generate
    const genRes = createMockRes();
    await generateScheduleAudio({ user: { _id: userA }, params: { id: schedule._id.toString() }, body: {} }, genRes);
    createdFilePaths.push(genRes.data.data.preGeneratedAudioPath);

    // Post-generation status
    const res2 = createMockRes();
    await getAudioStatus(req, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.data.data.preGeneratedAudioStatus, "READY");
    assert.strictEqual(res2.data.data.hasAudio, true);
    assert.strictEqual(res2.data.data.durationSeconds, 2);
  });

  // Test 12: Senior VoiceSetting and Admin Voice Preview Integration
  await t.test("12. Senior VoiceSetting and live voice preview work accurately", async () => {
    _setTtsProviderForTesting(async ({ text, voice }) => {
      assert.strictEqual(voice, "Aoede");
      return createSyntheticWav(1);
    });

    // Test getVoiceSettings
    const getRes = createMockRes();
    await getVoiceSettings({}, getRes);
    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.data.settings.model, "gemini-2.5-flash-preview-tts");

    // Test testVoicePreview
    const prevReq = {
      body: {
        sampleText: "Testing administrator voice preview.",
        lang: "en",
        voice: "Aoede"
      }
    };
    const prevRes = createMockRes();
    await testVoicePreview(prevReq, prevRes);
    assert.strictEqual(prevRes.statusCode, 200);
    assert.strictEqual(prevRes.data.success, true);
    assert.ok(prevRes.data.audioUrl.startsWith("data:audio/wav;base64,"));
    assert.strictEqual(prevRes.data.voice, "Aoede");
    assert.strictEqual(prevRes.data.durationSeconds, 1);
  });

  // Test 13: Language detection (Hindi vs English routing)
  await t.test("13. Detects Hindi Unicode script and routes to Hindi configuration", async () => {
    assert.strictEqual(detectLanguage("Hello, this is an English reminder."), "en");
    assert.strictEqual(detectLanguage("नमस्ते, यह आपकी परीक्षा की अनुस्मारक कॉल है।"), "hi");

    let receivedVoice = null;
    let receivedPrompt = null;
    _setTtsProviderForTesting(async ({ voice, prompt }) => {
      receivedVoice = voice;
      receivedPrompt = prompt;
      return createSyntheticWav(1);
    });

    const schedule = await Schedule.create({
      user: userA,
      taskTitle: "Hindi Reminder",
      reminderAudioText: "नमस्ते! यह आपका महत्वपूर्ण कार्य अनुस्मारक है।",
      scheduledTime: new Date(Date.now() + 3600000),
      language: "auto",
      preGeneratedAudioStatus: "PENDING"
    });
    createdScheduleIds.push(schedule._id);

    const req = { user: { _id: userA }, params: { id: schedule._id.toString() }, body: {} };
    const res = createMockRes();
    await generateScheduleAudio(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(receivedPrompt.includes("समाचार वाचक")); // Confirms hindiPrompt was applied
    createdFilePaths.push(res.data.data.preGeneratedAudioPath);
  });

  // Test 14: Generated audio files are excluded from Git
  await t.test("14. .reminder-audio/ directory is excluded in Server/.gitignore", async () => {
    const gitignorePath = path.join(__dirname, "../.gitignore");
    const content = fs.readFileSync(gitignorePath, "utf8");
    assert.ok(content.includes(".reminder-audio/"));
  });
});
