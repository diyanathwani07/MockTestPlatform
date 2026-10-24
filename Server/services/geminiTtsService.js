const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");
const VoiceSetting = require("../models/VoiceSetting");

const AUDIO_DIR = path.resolve(__dirname, "../.reminder-audio");

// Ensure private audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Module-level mock hook for isolated unit tests without network calls
let _mockProvider = null;
function _setTtsProviderForTesting(fn) {
  _mockProvider = fn;
}

/**
 * Detects whether the input text is Hindi (Devanagari) or English.
 * Returns 'hi' if Hindi characters are present, otherwise 'en'.
 */
function detectLanguage(text) {
  if (!text || typeof text !== "string") return "en";
  // Matches Unicode range for Devanagari script: 0900-097F
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  return hasDevanagari ? "hi" : "en";
}

/**
 * Builds a standard 44-byte WAV header for 16-bit PCM audio.
 */
function createWavHeader(pcmLength, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmLength, 40);

  return header;
}

/**
 * Converts a raw PCM buffer into a playable WAV Data URL.
 */
function pcmToWavDataUrl(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const header = createWavHeader(pcmBuffer.length, sampleRate, numChannels, bitsPerSample);
  const wav = Buffer.concat([header, pcmBuffer]);
  return `data:audio/wav;base64,${wav.toString("base64")}`;
}

/**
 * Validates audio buffer and extracts 24,000 Hz, 16-bit, mono PCM.
 * Strips WAV/RIFF headers safely after verifying format metadata.
 */
function extractPcmFromWav(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid or empty audio buffer provided.");
  }

  // Check for RIFF/WAVE container
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    let offset = 12;
    let fmtParsed = false;
    let sampleRate = 0;
    let channels = 0;
    let bitsPerSample = 0;
    let pcmData = null;

    while (offset + 8 <= buffer.length) {
      const chunkId = buffer.subarray(offset, offset + 4).toString("ascii");
      const chunkSize = buffer.readUInt32LE(offset + 4);
      offset += 8;

      if (chunkId === "fmt ") {
        const audioFormat = buffer.readUInt16LE(offset);
        if (audioFormat !== 1) {
          throw new Error(`Unsupported WAV audio format: ${audioFormat}. Expected uncompressed PCM (1).`);
        }
        channels = buffer.readUInt16LE(offset + 2);
        sampleRate = buffer.readUInt32LE(offset + 4);
        bitsPerSample = buffer.readUInt16LE(offset + 14);
        fmtParsed = true;
      } else if (chunkId === "data") {
        pcmData = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
        break;
      }
      offset += chunkSize;
    }

    if (!fmtParsed) {
      throw new Error("Malformed WAV file: missing 'fmt ' chunk.");
    }
    if (!pcmData || pcmData.length === 0) {
      throw new Error("Malformed WAV file: missing or empty 'data' chunk.");
    }
    if (sampleRate !== 24000) {
      throw new Error(`Unsupported sample rate: ${sampleRate} Hz. Target format requires 24000 Hz.`);
    }
    if (channels !== 1) {
      throw new Error(`Unsupported channels: ${channels}. Target format requires 1 channel (mono).`);
    }
    if (bitsPerSample !== 16) {
      throw new Error(`Unsupported bit depth: ${bitsPerSample}-bit. Target format requires 16-bit PCM.`);
    }

    return pcmData;
  }

  // If buffer is already raw PCM (no RIFF header)
  if (buffer.length % 2 !== 0) {
    throw new Error("Invalid raw PCM: byte length must be an even multiple of 2 (16-bit samples).");
  }

  return buffer;
}

/**
 * Calls Gemini text-to-speech API using Google Gen AI SDK.
 */
async function callGeminiTts({ text, voice = "Aoede", prompt = "", model = "gemini-2.5-flash-preview-tts" }) {
  if (_mockProvider) {
    return _mockProvider({ text, voice, prompt, model });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const contents = [
    {
      role: "user",
      parts: [{ text: text.trim() }]
    }
  ];

  const config = {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voice || "Aoede"
        }
      }
    }
  };

  if (prompt && typeof prompt === "string" && prompt.trim() !== "") {
    config.systemInstruction = {
      parts: [{ text: prompt.trim() }]
    };
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config
  });

  const candidate = response?.candidates?.[0];
  if (!candidate || !candidate.content || !candidate.content.parts) {
    throw new Error("Gemini TTS provider returned an empty or malformed response.");
  }

  // Find inline audio part
  const audioPart = candidate.content.parts.find(
    p => p.inlineData && p.inlineData.data
  );

  if (!audioPart || !audioPart.inlineData.data) {
    throw new Error("Gemini TTS provider response did not contain audio data.");
  }

  return Buffer.from(audioPart.inlineData.data, "base64");
}

/**
 * 1. Test Voice Audio Preview in Real-time (reused by admin controller)
 */
