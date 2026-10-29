const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const AUDIO_DIR = path.resolve(__dirname, "../.reminder-audio");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Module-level mock hook for isolated unit tests without external network calls
let _mockElevenLabsProvider = null;
let _mockElevenLabsVoicesProvider = null;

function _setElevenLabsTtsProviderForTesting(fn) {
  _mockElevenLabsProvider = fn;
}

function _setElevenLabsVoicesProviderForTesting(fn) {
  _mockElevenLabsVoicesProvider = fn;
}

// In-memory cache for audio samples (capped at 50 items)
const _elevenlabsSampleCache = new Map();
function getSampleCacheKey(text, voiceId, modelId, stability, similarityBoost, speed) {
  return crypto
    .createHash("md5")
    .update(`${text}|${voiceId}|${modelId}|${stability}|${similarityBoost}|${speed}`)
    .digest("hex");
}

// Cached voices list from ElevenLabs API (10 minutes TTL)
let _cachedVoices = null;
let _cachedVoicesTimestamp = 0;
const VOICES_CACHE_TTL_MS = 10 * 60 * 1000;

const DEFAULT_ELEVENLABS_VOICES = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    gender: "Female",
    description: "Calm, professional, articulate broadcasting tone (Recommended Default)"
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    gender: "Male",
    description: "Deep, conversational, natural educator voice"
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    gender: "Male",
    description: "Clear, crisp narration and academic voice"
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    gender: "Female",
    description: "Warm, supportive, engaging tone"
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    gender: "Female",
    description: "Energetic, dynamic, enthusiastic announcement voice"
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    gender: "Female",
    description: "Young, clear, vibrant student advisor voice"
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    gender: "Male",
    description: "Deep, confident, steady reminder delivery"
  },
  {
    id: "VR6AewLTigWG4nxSOuka",
    name: "Arnold",
    gender: "Male",
    description: "Authoritative, crisp, formal broadcaster"
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    gender: "Male",
    description: "Dynamic, versatile, relatable tone"
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    gender: "Male",
    description: "Warm British accent, engaging narrator"
  }
];

const SUPPORTED_ELEVENLABS_MODELS = [
  {
    id: "eleven_multilingual_v2",
    name: "Eleven Multilingual v2",
    description: "State-of-the-art multilingual model (English, Hindi, and 27+ languages)",
    isDefault: true
  },
  {
    id: "eleven_flash_v2_5",
    name: "Eleven Flash v2.5",
    description: "Ultra-fast generation with low latency",
    isDefault: false
  },
  {
    id: "eleven_turbo_v2_5",
    name: "Eleven Turbo v2.5",
    description: "High speed with rich vocal quality",
    isDefault: false
  },
  {
    id: "eleven_monolingual_v1",
    name: "Eleven English v1",
    description: "Classic English-only synthesis model",
    isDefault: false
  }
];

/**
 * Sanitizes upstream error messages so API keys, private tokens, or raw paths never leak.
 */
function sanitizeErrorMessage(err) {
  let msg = err?.message || String(err || "Unknown error");
  if (err?.response?.data) {
    try {
      const data = Buffer.isBuffer(err.response.data)
        ? JSON.parse(err.response.data.toString("utf8"))
        : err.response.data;
      if (data?.detail?.message) {
        msg = data.detail.message;
      } else if (data?.message) {
        msg = data.message;
      } else if (typeof data === "string") {
        msg = data;
      }
    } catch (_) {}
  }

  const status = err?.response?.status;
  if (status === 401) {
    return "ElevenLabs authentication failed: ELEVENLABS_API_KEY is not configured or is invalid.";
  }
  if (status === 429) {
    return "ElevenLabs quota exceeded or rate limit reached. Please check your ElevenLabs subscription.";
  }
  if (status === 404) {
    return "Selected ElevenLabs voice ID was not found or is no longer accessible.";
  }
  if (status === 422) {
    return `ElevenLabs parameter error: ${msg.slice(0, 150)}`;
  }

  // Redact any patterns resembling keys or tokens
  return msg
    .replace(/[a-zA-Z0-9_\-]{20,}/g, (match) => (match.length > 25 ? "[REDACTED_KEY]" : match))
    .replace(/xi-api-key:[^\s,]+/gi, "xi-api-key: [REDACTED]")
    .replace(/key=[a-zA-Z0-9_\-]+/gi, "key=[REDACTED]");
}

/**
 * Core call to ElevenLabs Text-to-Speech API
 * Official endpoint: POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
 */
