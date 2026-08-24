const { GoogleGenAI, Type } = require("@google/genai");

const chatSupport = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Chatbot Error] GEMINI_API_KEY is not defined in environment variables.");
      return res.status(500).json({ success: false, message: "Server configuration error: Missing API Key." });
    }

    // Explicitly delete any environment variables that might force the SDK into Vertex AI/ADC mode
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_GHA_CREDS_PATH;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GOOGLE_GENAI_USE_VERTEXAI;

    let ai;
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
      });
    } catch (initError) {
      console.error("[Chatbot Error] Failed to initialize GoogleGenAI SDK:", initError.message);
      return res.status(500).json({ success: false, message: "AI initialization failed." });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages array is required." });
    }

    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);

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

    // 3. Call Gemini API
    const CHAT_MODEL = "gemini-2.5-flash";
    console.log(`[Chatbot Debug] Initiating API call in chatController.js`);
    console.log(`  -> API Key Loaded: ${apiKey ? "true" : "false"}`);
    console.log(`  -> Model Name: ${CHAT_MODEL}`);
    console.log(`  -> Authentication Mode: Google AI Studio API Key`);

    let response;
    try {
      // Try with structured JSON output first
      response = await ai.models.generateContent({
        model: CHAT_MODEL,
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
    } catch (structuredError) {
      // Fallback: Gemma may not support structured JSON output, so request plain text
      console.warn(`[Chatbot] Structured output failed for ${CHAT_MODEL}, falling back to plain text mode:`, structuredError.message);
      const fallbackInstruction = systemInstruction + "\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON.";
      response = await ai.models.generateContent({
        model: CHAT_MODEL,
        contents: [
          ...formattedHistory,
          { role: "user", parts: [{ text: latestMessage }] }
        ],
        config: {
          systemInstruction: fallbackInstruction,
        }
      });
    }

    console.log(`[Chatbot Debug] API call successful. Content generated.`);

    // 4. Parse the structured JSON response
    let rawText = response.text || "";
    // Strip markdown code fences if present
    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const result = JSON.parse(rawText);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("[Chatbot Error] An error occurred while generating content:");
    console.error(`  -> Source File: chatController.js`);
    console.error(`  -> Model: gemini-2.5-flash`);
    if (error.message && error.message.includes("API key")) {
      console.error("  -> Type: Authentication Error (Invalid/Expired API Key)");
    } else if (error.message && error.message.includes("model")) {
      console.error("  -> Type: Model Reference Error");
    } else if (error.code === "ENOTFOUND" || (error.message && error.message.includes("fetch"))) {
      console.error("  -> Type: Network/Connectivity Error");
    } else if (error instanceof SyntaxError) {
      console.error("  -> Type: Structured JSON Parsing Error");
    } else {
      console.error("  -> Detail:", error.message);
    }
    console.error("  -> Stack Trace:", error.stack);

    res.status(500).json({ 
      success: false, 
      message: "Failed to generate AI response.", 
      error: error.message 
    });
  }
};

module.exports = {
  chatSupport
};
