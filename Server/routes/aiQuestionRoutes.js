const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {
  generateQuestionsFromPrompt,
  generateQuestionsFromImage,
  startVideoGenerationJob,
  getVideoGenerationStatus
} = require('../controllers/aiQuestionController');

// Multer memory configuration accepting image and video up to 100MB
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// POST /api/ai/questions/from-prompt
router.post('/from-prompt', protect, adminOnly, generateQuestionsFromPrompt);

// POST /api/ai/questions/from-image
router.post('/from-image', protect, adminOnly, upload.single('file'), generateQuestionsFromImage);

// POST /api/ai/questions/from-video/start
router.post('/from-video/start', protect, adminOnly, upload.single('file'), startVideoGenerationJob);

// GET /api/ai/questions/from-video/status/:jobId
router.get('/from-video/status/:jobId', protect, adminOnly, getVideoGenerationStatus);

module.exports = router;
