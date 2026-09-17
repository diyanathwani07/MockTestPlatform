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

const uploadFile = (fileBuffer, folder, originalFilename = "") => {
  return new Promise((resolve, reject) => {
    // Cloudinary supports auto for raw files (e.g. PDFs)
    const options = {
      folder,
      resource_type: "auto",
    };
    if (originalFilename) {
      options.public_id = originalFilename.replace(/\.[^/.]+$/, ""); // Strip extension
    }

    const stream = cloudinary.uploader.upload_stream(
      options,
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

module.exports = {
  uploadImage,
  uploadFile,
};
