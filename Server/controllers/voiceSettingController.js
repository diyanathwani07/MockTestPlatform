const VoiceSetting = require("../models/VoiceSetting");
const { testVoiceSample } = require("../services/geminiTtsService");

// 1. Get Voice Settings (Public for student app & Admin)
const getVoiceSettings = async (req, res) => {
  try {
    let settings = await VoiceSetting.findOne();
    if (!settings) {
      settings = await VoiceSetting.create({
        model: "gemini-2.5-flash-preview-tts",
        englishVoice: "Aoede",
        hindiVoice: "Aoede",
        englishPrompt:
          "You are an articulate, professional news anchor and educator. Read this news report aloud clearly in an engaging, natural, steady broadcasting tone with precise pronunciation.",
        hindiPrompt:
          "आप एक पेशेवर और स्पष्ट समाचार वाचक (News Broadcaster) हैं। इस समाचार को सहज, प्रामाणिक और प्रभावशाली हिंदी उच्चारण में स्पष्ट रूप से पढ़कर सुनाएं। कठिन शब्दों और तकनीकी नामों का उच्चारण अत्यंत स्पष्ट रखें।",
        enabled: true
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error("Error fetching voice settings:", error);
    res.status(500).json({ error: "Failed to fetch voice settings" });
  }
};

// 2. Update Voice Settings (Admin / Superadmin only)
const updateVoiceSettings = async (req, res) => {
  try {
    const { englishVoice, hindiVoice, englishPrompt, hindiPrompt, enabled } = req.body;

    let settings = await VoiceSetting.findOne();
    if (!settings) {
      settings = new VoiceSetting();
    }

    // Strictly retain single model gemini-2.5-flash-preview-tts
    settings.model = "gemini-2.5-flash-preview-tts";
    if (englishVoice !== undefined) settings.englishVoice = englishVoice;
    if (hindiVoice !== undefined) settings.hindiVoice = hindiVoice;
    if (englishPrompt !== undefined) settings.englishPrompt = englishPrompt;
    if (hindiPrompt !== undefined) settings.hindiPrompt = hindiPrompt;
    if (enabled !== undefined) settings.enabled = enabled;
    settings.updatedAt = new Date();

    await settings.save();

    res.json({
      success: true,
      message: "Voice settings updated successfully",
      settings
    });
  } catch (error) {
    console.error("Error updating voice settings:", error);
    res.status(500).json({ error: "Failed to update voice settings" });
  }
};

// 3. Test Voice Audio Preview in Real-time (Admin / Superadmin only)
const testVoicePreview = async (req, res) => {
  try {
    const { sampleText, lang, voice, customPrompt } = req.body;

    const result = await testVoiceSample({
      sampleText,
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
    console.error("Error testing voice sample:", error);
    res.status(500).json({ error: error.message || "Failed to generate voice preview" });
  }
};

module.exports = {
  getVoiceSettings,
  updateVoiceSettings,
  testVoicePreview
};
