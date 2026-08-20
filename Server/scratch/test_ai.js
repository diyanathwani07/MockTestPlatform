require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const { generateContentWithFallback } = require("../utils/geminiHelper");

const test = async () => {
  try {
    console.log("GEMINI_API_KEY Exists:", !!process.env.GEMINI_API_KEY);
    console.log("Key Length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const promptText = "Fix only grammar, spelling, and punctuation errors in the following text. Do not change the meaning, tone, formality, or add/remove any information. Do not add explanations, greetings, or commentary. If the text is already correct, return it unchanged. Return ONLY the corrected text, nothing else.\n\nText:\nhello this are a test";
    
    console.log("Calling Gemini fallback helper...");
    const response = await generateContentWithFallback(ai, promptText, {
      temperature: 0.1,
    });
    console.log("Success! Response text:", response.text);
  } catch (error) {
    console.error("AI Error details:", error);
  }
};

test();
