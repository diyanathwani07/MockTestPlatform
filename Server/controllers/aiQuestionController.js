const fs = require('fs');
const path = require('path');
const os = require('os');
const { AIGenerationJob, AIUsageLog } = require('../models/AIGenerationJob');
const aiService = require('../services/aiQuestionGenService');
const logAction = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DAILY_LIMIT = 10;

async function checkUsageLimit(userId) {
  const count = await AIUsageLog.countDocuments({ userId });
  if (count >= DAILY_LIMIT) {
    throw new Error('AI daily usage limit of ' + DAILY_LIMIT + ' requests reached.');
  }
}

async function recordUsage(userId, action) {
  await AIUsageLog.create({ userId, action });
}

function classifyError(error) {
  const msg = error.message || '';
  if (msg.includes('429') || msg.includes('Quota') || msg.includes('quota') || msg.includes('limit')) {
    return 'AI quota reached. Please try again later or contact the administrator.';
  }
  if (msg.includes('API key not valid')) {
    return 'AI configuration error: Invalid API Key.';
  }
  return msg || 'AI Generation failed.';
}

const generateQuestionsFromPrompt = async (req, res) => {
  try {
    const { topic, count, difficulty, subject, examContext, negativeMarkingEnabled, optionCount } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ message: 'Topic is required.' });
    }

    await checkUsageLimit(req.user._id);

    const questions = await aiService.generateFromPrompt({
      topic,
      count,
      difficulty,
      subject,
      examContext,
      negativeMarkingEnabled: negativeMarkingEnabled === true || negativeMarkingEnabled === 'true',
      optionCount
    });

    await recordUsage(req.user._id, 'AI_GENERATE_QUESTIONS_PROMPT');
    await logAction(
      'AI_GENERATE_QUESTIONS_PROMPT',
      req.user?.fullName || 'Admin',
      `Generated ${questions.length} questions for topic: ${topic}`,
      'AIGeneration',
      req.ip
    );

    res.json({ success: true, questions });
  } catch (error) {
    console.error('[AI Gen Controller Prompt] Error:', error);
    res.status(500).json({ message: classifyError(error) });
  }
};

const generateQuestionsFromImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    await checkUsageLimit(req.user._id);

    const { count, subject, optionCount } = req.body;

    const questions = await aiService.generateFromImage({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      count,
      subject,
      optionCount
    });

    await recordUsage(req.user._id, 'AI_GENERATE_QUESTIONS_IMAGE');
    await logAction(
      'AI_GENERATE_QUESTIONS_IMAGE',
      req.user?.fullName || 'Admin',
      `Generated ${questions.length} questions from image for subject: ${subject || 'General'}`,
      'AIGeneration',
      req.ip
    );

    res.json({ success: true, questions });
  } catch (error) {
    console.error('[AI Gen Controller Image] Error:', error);
    res.status(500).json({ message: classifyError(error) });
  }
};

const startVideoGenerationJob = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded.' });
    }

    await checkUsageLimit(req.user._id);

    const { count, subject, optionCount } = req.body;

    // Create generation job initial record
    const job = await AIGenerationJob.create({
      userId: req.user._id,
      status: 'uploading',
      subject: subject || 'General',
      count: count || 10,
      optionCount: optionCount || 4
    });

    // Respond immediately with jobId
    res.json({ success: true, jobId: job._id });

    // Asynchronously process the video upload & generation
    processVideoAsync(job._id, req.file, req.user);

  } catch (error) {
    console.error('[AI Gen Controller Video Start] Error:', error);
    res.status(500).json({ message: classifyError(error) });
  }
};

async function processVideoAsync(jobId, file, user) {
  let tempFilePath = '';
  try {
    // 1. Upload video to Cloudinary
    const cloudinaryResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ai-videos',
          resource_type: 'video'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(file.buffer).pipe(stream);
    });

    await AIGenerationJob.findByIdAndUpdate(jobId, {
      status: 'processing',
      videoCloudinaryUrl: cloudinaryResult.secure_url
    });

    // 2. Write buffer to temporary file for Gemini Files API
    tempFilePath = path.join(os.tmpdir(), `gemini-upload-${Date.now()}-${file.originalname}`);
    fs.writeFileSync(tempFilePath, file.buffer);

    // 3. Upload to Gemini Files API
    const geminiFile = await ai.files.upload({
      file: tempFilePath,
      mimeType: file.mimetype
    });

    await AIGenerationJob.findByIdAndUpdate(jobId, {
      geminiFileUri: geminiFile.uri
    });

    // 4. Poll Files API state until ACTIVE
    let fileState = await ai.files.get({ name: geminiFile.name });
    while (fileState.state === 'PROCESSING') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      fileState = await ai.files.get({ name: geminiFile.name });
    }

    if (fileState.state !== 'ACTIVE') {
      throw new Error(`Gemini Video processing failed with state: ${fileState.state}`);
    }

    // 5. Generate questions
    await AIGenerationJob.findByIdAndUpdate(jobId, { status: 'generating' });

    const job = await AIGenerationJob.findById(jobId);
    const questions = await aiService.generateFromVideoFile({
      geminiFileUri: job.geminiFileUri,
      mimeType: file.mimetype,
      count: job.count,
      subject: job.subject,
      optionCount: job.optionCount
    });

    // 6. Complete Job
    await AIGenerationJob.findByIdAndUpdate(jobId, {
      status: 'done',
      resultQuestions: questions
    });

    await recordUsage(user._id, 'AI_GENERATE_QUESTIONS_VIDEO');
    await logAction(
      'AI_GENERATE_QUESTIONS_VIDEO',
      user?.fullName || 'Admin',
      `Generated ${questions.length} questions from video for subject: ${job.subject}`,
      'AIGeneration',
      null
    );

    // 7. Cleanup Gemini File API
    try {
      await ai.files.delete({ name: geminiFile.name });
    } catch (delErr) {
      console.warn('[Gemini File Cleanup] Failed to delete file:', delErr.message);
    }

  } catch (error) {
    console.error('[AI Gen Controller Video Async] Job failed:', error);
    await AIGenerationJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      errorMessage: classifyError(error)
    });
  } finally {
    // Cleanup temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.error('Failed to delete temp file:', e);
      }
    }
  }
}

const getVideoGenerationStatus = async (req, res) => {
  try {
    const job = await AIGenerationJob.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    // Verify job belongs to requesting user or user is an admin
    if (job.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({
      success: true,
      status: job.status,
      resultQuestions: job.resultQuestions,
      errorMessage: job.errorMessage
    });
  } catch (error) {
    console.error('[AI Gen Controller Video Status] Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generateQuestionsFromPrompt,
  generateQuestionsFromImage,
  startVideoGenerationJob,
  getVideoGenerationStatus
};
