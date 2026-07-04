const { GoogleGenAI, Type } = require("@google/genai");

// Initialize Gemini API Client
// Note: Ensure GEMINI_API_KEY is present in your Server/.env file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const chatSupport = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages array is required." });
    }

    const isAdmin = req.user && req.user.role === "admin";

    // 1. Define a strict System Prompt based on role
    let systemInstruction = "";
    let responseSchema = {};

    if (isAdmin) {
      systemInstruction = `
        You are the official AI Admin Assistant for the 'Teaching Pariksha' Mock Test platform.
        Your job is to help the admin navigate the dashboard and understand how to manage the platform.
        
        RULES:
        1. If the admin asks how to do something (e.g., create a quiz, view users, check reports, ban a student), explain it briefly and provide the appropriate navigation path in 'navigateTo'.
        2. Valid navigation paths are: "/admin/dashboard", "/admin/users", "/admin/create-quiz", "/admin/manage-quizzes", "/admin/questions", "/admin/results", "/admin/reports", "/admin/tickets", "/admin/audit-log".
        3. If no navigation is needed, set 'navigateTo' to null.
        4. If the question is unrelated to the admin panel, politely redirect them.
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The response message to the admin."
          },
          navigateTo: {
            type: Type.STRING,
            description: "The React Router path to navigate to, or null if no navigation is required.",
            nullable: true
          }
        },
        required: ["text"]
      };
    } else {
      systemInstruction = `
        You are the official AI Support Assistant for the 'Teaching Pariksha' Mock Test platform.
        Your job is to help students with questions about the platform (e.g., how to start a test, view results, calculate scores, reset password, etc.).
        
        RULES:
        1. You must ONLY answer questions related to the Teaching Pariksha platform, mock tests, account issues, or exam preparation on this site.
        2. If the user asks about unrelated topics (e.g., coding, general knowledge, outside news, etc.), politely refuse to answer and redirect them back to platform-related help.
        3. If you do not know the answer to a platform-related question, or if they need human assistance, say so and set offerTicket to true.
        4. Keep your responses concise, friendly, and highly helpful.
      `;
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The response message to the user."
          },
          offerTicket: {
            type: Type.BOOLEAN,
            description: "Set to true if the user needs human support, has an issue you can't solve, or asks an unrelated question. Otherwise false."
          }
        },
        required: ["text", "offerTicket"]
      };
    }

    // 2. Format messages for GenAI (convert sender "bot"/"user" to role "model"/"user")
    const formattedHistory = messages.slice(0, -1).map(msg => ({
      role: msg.sender === "bot" ? "model" : "user",
      parts: [{ text: msg.text }]
    }));

    const latestMessage = messages[messages.length - 1].text;

    // 3. Call Gemini API with Structured Outputs (JSON Schema)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: latestMessage }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    // 4. Parse the structured JSON response
    const result = JSON.parse(response.text);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate AI response." });
  }
};

module.exports = {
  chatSupport
};
