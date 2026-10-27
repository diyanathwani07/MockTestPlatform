const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");
const { voicePreviewLimiter } = require("../middleware/rateLimiter");
const {
  getVoiceSettings,
  updateVoiceSettings,
  testVoicePreview,
  extractDocxText
} = require("../controllers/voiceSettingController");

// Memory-based multer for DOCX extraction (max 10MB)
const docxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname && file.originalname.toLowerCase().endsWith(".docx")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Word documents (.docx) are supported."));
    }
  }
});

// Public endpoint for student portal & admin to fetch active settings
router.get("/", getVoiceSettings);

// Admin-only endpoints for updating settings, live testing voice sample, and word-to-speech docx extraction
router.put("/", protect, adminOnly, updateVoiceSettings);
router.post("/preview", protect, adminOnly, voicePreviewLimiter, testVoicePreview);
router.post("/test", protect, adminOnly, voicePreviewLimiter, testVoicePreview);
router.post(
  "/extract-docx",
  protect,
  adminOnly,
  (req, res, next) => {
    docxUpload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "Document exceeds the 10 MB maximum file size limit."
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message || "File upload error."
        });
      }
      next();
    });
  },
  extractDocxText
);

module.exports = router;
