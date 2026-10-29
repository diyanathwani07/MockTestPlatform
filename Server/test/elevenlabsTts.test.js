const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const VoiceSetting = require("../models/VoiceSetting");
const {
  getVoiceSettings,
  updateVoiceSettings,
  testVoicePreview,
  getElevenLabsVoices
} = require("../controllers/voiceSettingController");
const elevenlabsTtsService = require("../services/elevenlabsTtsService");
const geminiTtsService = require("../services/geminiTtsService");

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

test("ElevenLabs TTS Integration & Voice Settings Tests", async (t) => {
  let inMemoryDoc = null;

  const originalFindOne = VoiceSetting.findOne;
  const originalCreate = VoiceSetting.create;
  const originalEnvKey = process.env.ELEVENLABS_API_KEY;

  t.after(() => {
    VoiceSetting.findOne = originalFindOne;
    VoiceSetting.create = originalCreate;
    elevenlabsTtsService._setElevenLabsTtsProviderForTesting(null);
    elevenlabsTtsService._setElevenLabsVoicesProviderForTesting(null);
    geminiTtsService._setTtsProviderForTesting(null);
    if (originalEnvKey !== undefined) {
      process.env.ELEVENLABS_API_KEY = originalEnvKey;
    } else {
      delete process.env.ELEVENLABS_API_KEY;
    }
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
  // 1. DEFAULT PROVIDER & ELEVENLABS METADATA
  // ==========================================
  await t.test("1. GET /api/voice-settings returns ttsProvider default 'gemini' and ElevenLabs metadata", async () => {
    inMemoryDoc = null;
    const req = {};
    const res = createMockRes();

    await getVoiceSettings(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.settings.ttsProvider, "gemini", "Default TTS provider must be gemini");
    assert.equal(typeof res.data.hasElevenLabsKey, "boolean");
    assert.ok(Array.isArray(res.data.supportedElevenLabsModels));
    assert.ok(res.data.supportedElevenLabsModels.length > 0);
    assert.ok(Array.isArray(res.data.defaultElevenLabsVoices));
    assert.ok(res.data.defaultElevenLabsVoices.length > 0);

    // Verify key is never leaked
    const jsonStr = JSON.stringify(res.data);
    assert.equal(jsonStr.includes("sk_"), false, "Secret API keys must never appear in response");
  });

  // ==========================================
  // 2. SAVING VALID ELEVENLABS SETTINGS
  // ==========================================
  await t.test("2. PUT /api/voice-settings saves valid ElevenLabs provider configuration", async () => {
    const adminId = new mongoose.Types.ObjectId();
    inMemoryDoc = {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      ttsProvider: "gemini",
      elevenlabs: {
        modelId: "eleven_multilingual_v2",
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        stability: 0.5,
        similarityBoost: 0.75,
        speed: 1.0
      },
      save: async function () {
        return this;
      },
      populate: async function () {
        return this;
      }
    };

    const req = {
      user: { _id: adminId, name: "Admin User", email: "admin@prepmark.com" },
      body: {
        ttsProvider: "elevenlabs",
        elevenlabs: {
          modelId: "eleven_flash_v2_5",
          voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah
          stability: 0.65,
          similarityBoost: 0.8,
          speed: 1.15
        }
      }
    };
    const res = createMockRes();

    await updateVoiceSettings(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.settings.ttsProvider, "elevenlabs");
    assert.equal(res.data.settings.elevenlabs.modelId, "eleven_flash_v2_5");
    assert.equal(res.data.settings.elevenlabs.voiceId, "EXAVITQu4vr4xnSDxMaL");
    assert.equal(res.data.settings.elevenlabs.stability, 0.65);
    assert.equal(res.data.settings.elevenlabs.similarityBoost, 0.8);
    assert.equal(res.data.settings.elevenlabs.speed, 1.15);
  });

  // ==========================================
  // 3. VALIDATION REJECTION ON OUT-OF-BOUNDS ELEVENLABS PARAMS
  // ==========================================
  await t.test("3. PUT /api/voice-settings rejects invalid ttsProvider and out-of-range tuning values", async () => {
    const adminUser = { _id: new mongoose.Types.ObjectId() };

    // Invalid provider
    const res1 = createMockRes();
    await updateVoiceSettings({ user: adminUser, body: { ttsProvider: "azure_speech" } }, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.data.error, /Invalid ttsProvider|Supported providers/i);

    // Invalid stability > 1.0
    const res2 = createMockRes();
    await updateVoiceSettings({
      user: adminUser,
      body: {
        elevenlabs: { stability: 1.5 }
      }
    }, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.data.error, /stability must be a number between 0.0 and 1.0/);

    // Invalid speed < 0.5
    const res3 = createMockRes();
    await updateVoiceSettings({
      user: adminUser,
      body: {
        elevenlabs: { speed: 0.2 }
      }
    }, res3);
    assert.equal(res3.statusCode, 400);
    assert.match(res3.data.error, /speed must be a number between 0\.5 and 2\.0/);
  });

  // ==========================================
  // 4. PREVIEW GENERATION WITH MOCKED ELEVENLABS
  // ==========================================
  await t.test("4. testVoicePreview with provider 'elevenlabs' generates valid MP3 preview", async () => {
    let mockSynthesizeCalled = false;
    let receivedPayload = null;

    elevenlabsTtsService._setElevenLabsTtsProviderForTesting(async (params) => {
      mockSynthesizeCalled = true;
      receivedPayload = params;
      return Buffer.from("ID3-MOCK-ELEVENLABS-MP3-AUDIO");
    });

    const adminUser = { _id: new mongoose.Types.ObjectId() };
    const req = {
      user: adminUser,
      body: {
        provider: "elevenlabs",
        sampleText: "Hello PrepMark, this is an ElevenLabs preview test.",
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        modelId: "eleven_multilingual_v2",
        stability: 0.6,
        similarityBoost: 0.75,
        speed: 1.05
      }
    };
    const res = createMockRes();

    await testVoicePreview(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.provider, "elevenlabs");
    assert.equal(mockSynthesizeCalled, true);
    assert.equal(receivedPayload.text, "Hello PrepMark, this is an ElevenLabs preview test.");
    assert.equal(receivedPayload.voiceId, "EXAVITQu4vr4xnSDxMaL");
    assert.equal(receivedPayload.modelId, "eleven_multilingual_v2");
    assert.equal(receivedPayload.stability, 0.6);
    assert.equal(receivedPayload.speed, 1.05);

    // Audio format check
    assert.ok(res.data.audioUrl.startsWith("data:audio/mpeg;base64,"));
  });

  // ==========================================
  // 5. MISSING API KEY SAFELY HANDLED
  // ==========================================
  await t.test("5. ElevenLabs preview safely fails with clear 503 error when ELEVENLABS_API_KEY is not set", async () => {
    // Unset mock and unset key
    elevenlabsTtsService._setElevenLabsTtsProviderForTesting(null);
    delete process.env.ELEVENLABS_API_KEY;

    const adminUser = { _id: new mongoose.Types.ObjectId() };
    const req = {
      user: adminUser,
      body: {
        provider: "elevenlabs",
        sampleText: "Testing without key",
        voiceId: "21m00Tcm4TlvDq8ikWAM"
      }
    };
    const res = createMockRes();

    await testVoicePreview(req, res);

    assert.equal(res.statusCode, 503);
    assert.match(res.data.error, /ELEVENLABS_API_KEY is not configured/);
    assert.equal(res.data.success, false);
  });

  // ==========================================
  // 6. GET ELEVENLABS VOICES ENDPOINT
  // ==========================================
  await t.test("6. getElevenLabsVoices returns fallback list when key is missing and fetched list when mocked", async () => {
    // A. Without key or provider mock -> returns default fallback voices
    elevenlabsTtsService._setElevenLabsVoicesProviderForTesting(null);
    delete process.env.ELEVENLABS_API_KEY;

    const res1 = createMockRes();
    await getElevenLabsVoices({}, res1);

    assert.equal(res1.statusCode, 200);
    assert.equal(res1.data.success, true);
    assert.ok(Array.isArray(res1.data.voices));
    assert.ok(res1.data.voices.length > 0);

    // B. With mocked listVoices provider
    elevenlabsTtsService._setElevenLabsVoicesProviderForTesting(async () => [
      { id: "custom_1", name: "Custom Voice Alpha", category: "cloned", gender: "female" }
    ]);

    const res2 = createMockRes();
    await getElevenLabsVoices({}, res2);

    assert.equal(res2.statusCode, 200);
    assert.equal(res2.data.success, true);
    assert.equal(res2.data.voices[0].id, "custom_1");
    assert.equal(res2.data.voices[0].name, "Custom Voice Alpha");
  });

  // ==========================================
  // 7. GEMINI REGRESSION CHECK
  // ==========================================
  await t.test("7. Gemini preview continues to function when provider is 'gemini' or omitted", async () => {
    geminiTtsService._setTtsProviderForTesting(async () => {
      // Return 24kHz mono PCM buffer
      return Buffer.alloc(1600);
    });

    const adminUser = { _id: new mongoose.Types.ObjectId() };
    const req = {
      user: adminUser,
      body: {
        provider: "gemini",
        sampleText: "Gemini regression test",
        voice: "Aoede",
        lang: "en"
      }
    };
    const res = createMockRes();

    await testVoicePreview(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.audioUrl.startsWith("data:audio/wav;base64,"));
  });

  // ==========================================
  // 8. REMINDER PCM GENERATION ROUTING
  // ==========================================
  await t.test("8. generateReminderPcm delegates correctly based on ttsProvider", async () => {
    let elevenlabsCalled = false;
    let geminiCalled = false;

    elevenlabsTtsService._setElevenLabsTtsProviderForTesting(async () => {
      elevenlabsCalled = true;
      return Buffer.alloc(4800);
    });

    geminiTtsService._setTtsProviderForTesting(async () => {
      geminiCalled = true;
      return Buffer.alloc(4800);
    });

    // Test ElevenLabs routing
    inMemoryDoc = {
      ttsProvider: "elevenlabs",
      elevenlabs: {
        modelId: "eleven_flash_v2_5",
        voiceId: "EXAVITQu4vr4xnSDxMaL"
      },
      enabled: true
    };

    await geminiTtsService.generateReminderPcm({
      scheduleId: new mongoose.Types.ObjectId().toString(),
      text: "Reminder for upcoming exam"
    });
    assert.equal(elevenlabsCalled, true);
    assert.equal(geminiCalled, false);

    // Reset and test Gemini routing
    elevenlabsCalled = false;
    geminiCalled = false;
    inMemoryDoc = {
      ttsProvider: "gemini",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      enabled: true
    };

    await geminiTtsService.generateReminderPcm({
      scheduleId: new mongoose.Types.ObjectId().toString(),
      text: "Reminder for upcoming exam"
    });
    assert.equal(elevenlabsCalled, false);
    assert.equal(geminiCalled, true);
  });
});
