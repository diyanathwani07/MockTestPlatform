const express = require("express");
const router = express.Router();
const uploadMiddleware = require("../middleware/memoryUploadMiddleware");
const uploadController = require("../controllers/uploadController");
const authMiddleware = require("../middleware/authMiddleware");

// POST /api/users/upload-profile
router.post(
  "/",
  authMiddleware.protect,
  (req, res, next) => {
    uploadMiddleware.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadController.uploadProfilePicture
);

// POST /api/upload/pdf (or wherever this is mounted)
router.post(
  "/pdf",
  authMiddleware.protect,
  (req, res, next) => {
    uploadMiddleware.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadController.uploadPdfFile
);

// POST /api/upload/image (or wherever this is mounted)
router.post(
  "/image",
  authMiddleware.protect,
  (req, res, next) => {
    uploadMiddleware.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadController.uploadGenericImage
);

module.exports = router;
