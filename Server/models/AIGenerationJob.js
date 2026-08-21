const mongoose = require('mongoose');

const aiGenerationJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'generating', 'done', 'failed'],
      default: 'uploading'
    },
    videoCloudinaryUrl: { type: String, default: '' },
    geminiFileUri: { type: String, default: '' },
    subject: { type: String, default: '' },
    count: { type: Number, default: 10 },
    optionCount: { type: Number, default: 4 },
    resultQuestions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    errorMessage: { type: String, default: '' }
  },
  { timestamps: true }
);

const aiUsageLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: { expires: '24h' } }
});

module.exports = {
  AIGenerationJob: mongoose.model('AIGenerationJob', aiGenerationJobSchema),
  AIUsageLog: mongoose.model('AIUsageLog', aiUsageLogSchema)
};
