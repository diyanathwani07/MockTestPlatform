const { GoogleGenAI } = require("@google/genai");
const { generateContentWithFallback } = require("../utils/geminiHelper");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const { enforceExpiry } = require("../utils/subscriptionUtils");

// 1. Get Premium Status
const getPremiumStatus = async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const flipped = await enforceExpiry(user);
    if (flipped) {
      user = await User.findById(user._id);
    }

    res.json({
      isPremium: !!user.isPremium,
      aiCredits: user.aiCredits || 0,
      activePlan: user.activePlan || null
    });
  } catch (error) {
    console.error("Get Premium Status Error:", error);
    res.status(500).json({ message: "Failed to load premium status." });
  }
};

// Helper function to validate a single question object
const validateQuestionObj = (q, optionsCount, includeExplanations) => {
  if (!q.questionEnglish || typeof q.questionEnglish !== "string" || q.questionEnglish.trim() === "") {
    return false;
  }
  if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
    return false;
  }
  // Trim options and remove empty values
  const cleanOptions = q.options.map(o => String(o).trim()).filter(Boolean);
  if (cleanOptions.length !== q.options.length) {
    return false;
  }
  // Check duplicate options
  const uniqueOpts = new Set(cleanOptions);
  if (uniqueOpts.size !== cleanOptions.length) {
    return false;
  }
  if (!q.correctAnswer || typeof q.correctAnswer !== "string" || q.correctAnswer.trim() === "") {
    return false;
  }
  
  // Find correct answer match inside options
  const correctText = q.correctAnswer.trim();
  const matchIndex = cleanOptions.findIndex(o => o.toLowerCase() === correctText.toLowerCase());
  
  if (matchIndex === -1) {
    // Check if correct answer is specified as Option letter label (A, B, C, D, E)
    const letterLabels = ["A", "B", "C", "D", "E", "F"];
    const labelMatch = letterLabels.findIndex(l => l.toLowerCase() === correctText.toLowerCase());
    if (labelMatch !== -1 && labelMatch < cleanOptions.length) {
      // Re-map correct answer to option text string for our backend model compatibility
      q.correctAnswer = cleanOptions[labelMatch];
    } else {
      return false;
    }
  } else {
    // Normalization
    q.correctAnswer = cleanOptions[matchIndex];
  }

  if (includeExplanations && (!q.explanation || typeof q.explanation !== "string" || q.explanation.trim() === "")) {
    return false;
  }

  return true;
};

