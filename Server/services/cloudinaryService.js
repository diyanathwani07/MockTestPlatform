const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadImage = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

const uploadFile = (fileBuffer, folder, originalFilename = "", options = {}) => {
  return new Promise((resolve, reject) => {
    // Cloudinary supports auto for raw files (e.g. PDFs)
    const uploadOptions = {
      folder,
      resource_type: options.resourceType || options.resource_type || "auto",
      type: options.deliveryType || options.type || "upload",
    };
    if (originalFilename) {
      uploadOptions.public_id = originalFilename.replace(/\.[^/.]+$/, ""); // Strip extension
    }

    Object.keys(options).forEach((key) => {
      if (!["resourceType", "deliveryType", "type", "resource_type"].includes(key)) {
        uploadOptions[key] = options[key];
      }
    });

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

const deleteFile = (publicId, resourceType = "auto", deliveryType = "upload") => {
  return new Promise((resolve, reject) => {
    const destroyOptions = {
      resource_type: resourceType || "auto",
    };
    if (deliveryType) {
      destroyOptions.type = deliveryType;
    }

    cloudinary.uploader.destroy(publicId, destroyOptions, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

const generateSignedViewUrl = (
  publicId,
  format = "pdf",
  resourceType = "raw",
  deliveryType = "authenticated",
  expiresInSeconds = 3600
) => {
  if (!publicId) {
    throw new Error("Cloudinary publicId is required to generate a signed view URL");
  }

  // Support argument overloading: generateSignedViewUrl(publicId, resourceType, deliveryType, expiresInSeconds)
  let actualFormat = format;
  let actualResourceType = resourceType;
  let actualDeliveryType = deliveryType;
  let actualExpires = expiresInSeconds;

  if (["raw", "image", "video", "auto"].includes(format)) {
    actualResourceType = format;
    actualFormat = "";
    if (typeof resourceType === "string" && ["authenticated", "upload", "private"].includes(resourceType)) {
      actualDeliveryType = resourceType;
      actualExpires = typeof deliveryType === "number" ? deliveryType : 3600;
    }
  }

  const expiresAt = Math.floor(Date.now() / 1000) + actualExpires;
  try {
    const viewUrl = cloudinary.utils.private_download_url(publicId, actualFormat || "", {
      resource_type: actualResourceType || "raw",
      type: actualDeliveryType || "authenticated",
      expires_at: expiresAt,
      attachment: false,
    });

    if (!viewUrl || !viewUrl.includes("signature=")) {
      throw new Error("Failed to generate valid HMAC signature for secure view URL");
    }

    return viewUrl;
  } catch (err) {
    // Fail closed: strictly NO fallback to unsigned / public delivery
    throw new Error(`Failed to generate signed view URL for secure asset: ${err.message}`);
  }
};

const generateSignedDownloadUrl = (
  publicId,
  format = "pdf",
  resourceType = "raw",
  deliveryType = "authenticated",
  expiresInSeconds = 3600
) => {
  if (!publicId) {
    throw new Error("Cloudinary publicId is required to generate a signed download URL");
  }

  // Support argument overloading: generateSignedDownloadUrl(publicId, resourceType, deliveryType, expiresInSeconds)
  let actualFormat = format;
  let actualResourceType = resourceType;
  let actualDeliveryType = deliveryType;
  let actualExpires = expiresInSeconds;

  if (["raw", "image", "video", "auto"].includes(format)) {
    actualResourceType = format;
    actualFormat = "";
    if (typeof resourceType === "string" && ["authenticated", "upload", "private"].includes(resourceType)) {
      actualDeliveryType = resourceType;
      actualExpires = typeof deliveryType === "number" ? deliveryType : 3600;
    }
  }

  const expiresAt = Math.floor(Date.now() / 1000) + actualExpires;
  try {
    const downloadUrl = cloudinary.utils.private_download_url(publicId, actualFormat || "", {
      resource_type: actualResourceType || "raw",
      type: actualDeliveryType || "authenticated",
      expires_at: expiresAt,
      attachment: true,
    });

    if (!downloadUrl || !downloadUrl.includes("signature=")) {
      throw new Error("Failed to generate valid signature for private download URL");
    }

    return downloadUrl;
  } catch (err) {
    // Fail closed: strictly NO fallback to unsigned / public delivery
    throw new Error(`Failed to generate signed download URL for secure asset: ${err.message}`);
  }
};

module.exports = {
  uploadImage,
  uploadFile,
  deleteFile,
  generateSignedViewUrl,
  generateSignedDownloadUrl,
};
