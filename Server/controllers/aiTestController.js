const { GoogleGenAI } = require("@google/genai");
const { generateContentWithFallback } = require("../utils/geminiHelper");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const { enforceExpiry } = require("../utils/subscriptionUtils");
const Subscription = require("../models/Subscription");

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

    let activeSub = await Subscription.findOne({
      studentId: user._id,
      status: "active",
      expiryDate: { $gt: new Date() }
    }).populate("planId");

    let isPremium = !!user.isPremium;

    // If activeSub exists, ensure user is marked as premium and activePlan matches
    if (activeSub) {
      isPremium = true;
      let needsSave = false;
      if (!user.isPremium) {
        user.isPremium = true;
        user.premiumExpiresAt = activeSub.expiryDate;
        needsSave = true;
      }
      if (!user.activePlan || String(user.activePlan) !== String(activeSub.planId?._id || activeSub.planId)) {
        user.activePlan = activeSub.planId?._id || activeSub.planId;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }
    
    let aiTestsRemaining = 0;
    let maxAITests = 20;
    let aiTestsUsed = 0;

    if (isPremium) {
      if (!activeSub) {
        activeSub = await Subscription.findOne({
          studentId: user._id,
          status: "active"
        }).populate("planId");
      }
      
      if (activeSub) {
        maxAITests = (activeSub.maxAITests && activeSub.maxAITests > 0) 
          ? activeSub.maxAITests 
          : (activeSub.planId?.maxAITests || 20);
        aiTestsUsed = activeSub.aiTestsUsed || 0;
        aiTestsRemaining = Math.max(0, maxAITests - aiTestsUsed);
      } else {
        // Fallback for premium user with legacy active record
        maxAITests = 20;
        aiTestsUsed = 0;
        aiTestsRemaining = 20;
      }
    }

    res.json({
      isPremium,
      expiresAt: user.premiumExpiresAt || (activeSub ? activeSub.expiryDate : null),
      maxAITests,
      aiTestsUsed,
      aiTestsRemaining,
      activePlan: user.activePlan || (activeSub ? (activeSub.planId?._id || activeSub.planId) : null)
    });
  } catch (error) {
    console.error("Get Premium Status Error:", error);
    res.status(500).json({ message: "Failed to fetch premium status." });
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
      includeExplanations,
      quizType
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

    // Atomic usage reservation with 10 test default fallback for 0 maxAITests
    let activeSub = await Subscription.findOneAndUpdate(
      {
        studentId: req.user._id,
        status: "active",
        $expr: {
          $lt: [
            "$aiTestsUsed",
            { $cond: { if: { $gt: ["$maxAITests", 0] }, then: "$maxAITests", else: 10 } }
          ]
        }
      },
      {
        $inc: { aiTestsUsed: 1 }
      },
      { new: true }
    );

    if (!activeSub) {
      const checkUser = await User.findById(req.user._id);
      if (!checkUser || !checkUser.isPremium) {
        return res.status(403).json({
          message: "Premium access required. Please upgrade to use the AI Test Builder.",
          code: "PREMIUM_REQUIRED"
        });
      }
      return res.status(402).json({
        message: "You have used all AI test generations included in your plan.",
        code: "INSUFFICIENT_ALLOWANCE"
      });
    }

    let allowanceReserved = true;

    const refundAllowance = async () => {
      if (allowanceReserved) {
        await Subscription.findByIdAndUpdate(activeSub._id, { $inc: { aiTestsUsed: -1 } });
        allowanceReserved = false;
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
        await refundAllowance();
        return res.status(502).json({ message: "Failed to parse AI question output. Please try again." });
      }

      if (!resultJson.questions || !Array.isArray(resultJson.questions)) {
        await refundAllowance();
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
        await refundAllowance();
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
        publishAs: quizType || "exam",
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
        aiTestsRemaining: activeSub.maxAITests - activeSub.aiTestsUsed
      });
    } catch (innerError) {
      await refundAllowance();
      throw innerError;
    }
  } catch (error) {
    console.error("AI Test Generation Error:", error);
    res.status(500).json({ message: error.message || "Failed to generate AI custom test." });
  }
};


const { extractMaterialContent } = require("../utils/materialHelper");

