const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const extractMaterialContent = async (file) => {
  let extractedText = "";
  let multimodalParts = [];

  if (file.mimetype === "application/pdf") {
    const data = await pdfParse(file.buffer);
    extractedText = data.text;
  } else if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.mimetype === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    extractedText = result.value;
  } else if (file.mimetype.startsWith("image/")) {
    multimodalParts.push({
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype
      }
    });
  } else {
    throw new Error("Unsupported file type.");
  }

  if (!extractedText.trim() && multimodalParts.length === 0) {
    throw new Error("Could not extract text from the provided document. The document might be empty or unreadable.");
  }

  return { extractedText, multimodalParts };
};

module.exports = { extractMaterialContent };
