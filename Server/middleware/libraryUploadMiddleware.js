const multer = require("multer");
const path = require("path");

// 50 MB Maximum File Size for Study Library Documents & Media
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Explicitly supported MIME types and their authorized extensions
const ALLOWED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/msword": [".doc"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/jpg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"]
};

/**
 * Sanitize filename to prevent directory traversal, control character injection,
 * and dangerous file paths.
 */
function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== "string") {
    return `document_${Date.now()}`;
  }

  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);

  // Strip null bytes, control characters, traversal sequences, and special characters
  const cleanBase = base
    .replace(/[\0\x00-\x1f\x7f-\x9f]/g, "")
    .replace(/(\.\.[\/\\]|\.\.)+/g, "")
    .replace(/[^a-zA-Z0-9_\-\s.]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 120);

  return (cleanBase || `document_${Date.now()}`) + ext;
}

/**
 * Checks if a given MIME type is supported by the study library.
 */
function isAllowedMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== "string") return false;
  return Object.prototype.hasOwnProperty.call(ALLOWED_MIME_TYPES, mimeType.toLowerCase());
}

/**
 * Validates actual binary signature (magic numbers) of the file buffer
 * to prevent MIME spoofing (e.g. executable or script disguised as PDF/PNG).
 */
function verifyFileMagicNumber(buffer, mimeType) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { valid: false, reason: "File buffer is missing or invalid" };
  }

  if (buffer.length === 0) {
    return { valid: false, reason: "Uploaded file is empty (0 bytes)" };
  }

  const normalizedMime = (mimeType || "").toLowerCase();

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (normalizedMime === "application/pdf") {
    if (buffer.length < 5) return { valid: false, reason: "Buffer too short for valid PDF" };
    const header = buffer.toString("utf8", 0, 5);
    if (header !== "%PDF-") {
      return { valid: false, reason: "Invalid PDF signature (header mismatch)" };
    }
    return { valid: true };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (normalizedMime === "image/png") {
    if (buffer.length < 8) return { valid: false, reason: "Buffer too short for valid PNG" };
    const pngMagic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    for (let i = 0; i < pngMagic.length; i++) {
      if (buffer[i] !== pngMagic[i]) {
        return { valid: false, reason: "Invalid PNG signature" };
      }
    }
    return { valid: true };
  }

  // 3. JPEG / JPG: FF D8 FF
  if (normalizedMime === "image/jpeg" || normalizedMime === "image/jpg") {
    if (buffer.length < 3) return { valid: false, reason: "Buffer too short for valid JPEG" };
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
      return { valid: false, reason: "Invalid JPEG signature" };
    }
    return { valid: true };
  }

  // 4. WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (normalizedMime === "image/webp") {
    if (buffer.length < 12) return { valid: false, reason: "Buffer too short for valid WebP" };
    const riff = buffer.toString("utf8", 0, 4);
    const webp = buffer.toString("utf8", 8, 12);
    if (riff !== "RIFF" || webp !== "WEBP") {
      return { valid: false, reason: "Invalid WebP signature" };
    }
    return { valid: true };
  }

  // 5. DOCX: PK ZIP archive header (PK\x03\x04 or PK\x05\x06)
  if (normalizedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    if (buffer.length < 4) return { valid: false, reason: "Buffer too short for valid DOCX" };
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);
    if (!isZip) {
      return { valid: false, reason: "Invalid DOCX signature (ZIP container missing)" };
    }
    return { valid: true };
  }

  // 6. Legacy DOC: OLE compound document (D0 CF 11 E0)
  if (normalizedMime === "application/msword") {
    if (buffer.length < 4) return { valid: false, reason: "Buffer too short for valid DOC" };
    const isOle = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
    if (!isOle) {
      return { valid: false, reason: "Invalid DOC signature (OLE compound binary expected)" };
    }
    return { valid: true };
  }

  return { valid: false, reason: `MIME type '${mimeType}' is not supported for library upload` };
}

// Multer memory storage (no disk persistence)
const storage = multer.memoryStorage();

// File filter checking MIME type and extension congruence
const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (!isAllowedMimeType(mime)) {
    return cb(
      new Error(`Unsupported file type '${mime}'. Allowed formats: PDF, DOCX, DOC, JPEG, PNG, and WebP.`),
      false
    );
  }

  const validExtensions = ALLOWED_MIME_TYPES[mime] || [];
  if (!validExtensions.includes(ext)) {
    return cb(
      new Error(`Extension '${ext}' does not match the file type '${mime}'.`),
      false
    );
  }

  cb(null, true);
};

const libraryUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter
});

/**
 * Express middleware wrapper for single file upload with comprehensive validation
 * of size, binary signature, non-empty content, and filename sanitization.
 */
function handleLibrarySingleUpload(fieldName = "file") {
  const upload = libraryUpload.single(fieldName);

  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: `File exceeds maximum allowed size of 50 MB.`
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file provided in request."
        });
      }

      // 1. Prevent 0-byte / empty files
      if (!req.file.buffer || req.file.buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Uploaded file is empty (0 bytes)."
        });
      }

      // 2. Validate binary magic numbers
      const signatureCheck = verifyFileMagicNumber(req.file.buffer, req.file.mimetype);
      if (!signatureCheck.valid) {
        return res.status(400).json({
          success: false,
          message: signatureCheck.reason || "File signature validation failed."
        });
      }

      // 3. Attach sanitized filename
      req.file.sanitizedFileName = sanitizeFileName(req.file.originalname);

      next();
    });
  };
}

module.exports = {
  libraryUpload,
  handleLibrarySingleUpload,
  sanitizeFileName,
  verifyFileMagicNumber,
  isAllowedMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
};