// 2. Generate AI Test
const generateAITest = async (req, res) => {
  try {
    const {
      examName,
      subject,
      topic,
      quantity,
      difficulty,
      language,
      followExamPattern,
      includeExplanations
    } = req.body;

    // Validate entitlement
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await enforceExpiry(user);

    const questionCount = parseInt(quantity, 10) || 10;
    if (![10, 20, 30, 50].includes(questionCount)) {
      return res.status(400).json({ message: "Invalid question count requested. Choose 10, 20, 30 or 50." });
    }

    // Atomic credit reservation to prevent race conditions
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        isPremium: true,
        aiCredits: { $gte: questionCount }
      },
      {
        $inc: { aiCredits: -questionCount }
      },
      { new: true }
    );

    if (!updatedUser) {
      // Check why it failed for accurate error message
      const checkUser = await User.findById(req.user._id);
      if (!checkUser) return res.status(404).json({ message: "User not found." });
      if (!checkUser.isPremium) {
        return res.status(403).json({
          message: "Premium access required. Please upgrade to use the AI Test Builder.",
          code: "PREMIUM_REQUIRED"
        });
      }
      return res.status(402).json({
        message: `Insufficient AI credits. You have ${checkUser.aiCredits} credits remaining, but this test requires ${questionCount} credits.`,
        code: "INSUFFICIENT_CREDITS"
      });
    }

    let creditsReserved = true;
    const creditsDeducted = questionCount;

    const refundCredits = async () => {
      if (creditsReserved) {
        await User.findByIdAndUpdate(req.user._id, { $inc: { aiCredits: creditsDeducted } });
        creditsReserved = false;
      }
    };

    try {
      // Set default test settings
      let marksPerQuestion = 1;
      let negativeMarking = 0.25;
      let duration = questionCount; // approx 1 min per question
      let markingPattern = "standard";

      // Load exam configuration from backend if requested
      if (followExamPattern && examName) {
        const matchQuiz = await Quiz.findOne({ examName: examName, isDeleted: { $ne: true } });
        if (matchQuiz) {
          marksPerQuestion = matchQuiz.marksPerQuestion || 1;
          negativeMarking = matchQuiz.negativeMarking || 0;
          markingPattern = matchQuiz.markingPattern || "standard";
          if (matchQuiz.duration) {
            // Scale duration based on question count ratio
            const baseQty = matchQuiz.questions?.length || 20;
            duration = Math.max(5, Math.round((matchQuiz.duration / baseQty) * questionCount));
          }
        }
      }

      // Determine options details
      const optionsCount = (markingPattern === "bpsc") ? 5 : 4;

      // Clear Vertex environments to force Gemini AI Studio mode
      const tempCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const tempGha = process.env.GOOGLE_GHA_CREDS_PATH;
      const tempVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_GHA_CREDS_PATH;
      delete process.env.GOOGLE_GENAI_USE_VERTEXAI;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Restore credentials
      if (tempCreds) process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCreds;
      if (tempGha) process.env.GOOGLE_GHA_CREDS_PATH = tempGha;
      if (tempVertex) process.env.GOOGLE_GENAI_USE_VERTEXAI = tempVertex;

      // Define the bilingual and formatting rules
      const langRule = language === "hindi"
        ? "All questions, options, and explanations must be written in Hindi. Copy the Hindi question text to questionEnglish so both fields contain Hindi content."
        : language === "English + Hindi"
        ? "Bilingual format: questionEnglish must be written in English. questionHindi must be written in Hindi. Options and explanations should contain both languages or be written in a bilingual format where appropriate."
        : "All questions, options, and explanations must be written in English. Leave questionHindi blank.";

      const promptText = `You are an expert exam question generator for competitive teacher recruitment and recruitment exams such as BPSC, CTET, and UPTET.
Generate a structured exam test with EXACTLY ${questionCount} multiple-choice questions.

Subject: ${subject}
Topic: ${topic || "General"}
Target Exam: ${examName || "Competitive Exam"}
Difficulty Level: ${difficulty || "medium"} (Generate appropriate depth)
Explanations Required: ${includeExplanations ? "YES" : "NO"}
Options count per question: ${optionsCount}

Language constraints:
${langRule}

CRITICAL RULES:
1. Return ONLY a valid JSON object matching the schema below.
2. Do NOT wrap JSON in \`\`\`json block.
3. Every question must have exactly ${optionsCount} options.
4. correctAnswer must EXACTLY match the text of one option inside the options array.
5. Do NOT generate duplicate questions.
6. Make questions professional, pedagogical, and syllabus-based rather than general trivia.

JSON Schema format:
{
  "questions": [
    {
      "questionEnglish": "...",
      "questionHindi": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "...",
      "explanation": "..."
    }
  ]
}`;

      // Generate content
      const response = await generateContentWithFallback(ai, promptText, {
        responseMimeType: "application/json",
        temperature: 0.7
      });

      let rawText = response.text || "";
      // Clean any backticks or preambles just in case
      rawText = rawText.trim();
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      }

      let resultJson;
      try {
        resultJson = JSON.parse(rawText);
      } catch (e) {
        console.error("AI JSON Parse Failure. Raw response:", rawText);
        await refundCredits();
        return res.status(502).json({ message: "Failed to parse AI question output. Please try again." });
      }

      if (!resultJson.questions || !Array.isArray(resultJson.questions)) {
        await refundCredits();
        return res.status(502).json({ message: "AI response did not contain questions list." });
      }

      // Quality Validation & Filtering
      const validatedQuestions = [];
      const seenQuestions = new Set();

      for (const q of resultJson.questions) {
        const isValid = validateQuestionObj(q, optionsCount, includeExplanations);
        if (isValid) {
          const uniqueKey = q.questionEnglish.trim().toLowerCase();
          if (!seenQuestions.has(uniqueKey)) {
            seenQuestions.add(uniqueKey);
            validatedQuestions.push(q);
          }
        }
      }

      console.log(`Validated questions: ${validatedQuestions.length} out of ${resultJson.questions.length}`);

      // If validated questions are less than required, we reject or try a fallback (MVP: reject with retry message if too few, or save what we have if close)
      if (validatedQuestions.length < Math.max(5, Math.round(questionCount * 0.7))) {
        await refundCredits();
        return res.status(502).json({ message: "AI generated too many invalid or duplicate questions. Please try again." });
      }

      // Slice to exact quantity
      const finalQuestions = validatedQuestions.slice(0, questionCount);

      // Create the Custom Quiz
      const customQuiz = await Quiz.create({
        title: `AI Test: ${subject} - ${topic || "General"}`,
        subject,
        examName: examName || "AI Generated Test",
        description: `AI generated custom test for ${subject} (${topic || "General"}). Difficulty: ${difficulty}.`,
        duration,
        marksPerQuestion,
        negativeMarking,
        markingPattern,
        published: true,
        status: "Published",
        quizType: "custom",
        isAiGenerated: true,
        publishAs: "exam",
        createdBy: req.user._id,
        questions: finalQuestions.map(q => ({
          questionEnglish: q.questionEnglish,
          questionHindi: q.questionHindi || "",
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "",
          difficulty: difficulty || "medium",
          subject: subject
        })),
        isModular: false
      });

      res.status(201).json({
        success: true,
        message: "AI Test generated successfully!",
        quizId: customQuiz._id,
        creditsRemaining: updatedUser.aiCredits
      });
    } catch (innerError) {
      await refundCredits();
      throw innerError;
    }
  } catch (error) {
    console.error("AI Test Generation Error:", error);
    res.status(500).json({ message: error.message || "Failed to generate AI custom test." });
  }
};

module.exports = {
  getPremiumStatus,
  generateAITest
};
