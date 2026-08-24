const { GoogleGenAI, Type } = require("@google/genai");

// Helper to generate content trying models in priority order
const generateContentWithFallback = async (aiInstance, promptText, config = {}) => {
  const isMultimodal = Array.isArray(promptText) && promptText.some(part => typeof part === "object" && (part.inlineData || part.fileData));
  const requiresStructuredOutput = config.responseSchema || config.responseMimeType === "application/json";
  
  const models = (isMultimodal || requiresStructuredOutput)
    ? ["gemini-2.5-flash", "gemini-2.0-flash"]
    : ["gemini-2.5-flash", "gemini-2.0-flash", "gemma-2-27b-it", "gemma-2-9b-it"];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await aiInstance.models.generateContent({
        model: model,
        contents: promptText,
        config: config,
        // Fallback for some SDK configurations that expect these properties at the root level
        responseMimeType: config?.responseMimeType,
        responseSchema: config?.responseSchema,
        temperature: config?.temperature
      });
      console.log(`Successfully generated content with ${model}`);
      return response;
    } catch (error) {
      console.error(`Model ${model} failed:`, error.message);
      lastError = error;
      // If it's a 400 Bad Request, it might be an invalid schema or config, so we shouldn't keep retrying if it's a code error.
      // But for 429 Quota Exceeded or 500, we should retry.
      if (error.status === 400 && !error.message.includes("not found")) {
         throw error;
      }
    }
  }

  // If all failed, throw a detailed error
  let reason = "Unknown Error";
  if (lastError.message.includes("429") || lastError.message.includes("Quota")) {
    reason = "API Quota/Billing limit reached.";
  } else if (lastError.message.includes("API key not valid")) {
    reason = "Invalid API Key.";
  } else if (lastError.message.includes("not found")) {
    reason = "Models are not accessible with this API key/project.";
  }
  
  throw new Error(`All Gemini models failed. Reason: ${reason} Last Error: ${lastError.message}`);
};

module.exports = {
  generateContentWithFallback
};
