const { GoogleGenAI } = require("@google/genai");
const { generateContentWithFallback } = require("../utils/geminiHelper");

// TODO: Implement rate limiting per user (e.g. max 20 calls/hour/user) once rate-limit middleware pattern is added.

const fixGrammar = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ message: "Text content is required." });
    }

    if (text.length > 3000) {
      return res.status(400).json({ message: "Text exceeds the 3000 characters limit." });
    }

    // Force Gemini AI Studio mode by temporarily clearing Google Cloud credentials env vars
    const tempCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const tempGha = process.env.GOOGLE_GHA_CREDS_PATH;
    const tempVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_GHA_CREDS_PATH;
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Restore them if needed
    if (tempCreds) process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCreds;
    if (tempGha) process.env.GOOGLE_GHA_CREDS_PATH = tempGha;
    if (tempVertex) process.env.GOOGLE_GENAI_USE_VERTEXAI = tempVertex;

    const promptText = `You are a strict grammar and spelling editor. Your task is to fix spelling, grammar, and punctuation errors in the provided text.
CRITICAL INSTRUCTIONS:
- Fix typos and grammar but do NOT alter the original meaning, tone, or style.
- Do NOT hallucinate words, repeat words unnecessarily, or change the intent.
- If the text has a simple typo (e.g., 'imaze' -> 'image'), just fix it.
- If the text is already correct, return it exactly as is.
- Return ONLY the corrected text without any xml tags, prefixes, or explanations.

Text to fix:
<text>
${text}
</text>`;

    const response = await generateContentWithFallback(ai, promptText, {
      temperature: 0.1,
    });

    let correctedText = response.text || "";

    // Parse model's response and clean preambles dynamically if needed
    const patternsToStrip = [
      /^here is the corrected text:\s*/i,
      /^corrected text:\s*/i,
      /^here's the corrected text:\s*/i
    ];

    let originalCorrected = correctedText;
    for (const pattern of patternsToStrip) {
      if (pattern.test(correctedText)) {
        correctedText = correctedText.replace(pattern, "");
      }
    }

    if (originalCorrected !== correctedText) {
      console.warn("[AI Grammar Fix] Stripped preamble from response:", originalCorrected);
    }

    // Strip wrapping quotes if the model wrapped the response in quotes
    if (correctedText.startsWith('"') && correctedText.endsWith('"') && correctedText.length > 1) {
      correctedText = correctedText.slice(1, -1);
    }

    res.json({ correctedText: correctedText.trim() });
  } catch (error) {
    console.error("AI Grammar Fix Error:", error);
    res.status(502).json({ message: "Grammar check is temporarily unavailable: " + error.message });
  }
};

module.exports = {
  fixGrammar,
};
