const mongoose = require("mongoose");

const voiceSettingSchema = new mongoose.Schema(
  {
    model: {
      type: String,
      default: "gemini-2.5-flash-preview-tts",
      required: true,
      trim: true
    },
    englishVoice: {
      type: String,
      default: "Aoede",
      required: true,
      trim: true
    },
    hindiVoice: {
      type: String,
      default: "Aoede",
      required: true,
      trim: true
    },
    englishPrompt: {
      type: String,
      default:
        "You are an articulate, professional news anchor and educator. Read this news report aloud clearly in an engaging, natural, steady broadcasting tone with precise pronunciation.",
      trim: true
    },
    hindiPrompt: {
      type: String,
      default:
        "आप एक पेशेवर और स्पष्ट समाचार वाचक (News Broadcaster) हैं। इस समाचार को सहज, प्रामाणिक और प्रभावशाली हिंदी उच्चारण में स्पष्ट रूप से पढ़कर सुनाएं। कठिन शब्दों और तकनीकी नामों का उच्चारण अत्यंत स्पष्ट रखें।",
      trim: true
    },
    enabled: {
      type: Boolean,
      default: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("VoiceSetting", voiceSettingSchema);
