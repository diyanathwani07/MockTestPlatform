const cloudinaryService = require("../services/cloudinaryService");
const User = require("../models/User");

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Upload to Cloudinary using the service
    const result = await cloudinaryService.uploadImage(req.file.buffer, "profile-pictures");

    // Update the user's profilePicture in MongoDB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePicture: result.secure_url, avatar: result.secure_url },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      imageUrl: result.secure_url,
      message: "Profile picture uploaded successfully",
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to upload image" });
  }
};

module.exports = {
  uploadProfilePicture,
};