async function callElevenLabsTts({
  text,
  voiceId = "21m00Tcm4TlvDq8ikWAM",
  modelId = "eleven_multilingual_v2",
  stability = 0.5,
  similarityBoost = 0.75,
  speed = 1.0,
  outputFormat = "mp3_44100_128"
}) {
  if (_mockElevenLabsProvider) {
    if (typeof _mockElevenLabsProvider === "function") {
      return _mockElevenLabsProvider({
        text,
        voiceId,
        modelId,
        stability,
        similarityBoost,
        speed,
        outputFormat
      });
    }
    if (typeof _mockElevenLabsProvider.synthesize === "function") {
      return _mockElevenLabsProvider.synthesize({
        text,
        voiceId,
        modelId,
        voiceSettings: { stability, similarityBoost, speed },
        outputFormat
      });
    }
    if (typeof _mockElevenLabsProvider.generatePcm === "function") {
      return _mockElevenLabsProvider.generatePcm({
        text,
        voiceId,
        modelId,
        outputFormat
      });
    }
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_elevenlabs_api_key_here") {
    throw new Error(
      "ELEVENLABS_API_KEY environment variable is not configured. Please set a valid key in Server/.env."
    );
  }

  const cleanText = (text || "").trim();
  if (!cleanText) {
    throw new Error("Text is required for ElevenLabs speech generation.");
  }
  if (cleanText.length > 3000) {
    throw new Error("Text cannot exceed 3,000 characters for ElevenLabs voice generation.");
  }

  const cleanVoiceId = (voiceId || "21m00Tcm4TlvDq8ikWAM").trim();
  const cleanModelId = (modelId || "eleven_multilingual_v2").trim();

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cleanVoiceId)}?output_format=${encodeURIComponent(outputFormat)}`;

  try {
    const response = await axios.post(
      url,
      {
        text: cleanText,
        model_id: cleanModelId,
        voice_settings: {
          stability: Math.max(0, Math.min(1, Number(stability) || 0.5)),
          similarity_boost: Math.max(0, Math.min(1, Number(similarityBoost) || 0.75)),
          speed: Math.max(0.5, Math.min(2.0, Number(speed) || 1.0))
        }
      },
      {
        headers: {
          "xi-api-key": apiKey.trim(),
          "Content-Type": "application/json",
          Accept: outputFormat.startsWith("mp3") ? "audio/mpeg" : "audio/pcm"
        },
        responseType: "arraybuffer",
        timeout: 20000 // 20s timeout
      }
    );

    return Buffer.from(response.data);
  } catch (err) {
    const sanitized = sanitizeErrorMessage(err);
    throw new Error(sanitized);
  }
}

/**
 * Generates an audio preview sample using ElevenLabs TTS.
 * Returns playable Base64 data URL and metadata.
 */
async function testElevenLabsVoiceSample({
  sampleText,
  voiceId = "21m00Tcm4TlvDq8ikWAM",
  modelId = "eleven_multilingual_v2",
  stability = 0.5,
  similarityBoost = 0.75,
  speed = 1.0
}) {
  if (!sampleText || typeof sampleText !== "string" || sampleText.trim() === "") {
    throw new Error("Sample text is required for voice preview.");
  }

  const cleanText = sampleText.trim();
  if (cleanText.length > 3000) {
    throw new Error("Sample text cannot exceed 3000 characters.");
  }

  const cleanVoice = voiceId || "21m00Tcm4TlvDq8ikWAM";
  const cleanModel = modelId || "eleven_multilingual_v2";
  const numStability = Number(stability) ?? 0.5;
  const numSimilarity = Number(similarityBoost) ?? 0.75;
  const numSpeed = Number(speed) ?? 1.0;

  const cacheKey = getSampleCacheKey(
    cleanText,
    cleanVoice,
    cleanModel,
    numStability,
    numSimilarity,
    numSpeed
  );

  if (_elevenlabsSampleCache.has(cacheKey)) {
    return _elevenlabsSampleCache.get(cacheKey);
  }

  const audioBuffer = await callElevenLabsTts({
    text: cleanText,
    voiceId: cleanVoice,
    modelId: cleanModel,
    stability: numStability,
    similarityBoost: numSimilarity,
    speed: numSpeed,
    outputFormat: "mp3_44100_128"
  });

  const audioUrl = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;
  // Approximate duration for 128 kbps MP3: (bytes * 8) / 128000
  const durationSeconds = Math.max(0.5, Math.round(((audioBuffer.length * 8) / 128000) * 10) / 10);

  const result = {
    audioUrl,
    voice: cleanVoice,
    model: cleanModel,
    durationSeconds,
    provider: "elevenlabs"
  };

  if (_elevenlabsSampleCache.size >= 50) {
    const oldestKey = _elevenlabsSampleCache.keys().next().value;
    _elevenlabsSampleCache.delete(oldestKey);
  }
  _elevenlabsSampleCache.set(cacheKey, result);

  return result;
}

/**
 * Fetches available voices from ElevenLabs API or falls back to built-in presets.
 */
async function getAvailableElevenLabsVoices() {
  if (_mockElevenLabsVoicesProvider) {
    if (typeof _mockElevenLabsVoicesProvider === "function") {
      const res = await _mockElevenLabsVoicesProvider();
      return Array.isArray(res) ? { configured: true, voices: res, cached: false } : res;
    }
    if (typeof _mockElevenLabsVoicesProvider.listVoices === "function") {
      const res = await _mockElevenLabsVoicesProvider.listVoices();
      return { configured: true, voices: res, cached: false };
    }
    return _mockElevenLabsVoicesProvider;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const isConfigured = Boolean(
    apiKey && apiKey.trim() !== "" && apiKey !== "your_elevenlabs_api_key_here"
  );

  // Return cached result if fresh
  const now = Date.now();
  if (_cachedVoices && now - _cachedVoicesTimestamp < VOICES_CACHE_TTL_MS) {
    return {
      configured: isConfigured,
      voices: _cachedVoices,
      cached: true
    };
  }

  if (!isConfigured) {
    return {
      configured: false,
      voices: DEFAULT_ELEVENLABS_VOICES,
      message: "ELEVENLABS_API_KEY is not configured in Server/.env. Using default voice presets."
    };
  }

  try {
    const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey.trim()
      },
      timeout: 10000
    });

    const apiVoices = Array.isArray(response.data?.voices) ? response.data.voices : [];
    if (apiVoices.length > 0) {
      const mapped = apiVoices.map((v) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category || "premade",
        gender: v.labels?.gender || (v.labels?.accent ? `${v.labels.accent}` : "Neutral"),
        description:
          v.description ||
          [v.labels?.accent, v.labels?.description, v.labels?.use_case].filter(Boolean).join(" • ") ||
          "ElevenLabs voice",
        previewUrl: v.preview_url || null
      }));

      _cachedVoices = mapped;
      _cachedVoicesTimestamp = now;

      return {
        configured: true,
        voices: mapped,
        cached: false
      };
    }
  } catch (err) {
    console.warn(
      "[elevenlabsTtsService] Could not fetch remote voices:",
      sanitizeErrorMessage(err)
    );
  }

  return {
    configured: isConfigured,
    voices: DEFAULT_ELEVENLABS_VOICES,
    cached: false
  };
}

/**
 * Generates 24,000 Hz, 16-bit mono PCM reminder audio using ElevenLabs
 * and stores it atomically under Server/.reminder-audio/.
 */
async function generateElevenLabsReminderPcm({
  scheduleId,
  text,
  voiceId = "21m00Tcm4TlvDq8ikWAM",
  modelId = "eleven_multilingual_v2",
  stability = 0.5,
  similarityBoost = 0.75,
  speed = 1.0
}) {
  if (!scheduleId) {
    throw new Error("Schedule ID is required for audio generation.");
  }
  if (!text || typeof text !== "string" || text.trim() === "") {
    throw new Error("Reminder audio text cannot be empty.");
  }

  const cleanText = text.trim();
  if (cleanText.length > 1000) {
    throw new Error("Reminder audio text cannot exceed 1000 characters.");
  }

  // Request raw 24kHz PCM from ElevenLabs
  const pcmBuffer = await callElevenLabsTts({
    text: cleanText,
    voiceId,
    modelId,
    stability,
    similarityBoost,
    speed,
    outputFormat: "pcm_24000"
  });

  const durationSeconds = Math.round((pcmBuffer.length / (24000 * 2)) * 10) / 10;

  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const fileName = `${scheduleId}-${Date.now()}-${randomSuffix}.pcm`;
  const filePath = path.join(AUDIO_DIR, fileName);
  const tempPath = path.join(AUDIO_DIR, `${fileName}.tmp`);

  try {
    fs.writeFileSync(tempPath, pcmBuffer);
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
    }
    throw new Error(`Failed to write ElevenLabs audio file to storage: ${err.message}`);
  }

  return {
    filePath,
    fileName,
    durationSeconds,
    sampleRate: 24000,
    channels: 1,
    bitsPerSample: 16,
    byteLength: pcmBuffer.length,
    provider: "elevenlabs"
  };
}

module.exports = {
  AUDIO_DIR,
  DEFAULT_ELEVENLABS_VOICES,
  SUPPORTED_ELEVENLABS_MODELS,
  callElevenLabsTts,
  testElevenLabsVoiceSample,
  getAvailableElevenLabsVoices,
  generateElevenLabsReminderPcm,
  _setElevenLabsTtsProviderForTesting,
  _setElevenLabsVoicesProviderForTesting
};
