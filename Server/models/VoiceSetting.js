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
      enum: ["Aoede", "Charon", "Fenrir", "Kore", "Puck"],
      required: true,
      trim: true
    },
    hindiVoice: {
      type: String,
      default: "Aoede",
      enum: ["Aoede", "Charon", "Fenrir", "Kore", "Puck"],
      required: true,
      trim: true
    },
    defaultLanguage: {
      type: String,
      enum: ["en", "hi", "auto"],
      default: "auto"
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
    callingSchedule: {
      enabled: {
        type: Boolean,
        default: true
      },
      allowedDays: {
        type: [String],
        default: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ]
      },
      startTime: {
        type: String,
        default: "08:00"
      },
      endTime: {
        type: String,
        default: "21:00"
      },
      timeZone: {
        type: String,
        default: "Asia/Kolkata"
      }
    },
    retryRules: {
      maxRetryAttempts: {
        type: Number,
        default: 3,
        min: 1,
        max: 5
      },
      retryDelayMinutes: {
        type: Number,
        default: 15,
        min: 1,
        max: 60
      }
    },
    reminderDefaults: {
      defaultTimingMinutes: {
        type: Number,
        default: 15,
        min: 0,
        max: 1440
      },
      defaultTemplateEnglish: {
        type: String,
        default:
          "Hello! This is your study reminder from Teaching Pariksha AI regarding: {taskTitle}."
      },
      defaultTemplateHindi: {
        type: String,
        default:
          "नमस्ते! यह टीचिंग परीक्षा AI की ओर से आपके अध्ययन कार्य '{taskTitle}' के लिए एक अनुस्मारक है।"
      }
    },
    enabled: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
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
