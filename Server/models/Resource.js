const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Resource title is required"],
      trim: true,
      maxlength: [200, "Resource title cannot exceed 200 characters"]
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Description cannot exceed 2000 characters"]
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      required: [true, "Folder reference is required"],
      index: true
    },
    resourceType: {
      type: String,
      enum: ["pdf", "docx", "image", "video_link", "web_link", "note"],
      required: [true, "Resource type is required"],
      index: true
    },
    // File storage URL (Cloudinary or secure CDN)
    fileUrl: {
      type: String,
      trim: true,
      default: null
    },
    // Cloudinary asset public ID for secure server-side management/deletion
    cloudinaryPublicId: {
      type: String,
      trim: true,
      default: null
    },
    // Actual Cloudinary resource_type returned upon upload ('raw', 'image', 'video')
    cloudinaryResourceType: {
      type: String,
      trim: true,
      default: "raw"
    },
    // Actual Cloudinary delivery type ('authenticated', 'upload', 'private')
    cloudinaryDeliveryType: {
      type: String,
      enum: ["authenticated", "upload", "private"],
      default: "authenticated",
      trim: true
    },
    originalFileName: {
      type: String,
      trim: true,
      default: null
    },
    mimeType: {
      type: String,
      trim: true,
      default: null
    },
    fileSize: {
      type: Number,
      default: 0,
      min: 0
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    accessTier: {
      type: String,
      enum: ["free", "premium_subscriber", "exam_enrolled"],
      default: "free",
      index: true
    },
    isDownloadable: {
      type: Boolean,
      default: true
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader user reference is required"]
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes
resourceSchema.index({ folderId: 1, order: 1 });
resourceSchema.index({ accessTier: 1, isPublished: 1, isDeleted: 1 });
resourceSchema.index({ folderId: 1, isDeleted: 1, isPublished: 1 });

// Model-level validation for file-based vs link/text resources
resourceSchema.pre("validate", function() {
  const fileTypes = ["pdf", "docx", "image"];
  if (fileTypes.includes(this.resourceType)) {
    if (!this.fileUrl || typeof this.fileUrl !== "string" || !this.fileUrl.trim()) {
      this.invalidate("fileUrl", `File-based resource (${this.resourceType}) requires a valid fileUrl`);
    }
    if (!this.mimeType || typeof this.mimeType !== "string" || !this.mimeType.trim()) {
      this.invalidate("mimeType", `File-based resource (${this.resourceType}) requires a valid mimeType`);
    }
    if (!this.originalFileName || typeof this.originalFileName !== "string" || !this.originalFileName.trim()) {
      this.invalidate("originalFileName", `File-based resource (${this.resourceType}) requires originalFileName`);
    }
  } else if (["video_link", "web_link"].includes(this.resourceType)) {
    if (!this.fileUrl || typeof this.fileUrl !== "string" || !this.fileUrl.trim()) {
      this.invalidate("fileUrl", `Link-based resource (${this.resourceType}) requires a valid target URL in fileUrl`);
    }
  }
});

module.exports = mongoose.model("Resource", resourceSchema);
