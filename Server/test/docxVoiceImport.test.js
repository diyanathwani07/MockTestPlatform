const test = require("node:test");
const assert = require("node:assert/strict");
const JSZip = require("jszip");
const path = require("path");
const fs = require("fs");
const { extractDocxText, testVoicePreview } = require("../controllers/voiceSettingController");
const { _setTtsProviderForTesting } = require("../services/geminiTtsService");

// Helper to create synthetic valid DOCX buffer
async function createSyntheticDocx(textParagraphs) {
  const zip = new JSZip();
  const paragraphs = Array.isArray(textParagraphs) ? textParagraphs : [textParagraphs];
  const pXml = paragraphs
    .map(p => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
    .join("");

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${pXml}</w:body>
</w:document>`;

  zip.file("word/document.xml", docXml);
  return await zip.generateAsync({ type: "nodebuffer" });
}

// Helper for mock Express res object
function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
}

test("Word-to-Speech (.docx) Extraction & TTS Integration Suite", async (t) => {
  t.after(() => {
    _setTtsProviderForTesting(null);
  });

  // 1. Valid English DOCX Extraction
  await t.test("1. Successfully extracts plain text, character count, and word count from valid English .docx", async () => {
    const text = "Welcome to PrepMark. This is an automated assessment platform for competitive exam readiness.";
    const buffer = await createSyntheticDocx(text);

    const req = {
      file: {
        originalname: "prepmark-intro.docx",
        buffer,
        size: buffer.length
      }
    };
    const res = createMockRes();

    await extractDocxText(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.text, text);
    assert.equal(res.data.characterCount, text.length);
    assert.equal(res.data.wordCount, text.split(/\s+/).length);
    assert.equal(res.data.exceedsLimit, false);
    assert.equal(res.data.warning, null);
  });

  // 2. Valid Hindi (Devanagari) DOCX Extraction
  await t.test("2. Successfully extracts Unicode Hindi (Devanagari) text accurately", async () => {
    const hindiText = "नमस्ते, यह टीचिंग परीक्षा एआई का अध्ययन अनुस्मारक है। कृपया अपनी तैयारी जारी रखें।";
    const buffer = await createSyntheticDocx(hindiText);

    const req = {
      file: {
        originalname: "hindi-reminder.docx",
        buffer,
        size: buffer.length
      }
    };
    const res = createMockRes();

    await extractDocxText(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.text, hindiText);
    assert.equal(res.data.characterCount, hindiText.length);
  });

  // 3. Multi-paragraph document preserves formatting
  await t.test("3. Preserves line breaks between paragraphs in multi-paragraph documents", async () => {
    const paragraphs = [
      "Paragraph 1: Exam instructions for all students.",
      "Paragraph 2: Maintain complete silence during the examination session.",
      "Paragraph 3: Submit your answers before the scheduled countdown expires."
    ];
    const buffer = await createSyntheticDocx(paragraphs);

    const req = {
      file: {
        originalname: "multi-paragraph.docx",
        buffer,
        size: buffer.length
      }
    };
    const res = createMockRes();

    await extractDocxText(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    for (const p of paragraphs) {
      assert.ok(res.data.text.includes(p));
    }
  });

  // 4. Rejection of missing file
  await t.test("4. Rejects request with missing file with 400", async () => {
    const req = { file: null };
    const res = createMockRes();

    await extractDocxText(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.match(res.data.error, /No Word document file uploaded/);
  });

  // 5. Rejection of unsupported file extension (.pdf, .txt, .png)
  await t.test("5. Rejects unsupported file extension with 400", async () => {
    const req = {
      file: {
        originalname: "notes.pdf",
        buffer: Buffer.from("dummy pdf data"),
        size: 14
      }
    };
    const res = createMockRes();

    await extractDocxText(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.match(res.data.error, /Only Word documents \(\.docx\) are supported/);
  });

  // 6. Rejection of empty document
  await t.test("6. Rejects empty document containing no readable text with 400", async () => {
    // Generate docx with empty paragraph
    const buffer = await createSyntheticDocx("   ");

    const req = {
      file: {
        originalname: "blank.docx",
        buffer,
        size: buffer.length
      }
    };
    const res = createMockRes();

    await extractDocxText(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.match(res.data.error, /contains no readable text/);
  });

  // 7. Rejection of corrupted / damaged docx
  await t.test("7. Rejects corrupted binary data with clean 400 error message", async () => {
    const garbageBuffer = Buffer.from([0x00, 0x11, 0x22, 0x33, 0xff, 0xfe, 0x55, 0x66]);

    const req = {
      file: {
        originalname: "corrupted.docx",
        buffer: garbageBuffer,
        size: garbageBuffer.length
      }
    };
    const res = createMockRes();

    await extractDocxText(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.match(res.data.error, /Failed to parse document/);
  });

  // 8. Warning when document exceeds 3,000 characters without truncation
  await t.test("8. Flags documents exceeding 3,000 characters with a clear warning without silent truncation", async () => {
    // Generate text with 3,500 characters
    const longText = "This is a comprehensive study reminder document for advanced students. ".repeat(50);
    assert.ok(longText.length > 3000);

    const buffer = await createSyntheticDocx(longText);

    const req = {
      file: {
        originalname: "lengthy-study-plan.docx",
        buffer,
        size: buffer.length
      }
    };
    const res = createMockRes();

    await extractDocxText(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.exceedsLimit, true);
    assert.equal(res.data.characterCount, longText.trim().length);
    assert.equal(res.data.text.length, longText.trim().length); // Never silently truncated
    assert.match(res.data.warning, /maximum single-turn speech synthesis limit is 3,000 characters/);
  });

  // 9. Speech synthesis with up to 3,000 characters succeeds
  await t.test("9. Speech synthesis accepts valid text up to 3,000 characters", async () => {
    const validLongText = "A".repeat(2500);

    // Mock TTS provider returning dummy audio buffer
    _setTtsProviderForTesting(({ text, voice }) => {
      // Returns 1-second synthetic 24kHz mono PCM (48,000 bytes)
      return Buffer.alloc(48000, 0x7f);
    });

    const req = {
      user: { _id: "6adf45c6ae55407c91f5a610" },
      body: {
        sampleText: validLongText,
        voice: "Charon",
        lang: "en"
      }
    };
    const res = createMockRes();

    await testVoicePreview(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.voice, "Charon");
    assert.ok(res.data.audioUrl.startsWith("data:audio/wav;base64,"));
  });

  // 10. Speech synthesis with text > 3,000 characters is rejected
  await t.test("10. Speech synthesis rejects text > 3,000 characters with 400", async () => {
    const oversizedText = "A".repeat(3001);

    const req = {
      user: { _id: "6adf45c6ae55407c91f5a610" },
      body: {
        sampleText: oversizedText,
        voice: "Aoede",
        lang: "en"
      }
    };
    const res = createMockRes();

    await testVoicePreview(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.success, false);
    assert.match(res.data.error, /cannot exceed 3,000 characters/);
  });

  // 11. TTS Failure Handling Sanitizes Sensitive Secrets
  await t.test("11. TTS upstream failures return safe error messages without leaking credentials", async () => {
    _setTtsProviderForTesting(() => {
      throw new Error("Google Gen AI upstream failure with url https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSySecretLeakedKey123");
    });

    const req = {
      user: { _id: "6adf45c6ae55407c91f5a610" },
      body: {
        sampleText: "A short test sentence",
        voice: "Aoede",
        lang: "en"
      }
    };
    const res = createMockRes();

    await testVoicePreview(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.data.success, false);
    assert.doesNotMatch(res.data.error, /AIzaSySecretLeakedKey123/);
    assert.match(res.data.error, /TTS service configuration error/);
  });
});
