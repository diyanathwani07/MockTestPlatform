require('dotenv').config();
const { GoogleGenAI, Type } = require("@google/genai");

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemInstruction = "You are a helpful assistant.";
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING },
        navigateTo: { type: Type.STRING, nullable: true }
      },
      required: ["text"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "how to create quiz" }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    console.log("Success:", response.text);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();