async function estimateSafeQuestionCapacity(extractedText, multimodalParts, ai) {
  try {
    const prompt = "Analyze the provided source material (text and/or images). Estimate the maximum number of distinct, high-quality, factual multiple-choice questions that can be generated from it WITHOUT inventing any outside facts. Consider the density of facts, concepts, and rules in the source. Return ONLY a raw integer representing the maximum safe question count. Do not include any other text or explanation.";
    const contents = [];
    if (extractedText) contents.push(extractedText);
    if (multimodalParts && multimodalParts.length > 0) {
      contents.push(...multimodalParts);
    }
    contents.push(prompt);

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents,
      config: {
        temperature: 0.2,
        maxOutputTokens: 10
      }
    });
    
    const textOutput = response.text ? response.text().trim() : "10";
    const estimatedCapacity = parseInt(textOutput.replace(/[^0-9]/g, ""), 10);
    return Math.min(Math.max(estimatedCapacity || 0, 5), 50);
  } catch (err) {
    console.error("Capacity Estimation Error:", err);
    return 50; 
  }
}

// 3. Generate AI Test from Material
const generateFromMaterial = async (req, res) => {
  try {
    const {
      examName,
      subject,
      quantity,
      difficulty,
      language,
      followExamPattern,
      includeExplanations,
      quizType
    } = req.body;

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No material file provided." });
    }

    // Validate entitlement
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await enforceExpiry(user);

    const questionCount = parseInt(quantity, 10) || 10;
    if (![10, 20, 30, 50].includes(questionCount)) {
      return res.status(400).json({ message: "Invalid question count requested." });
    }

    // Extract material
      let extractedText = "";
      let multimodalParts = [];
      try {
        const result = await extractMaterialContent(file);
        extractedText = result.extractedText;
        multimodalParts = result.multimodalParts;
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

      // Source Capacity Validation
      const tempCredsC = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const aiC = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      if (tempCredsC) process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredsC;

      const maxSafeCount = await estimateSafeQuestionCapacity(extractedText, multimodalParts, aiC);
      
      if (questionCount > maxSafeCount) {
        return res.status(400).json({
          canGenerate: false,
          requestedCount: questionCount,
          maxSafeCount,
          message: `The uploaded source does not contain enough distinct information to safely generate ${questionCount} unique questions.`,
          code: "CAPACITY_EXCEEDED"
        });
      }

      // Atomic usage reservation with 10 test default fallback for 0 maxAITests
    const activeSub = await Subscription.findOneAndUpdate(
      {
        studentId: req.user._id,
        status: "active",
        $expr: {
          $lt: [
            "$aiTestsUsed",
            { $cond: { if: { $gt: ["$maxAITests", 0] }, then: "$maxAITests", else: 10 } }
          ]
        }
      },
      {
        $inc: { aiTestsUsed: 1 }
      },
      { new: true }
    );

    if (!activeSub) {
      const checkUser = await User.findById(req.user._id);
      if (!checkUser || !checkUser.isPremium) {
        return res.status(403).json({
          message: "Premium access required. Please upgrade to use the AI Test Builder.",
          code: "PREMIUM_REQUIRED"
        });
      }
      return res.status(402).json({
        message: "You have used all AI test generations included in your plan.",
        code: "INSUFFICIENT_ALLOWANCE"
      });
    }

    let allowanceReserved = true;

    const refundAllowance = async () => {
      if (allowanceReserved) {
        await Subscription.findByIdAndUpdate(activeSub._id, { $inc: { aiTestsUsed: -1 } });
        allowanceReserved = false;
      }
    };

    try {
      // Set defaults
      let marksPerQuestion = 1;
      let negativeMarking = 0.25;
      let duration = questionCount; 
      let markingPattern = "standard";

      if (followExamPattern === "true" || followExamPattern === true) {
        if (examName) {
          const matchQuiz = await Quiz.findOne({ examName: examName, isDeleted: { $ne: true } });
          if (matchQuiz) {
            marksPerQuestion = matchQuiz.marksPerQuestion || 1;
            negativeMarking = matchQuiz.negativeMarking || 0;
            markingPattern = matchQuiz.markingPattern || "standard";
            if (matchQuiz.duration) {
              const baseQty = matchQuiz.questions?.length || 20;
              duration = Math.max(5, Math.round((matchQuiz.duration / baseQty) * questionCount));
            }
          }
        }
      }

      const optionsCount = 4;
      const tempCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      if (tempCreds) process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCreds;

      const langRule = language === "hindi"
        ? "All questions, options, and explanations must be written in Hindi. Copy the Hindi question text to questionEnglish so both fields contain Hindi content."
        : language === "English + Hindi"
        ? "Bilingual format: questionEnglish must be written in English. questionHindi must be written in Hindi. Options and explanations should contain both languages or be written in a bilingual format where appropriate."
        : "All questions, options, and explanations must be written in English. Leave questionHindi blank.";

      let promptTemplate = `You are an expert exam question generator for competitive teacher recruitment and recruitment exams such as BPSC, CTET, and UPTET.
Generate a structured exam test with EXACTLY ${questionCount} multiple-choice questions BASED ONLY ON THE PROVIDED STUDY MATERIAL CONTENT.

Target Exam: ${examName || "Competitive Exam"}
Difficulty Level: ${difficulty || "medium"}
Explanations Required: ${includeExplanations === "true" || includeExplanations === true ? "YES" : "NO"}
Options count per question: ${optionsCount}

Language constraints:
${langRule}

CRITICAL RULES:
1. Generate questions ONLY from information supported by the uploaded source material. Do not introduce unrelated outside facts. Do not invent facts, concepts, names, dates, or rules that are not explicitly supported by the source.
2. Return ONLY a valid JSON object matching the schema below.
3. Do NOT wrap JSON in \`\`\`json block.
4. Every question must have exactly ${optionsCount} options.
5. correctAnswer must EXACTLY match the text of one option inside the options array.
6. Do NOT generate duplicate questions.

STUDY MATERIAL CONTENT:
"""
${extractedText || "(Use the provided image(s) as the study material)"}
"""

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

      let finalPrompt = [{ text: promptTemplate }];
      if (multimodalParts.length > 0) {
        finalPrompt.push(...multimodalParts);
      }

      const response = await generateContentWithFallback(ai, finalPrompt, {
        responseMimeType: "application/json",
        temperature: 0.2 // Lower temp for factual extraction
      });

      let rawText = response.text || "";
      rawText = rawText.trim();
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
      }

      let resultJson;
      try {
        resultJson = JSON.parse(rawText);
      } catch (e) {
        await refundAllowance();
        return res.status(502).json({ message: "Failed to parse AI question output. Please try again." });
      }

      if (!resultJson.questions || !Array.isArray(resultJson.questions)) {
        await refundAllowance();
        return res.status(502).json({ message: "Invalid JSON format returned by AI." });
      }

      let validatedQuestions = [];
      for (const q of resultJson.questions) {
        if (!q.questionEnglish && !q.questionHindi) continue;
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) continue;
        if (!q.correctAnswer) continue;

        const cleanOptions = q.options.map(opt => String(opt).trim());
        let matchIndex = cleanOptions.findIndex(opt => opt.toLowerCase() === String(q.correctAnswer).trim().toLowerCase());
        
        if (matchIndex === -1) {
          const correctText = String(q.correctAnswer).trim();
          const letterLabels = ["a)", "b)", "c)", "d)", "e)"];
          const labelMatch = letterLabels.findIndex(l => l.toLowerCase() === correctText.toLowerCase());
          if (labelMatch !== -1 && labelMatch < cleanOptions.length) {
            q.correctAnswer = cleanOptions[labelMatch];
          } else {
            continue;
          }
        } else {
          q.correctAnswer = cleanOptions[matchIndex];
        }

        if (includeExplanations === "true" || includeExplanations === true) {
           if (!q.explanation || typeof q.explanation !== "string" || q.explanation.trim() === "") {
             continue;
           }
        }

        validatedQuestions.push(q);
      }

      if (validatedQuestions.length < questionCount) {
        await refundAllowance();
        return res.status(502).json({ message: `AI generated ${validatedQuestions.length} valid questions but you requested ${questionCount}. Please try again.` });
      }

      const finalQuestions = validatedQuestions.slice(0, questionCount);

      const customQuiz = await Quiz.create({
        title: `AI Test from Material: ${file.originalname}`,
        subject: subject || "Custom Material",
        examName: examName || "AI Generated Test",
        description: `AI generated custom test extracted from ${file.originalname}.`,
        duration,
        marksPerQuestion,
        negativeMarking,
        markingPattern,
        published: true,
        status: "Published",
        quizType: "custom",
        isAiGenerated: true,
        publishAs: quizType || "exam",
        createdBy: req.user._id,
        questions: finalQuestions.map(q => ({
          questionEnglish: q.questionEnglish,
          questionHindi: q.questionHindi || "",
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || "",
          difficulty: difficulty || "medium",
          subject: subject || "Custom Material"
        })),
        isModular: false
      });

      res.status(201).json({
        success: true,
        message: "AI Test generated successfully from material!",
        quizId: customQuiz._id,
        aiTestsRemaining: activeSub.maxAITests - activeSub.aiTestsUsed
      });
    } catch (innerError) {
      await refundAllowance();
      throw innerError;
    }
  } catch (error) {
    console.error("AI Material Generation Error:", error);
    res.status(500).json({ message: error.message || "Failed to generate test from material." });
  }
};



module.exports = {
  getPremiumStatus,
  generateAITest,
  generateFromMaterial
};