async function testVoiceSample({ sampleText, lang = "en", voice = "Aoede", customPrompt = "" }) {
  if (!sampleText || typeof sampleText !== "string" || sampleText.trim() === "") {
    throw new Error("Sample text is required for voice preview.");
  }

  const cleanText = sampleText.trim();
  if (cleanText.length > 1000) {
    throw new Error("Sample text cannot exceed 1000 characters.");
  }

  // Fetch or default VoiceSettings
  let settings = await VoiceSetting.findOne();
  if (!settings) {
    settings = {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      englishPrompt:
        "You are an articulate, professional news anchor and educator. Read this news report aloud clearly in an engaging, natural, steady broadcasting tone with precise pronunciation.",
      hindiPrompt:
        "आप एक पेशेवर और स्पष्ट समाचार वाचक (News Broadcaster) हैं। इस समाचार को सहज, प्रामाणिक और प्रभावशाली हिंदी उच्चारण में स्पष्ट रूप से पढ़कर सुनाएं। कठिन शब्दों और तकनीकी नामों का उच्चारण अत्यंत स्पष्ट रखें。",
      enabled: true
    };
  }

  const selectedVoice = voice || (lang === "hi" ? settings.hindiVoice : settings.englishVoice) || "Aoede";
  const selectedPrompt =
    customPrompt || (lang === "hi" ? settings.hindiPrompt : settings.englishPrompt) || "";
  const model = settings.model || "gemini-2.5-flash-preview-tts";

  const rawAudio = await callGeminiTts({
    text: cleanText,
    voice: selectedVoice,
    prompt: selectedPrompt,
    model
  });

  const pcmBuffer = extractPcmFromWav(rawAudio);
  const audioUrl = pcmToWavDataUrl(pcmBuffer, 24000, 1, 16);
  const durationSeconds = Math.round((pcmBuffer.length / (24000 * 2)) * 10) / 10;

  return {
    audioUrl,
    voice: selectedVoice,
    durationSeconds
  };
}

/**
 * 2. Generates 24,000 Hz, 16-bit mono PCM reminder audio and stores it atomically.
 */
async function generateReminderPcm({
  scheduleId,
  text,
  lang = "auto",
  voice = null,
  customPrompt = ""
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

  // Check voice settings and administrative enablement
  let settings = await VoiceSetting.findOne();
  if (!settings) {
    settings = {
      model: "gemini-2.5-flash-preview-tts",
      englishVoice: "Aoede",
      hindiVoice: "Aoede",
      englishPrompt:
        "You are an articulate, professional news anchor and educator. Read this news report aloud clearly in an engaging, natural, steady broadcasting tone with precise pronunciation.",
      hindiPrompt:
        "आप एक पेशेवर और स्पष्ट समाचार वाचक (News Broadcaster) हैं। इस समाचार को सहज, प्रामाणिक और प्रभावशाली हिंदी उच्चारण में स्पष्ट रूप से पढ़कर सुनाएं। कठिन शब्दों और तकनीकी नामों का उच्चारण अत्यंत स्पष्ट रखें。",
      enabled: true
    };
  }

  if (settings.enabled === false) {
    throw new Error("Voice audio generation is currently disabled by administrator.");
  }

  // Determine language (detect if auto)
  const resolvedLang = lang === "auto" || !lang ? detectLanguage(cleanText) : lang;
  const selectedVoice =
    voice || (resolvedLang === "hi" ? settings.hindiVoice : settings.englishVoice) || "Aoede";
  const selectedPrompt =
    customPrompt || (resolvedLang === "hi" ? settings.hindiPrompt : settings.englishPrompt) || "";
  const model = settings.model || "gemini-2.5-flash-preview-tts";

  // Synthesize audio
  const rawAudio = await callGeminiTts({
    text: cleanText,
    voice: selectedVoice,
    prompt: selectedPrompt,
    model
  });

  // Extract pure 24 kHz 16-bit mono PCM
  const pcmBuffer = extractPcmFromWav(rawAudio);
  const durationSeconds = Math.round((pcmBuffer.length / (24000 * 2)) * 10) / 10;

  // Collision-safe filename under Server/.reminder-audio/
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const fileName = `${scheduleId}-${Date.now()}-${randomSuffix}.pcm`;
  const filePath = path.join(AUDIO_DIR, fileName);
  const tempPath = path.join(AUDIO_DIR, `${fileName}.tmp`);

  try {
    // Atomic write pattern: write to .tmp then rename
    fs.writeFileSync(tempPath, pcmBuffer);
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Clean up temporary file if write or rename fails
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
    }
    throw new Error(`Failed to write audio file to storage: ${err.message}`);
  }

  return {
    filePath,
    fileName,
    durationSeconds,
    sampleRate: 24000,
    channels: 1,
    bitsPerSample: 16,
    byteLength: pcmBuffer.length
  };
}

/**
 * Safely removes an audio file from the private audio storage directory.
 * Prevents directory traversal attacks by validating path boundaries.
 */
function deleteAudioFile(filePath) {
  if (!filePath || typeof filePath !== "string") return false;

  const resolvedPath = path.resolve(filePath);
  // Ensure the file path is strictly inside the .reminder-audio directory
  if (!resolvedPath.startsWith(AUDIO_DIR)) {
    console.warn(`[GeminiTtsService] Prevented deletion outside audio directory: ${filePath}`);
    return false;
  }

  if (fs.existsSync(resolvedPath)) {
    try {
      fs.unlinkSync(resolvedPath);
      return true;
    } catch (error) {
      console.error(`[GeminiTtsService] Error deleting audio file: ${resolvedPath}`, error.message);
      return false;
    }
  }
  return false;
}

module.exports = {
  AUDIO_DIR,
  detectLanguage,
  createWavHeader,
  pcmToWavDataUrl,
  extractPcmFromWav,
  testVoiceSample,
  generateReminderPcm,
  deleteAudioFile,
  _setTtsProviderForTesting
};
