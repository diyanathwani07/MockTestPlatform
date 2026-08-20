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

module.exports = router;
