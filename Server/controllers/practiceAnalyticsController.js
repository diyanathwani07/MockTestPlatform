const PracticeResult = require("../models/PracticeResult");
const User = require("../models/User");
const PracticeQuiz = require("../models/PracticeQuiz");
const { GoogleGenAI, Type } = require("@google/genai");

// @desc    Save a practice test session result
// @route   POST /api/practice/history
// @access  Private
const savePracticeResult = async (req, res) => {
  try {
    const { quizId, stats, wrongQuestions } = req.body;
    const userId = req.user._id;

    if (!quizId || !stats) {
      return res.status(400).json({ message: "quizId and stats are required." });
    }

    const quiz = await PracticeQuiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Practice Quiz not found." });
    }

    // Determine max questions to clamp statistics
    let maxQuestions = (quiz.questions || []).length;
    if (quiz.isModular && quiz.sections && quiz.sections.length > 0) {
      const Section = require("../models/Section");
      let modularCount = 0;
      for (const secRef of quiz.sections) {
        const secId = secRef.sectionId || secRef._id || secRef;
        if (secId) {
          try {
            const section = await Section.findById(secId);
            if (section) {
              modularCount += (section.questions || []).length;
            }
          } catch (e) {}
        }
      }
      if (modularCount > 0) {
        maxQuestions = modularCount;
      }
    }

    // Sanity check/clamp stats to prevent XP/streak forgery
    const totalQuestionsClean = Math.min(stats.totalQuestions || 0, maxQuestions || 100);
    const firstTryCorrectClean = Math.min(stats.firstTryCorrect || 0, totalQuestionsClean);
    const multipleTriesClean = Math.min(stats.multipleTries || 0, totalQuestionsClean - firstTryCorrectClean);
    const accuracyClean = totalQuestionsClean > 0 ? Number(((firstTryCorrectClean / totalQuestionsClean) * 100).toFixed(2)) : 0;

    // Save the practice result record
    const practiceResult = new PracticeResult({
      userId,
      practiceQuizId: quizId,
      title: quiz.title,
      subject: quiz.subject,
      difficulty: quiz.difficulty || "Medium",
      stats: {
        totalQuestions: totalQuestionsClean,
        firstTryCorrect: firstTryCorrectClean,
        multipleTries: multipleTriesClean,
        totalWrongAttempts: stats.totalWrongAttempts || 0,
        totalAttemptsAll: stats.totalAttemptsAll || 0,
        timeSpent: stats.timeSpent || 0,
        accuracy: accuracyClean,
      },
      wrongQuestions: wrongQuestions || [],
    });

    await practiceResult.save();

    // Update User XP and streaks
    const user = await User.findById(userId);
    if (user) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const xpEarned = 50 + (stats.firstTryCorrect * 10);
      user.totalXp = (user.totalXp || 0) + xpEarned;

      if (user.lastPracticeDate) {
        const lastDate = new Date(user.lastPracticeDate);
        const lastPracticeMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
        const diffDays = Math.round((today - lastPracticeMidnight) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Increment streak
          user.practiceStreak = (user.practiceStreak || 0) + 1;
          if (user.practiceStreak > (user.longestStreak || 0)) {
            user.longestStreak = user.practiceStreak;
          }
        } else if (diffDays > 1) {
          // Reset streak
          user.practiceStreak = 1;
        }
        // If diffDays === 0, keep current streak
      } else {
        user.practiceStreak = 1;
        user.longestStreak = 1;
      }

      user.lastPracticeDate = now;
      await user.save();
    }

    res.status(201).json({ success: true, practiceResult });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get user practice history with optional filter parameters
// @route   GET /api/practice/history
// @access  Private
const getPracticeHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subject, difficulty, accuracy, date } = req.query;

    const query = { userId };

    if (subject) query.subject = subject;
    if (difficulty) query.difficulty = difficulty;
    
    if (accuracy) {
      // accuracy query can be 'high' (>=80), 'medium' (50-80), 'low' (<50)
      if (accuracy === "high") {
        query["stats.accuracy"] = { $gte: 80 };
      } else if (accuracy === "medium") {
        query["stats.accuracy"] = { $gte: 50, $lt: 80 };
      } else if (accuracy === "low") {
        query["stats.accuracy"] = { $lt: 50 };
      }
    }

    if (date) {
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const endOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const history = await PracticeResult.find(query).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get aggregated weak topics, streaks, solved stats, and achievements
// @route   GET /api/practice/analytics
// @access  Private
const getPracticeAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const results = await PracticeResult.find({ userId });
    const user = await User.findById(userId);

    // Calculate aggregated stats
    const totalSessions = results.length;
    let totalQuestionsSolved = 0;
    let totalIncorrectQuestions = 0;
    let sumAccuracy = 0;
    let sumAttempts = 0;
    let totalHoursPracticed = 0;

    const subjectStats = {}; // { subject: { total: 0, firstTryCorrect: 0, attempts: 0 } }

    results.forEach(r => {
      totalQuestionsSolved += r.stats.totalQuestions;
      sumAccuracy += r.stats.accuracy;
      sumAttempts += r.stats.totalAttemptsAll;
      totalHoursPracticed += (r.stats.timeSpent / 3600);

      // Collect wrong questions still incorrect (not resolved)
      const wrongIds = r.wrongQuestions.map(q => q.questionId);
      const resolvedIds = r.resolvedQuestions || [];
      const stillWrongCount = wrongIds.filter(id => !resolvedIds.includes(id)).length;
      totalIncorrectQuestions += stillWrongCount;

      // Subject aggregate
      if (!subjectStats[r.subject]) {
        subjectStats[r.subject] = { total: 0, firstTryCorrect: 0, attempts: 0 };
      }
      subjectStats[r.subject].total += r.stats.totalQuestions;
      subjectStats[r.subject].firstTryCorrect += r.stats.firstTryCorrect;
      subjectStats[r.subject].attempts += r.stats.totalAttemptsAll;
    });

    const averageAccuracy = totalSessions > 0 ? Math.round(sumAccuracy / totalSessions) : 0;
    const averageAttempts = totalQuestionsSolved > 0 ? (sumAttempts / totalQuestionsSolved).toFixed(1) : 0;

    const strongTopics = [];
    const weakTopics = [];

    Object.keys(subjectStats).forEach(subj => {
      const statsObj = subjectStats[subj];
      const accuracy = statsObj.total > 0 ? Math.round((statsObj.firstTryCorrect / statsObj.total) * 100) : 0;
      const avgAttempts = statsObj.total > 0 ? (statsObj.attempts / statsObj.total).toFixed(1) : 0;
      
      const topicInfo = {
        name: subj,
        accuracy,
        avgAttempts,
        totalQuestions: statsObj.total
      };

      if (accuracy >= 70) {
        strongTopics.push(topicInfo);
      } else {
        weakTopics.push(topicInfo);
      }
    });

    // Check user achievements
    const achievements = [
      { id: "first_practice", name: "First Practice", icon: "🏆", description: "Completed your first practice test run.", unlocked: totalSessions > 0 },
      { id: "100_solved", name: "100 Questions Solved", icon: "🏆", description: "Solved 100 or more practice questions cumulative.", unlocked: totalQuestionsSolved >= 100 },
      { id: "90_accuracy", name: "90% Accuracy", icon: "🏆", description: "Achieved 90% or above accuracy in a session.", unlocked: results.some(r => r.stats.accuracy >= 90) },
      { id: "7_day_streak", name: "7-Day Streak", icon: "🏆", description: "Achieved a consecutive practice streak of 7 days.", unlocked: (user?.longestStreak || 0) >= 7 },
      { id: "subject_master", name: "Subject Master", icon: "🏆", description: "Finished practice modules with >= 85% accuracy in any subject.", unlocked: Object.values(subjectStats).some(s => (s.firstTryCorrect / s.total) >= 0.85) }
    ];

    res.json({
      streak: {
        current: user?.practiceStreak || 0,
        longest: user?.longestStreak || 0,
      },
      stats: {
        totalSessions,
        totalQuestionsSolved,
        totalIncorrectQuestions,
        averageAccuracy,
        averageAttempts,
        totalHoursPracticed: totalHoursPracticed.toFixed(1),
        xp: user?.totalXp || 0,
      },
      strongTopics,
      weakTopics,
      achievements
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get unresolved weak/incorrect questions
// @route   GET /api/practice/wrong-questions
// @access  Private
const getWrongQuestions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all practice results for user
    const results = await PracticeResult.find({ userId });

    const questionsMap = {}; // Use Map to prevent duplicates across multiple sessions

    results.forEach(result => {
      const resolved = result.resolvedQuestions || [];
      result.wrongQuestions.forEach(q => {
        if (!resolved.includes(q.questionId)) {
          questionsMap[q.questionId] = {
            ...q.toObject(),
            quizId: result.practiceQuizId,
            resultId: result._id,
            subject: result.subject,
            difficulty: result.difficulty
          };
        }
      });
    });

    res.json(Object.values(questionsMap));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Resolve a wrong question (student answered correctly on first try during revision)
// @route   POST /api/practice/wrong-questions/resolve
// @access  Private
const resolveWrongQuestion = async (req, res) => {
  try {
    const userId = req.user._id;
    const { questionId, resultId } = req.body;

    if (!questionId) {
      return res.status(400).json({ message: "questionId is required." });
    }

    if (resultId) {
      // Resolve inside the specific result record
      const result = await PracticeResult.findOne({ _id: resultId, userId });
      if (result) {
        if (!result.resolvedQuestions.includes(questionId)) {
          result.resolvedQuestions.push(questionId);
          await result.save();
        }
      }
    } else {
      // Resolve across all results containing this question ID
      const results = await PracticeResult.find({ userId, "wrongQuestions.questionId": questionId });
      for (let result of results) {
        if (!result.resolvedQuestions.includes(questionId)) {
          result.resolvedQuestions.push(questionId);
          await result.save();
        }
      }
    }

    res.json({ success: true, message: "Question marked as resolved successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Toggle a question's bookmark status
// @route   POST /api/practice/bookmarks
// @access  Private
const toggleBookmark = async (req, res) => {
  try {
    const userId = req.user._id;
    const { quizId, questionId, questionEnglish, questionHindi, options, correctAnswer, explanations } = req.body;

    if (!questionId || !questionEnglish || !options || !correctAnswer) {
      return res.status(400).json({ message: "Missing required bookmark details." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const existingIndex = user.bookmarkedQuestions.findIndex(q => q.questionId === questionId);

    if (existingIndex > -1) {
      // Remove bookmark
      user.bookmarkedQuestions.splice(existingIndex, 1);
      await user.save();
      return res.json({ success: true, bookmarked: false, message: "Bookmark removed." });
    } else {
      // Add bookmark
      user.bookmarkedQuestions.push({
        quizId,
        questionId,
        questionEnglish,
        questionHindi: questionHindi || "",
        options,
        correctAnswer,
        explanations: explanations || {}
      });
      await user.save();
      return res.json({ success: true, bookmarked: true, message: "Bookmark added." });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all bookmarked questions for user
// @route   GET /api/practice/bookmarks
// @access  Private
const getBookmarks = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("bookmarkedQuestions.quizId", "title subject");
    res.json(user?.bookmarkedQuestions || []);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Explain question details using AI Tutor with customized mode options
// @route   POST /api/practice/ai-explain
// @access  Private
const getAiTutorExplanation = async (req, res) => {
  try {
    const { question, mode } = req.body;
    if (!question || !mode) {
      return res.status(400).json({ message: "question and mode are required." });
    }

    // Fetch the original question from DB using question._id to bypass any client-side tampering / obfuscation
    let dbQuestion = null;
    if (question._id) {
      const Question = require("../models/Question");
      dbQuestion = await Question.findById(question._id);
      if (!dbQuestion) {
        const PracticeQuiz = require("../models/PracticeQuiz");
        const parentQuiz = await PracticeQuiz.findOne({ "questions._id": question._id });
        if (parentQuiz) {
          dbQuestion = parentQuiz.questions.find(q => q._id.toString() === question._id.toString());
        }
      }
    }

    const finalQuestionText = (dbQuestion ? (dbQuestion.questionEnglish || dbQuestion.english) : question.questionEnglish) || "";
    const finalQuestionHindi = (dbQuestion ? (dbQuestion.questionHindi || dbQuestion.hindi) : question.questionHindi) || "";
    const finalOptions = (dbQuestion ? dbQuestion.options : question.options) || [];
    let resolvedCorrectAnswer = (dbQuestion ? dbQuestion.correctAnswer : question.correctAnswer) || "";
    
    // Resolve letter / Option keys to actual option text
    if (["A", "B", "C", "D"].includes(resolvedCorrectAnswer) && finalOptions.length > 0) {
      const idxMap = { "A": 0, "B": 1, "C": 2, "D": 3 };
      resolvedCorrectAnswer = finalOptions[idxMap[resolvedCorrectAnswer]] || resolvedCorrectAnswer;
    } else if (typeof resolvedCorrectAnswer === "string" && resolvedCorrectAnswer.startsWith("Option ") && finalOptions.length > 0) {
      const optNum = parseInt(resolvedCorrectAnswer.replace("Option ", ""), 10);
      if (!isNaN(optNum) && optNum >= 1 && optNum <= finalOptions.length) {
        resolvedCorrectAnswer = finalOptions[optNum - 1] || resolvedCorrectAnswer;
      }
    } else if (typeof resolvedCorrectAnswer === "string" && resolvedCorrectAnswer.startsWith("Option") && finalOptions.length > 0) {
      // Handle Option1, Option2, Option3, Option4 (no space)
      const optNum = parseInt(resolvedCorrectAnswer.replace("Option", ""), 10);
      if (!isNaN(optNum) && optNum >= 1 && optNum <= finalOptions.length) {
        resolvedCorrectAnswer = finalOptions[optNum - 1] || resolvedCorrectAnswer;
      }
    } else if (question.correctAnswerObfuscated && finalOptions.length > 0) {
      try {
        const decoded = Buffer.from(question.correctAnswerObfuscated, "base64").toString("utf-8");
        resolvedCorrectAnswer = decoded;
      } catch (e) {
        console.error("Failed to decode obfuscated correct answer in AI explain:", e);
      }
      
      // Post-decode letter/Option check
      if (["A", "B", "C", "D"].includes(resolvedCorrectAnswer)) {
        const idxMap = { "A": 0, "B": 1, "C": 2, "D": 3 };
        resolvedCorrectAnswer = finalOptions[idxMap[resolvedCorrectAnswer]] || resolvedCorrectAnswer;
      } else if (typeof resolvedCorrectAnswer === "string" && resolvedCorrectAnswer.startsWith("Option ") && finalOptions.length > 0) {
        const optNum = parseInt(resolvedCorrectAnswer.replace("Option ", ""), 10);
        if (!isNaN(optNum) && optNum >= 1 && optNum <= finalOptions.length) {
          resolvedCorrectAnswer = finalOptions[optNum - 1] || resolvedCorrectAnswer;
        }
      }
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

    let instruction = "";
    switch (mode) {
      case "beginner":
        instruction = "Explain this question and concept like I'm a beginner using extremely easy analogies.";
        break;
      case "simple":
        instruction = "Explain this concept in very simple, clear, concise language.";
        break;
      case "real-world":
        instruction = "Provide a practical, real-world example illustrating the concept in this question.";
        break;
      case "memory-trick":
        instruction = "Provide a mnemonic device, acronym, or memory trick to easily remember this concept.";
        break;
      case "incorrect-options":
        instruction = "Explain step-by-step why each of the incorrect options is wrong.";
        break;
      case "combined-structured":
        instruction = "Generate a JSON explanation object. Provide 'correct': a very short, single-sentence (maximum 15 words) explanation of why the correct answer is correct. Do NOT restate the option name or value in the explanation. Keep it extremely brief. Under 'incorrect', map the letters 'A', 'B', 'C', 'D' (representing the first, second, third, and fourth options respectively) to a very short, single-sentence/one-line (maximum 15 words) explanation of why that option is incorrect. Do NOT explain the correct option under incorrect.";
        break;
      case "interview":
        instruction = "Provide a common interview question and answer related to the concept in this question.";
        break;
      case "hindi":
        instruction = "Explain this question, correct answer, and explanation in simple Hindi.";
        break;
      case "marathi":
        instruction = "Explain this question, correct answer, and explanation in simple Marathi.";
        break;
      case "similar-question":
        instruction = "Generate a brand new multiple-choice practice question testing the exact same concept, with 4 options and the correct answer. Format your response as a JSON object with properties: questionEnglish, options (array of 4 strings), correctAnswer (exact string matching one option), and explanation.";
        break;
      default:
        instruction = "Explain this question and concept.";
    }

    const promptText = `
You are an expert tutor.
Here is the practice question context:
Question: ${finalQuestionText}
Hindi translation if available: ${finalQuestionHindi || "N/A"}
Options: ${JSON.stringify(finalOptions)}
Correct Answer: ${resolvedCorrectAnswer}
Provided explanations: ${JSON.stringify((dbQuestion ? dbQuestion.explanations : question.explanations) || {})}

Task: ${instruction}

CRITICAL: Return ONLY a valid JSON object matching the requested schema. Do NOT wrap the JSON inside markdown blocks, and do NOT add any conversational explanation or introduction. Just output raw JSON.
`;

    let responseConfig = {};
    if (mode === "similar-question") {
      responseConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questionEnglish: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["questionEnglish", "options", "correctAnswer", "explanation"]
        }
      };
    } else if (mode === "combined-structured") {
      responseConfig = {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correct: { type: Type.STRING, description: "Strictly a single-sentence/one-line explanation of the correct answer" },
            incorrect: {
              type: Type.OBJECT,
              properties: {
                A: { type: Type.STRING, description: "Explanation for Option A (if incorrect)" },
                B: { type: Type.STRING, description: "Explanation for Option B (if incorrect)" },
                C: { type: Type.STRING, description: "Explanation for Option C (if incorrect)" },
                D: { type: Type.STRING, description: "Explanation for Option D (if incorrect)" }
              }
            }
          },
          required: ["correct", "incorrect"]
        }
      };
    }

    const { generateContentWithFallback } = require("../utils/geminiHelper");
    const response = await generateContentWithFallback(ai, promptText, {
      responseMimeType: mode === "combined-structured" || mode === "similar-question" ? "application/json" : undefined,
      responseSchema: mode === "combined-structured" ? {
        type: Type.OBJECT,
        properties: {
          correct: { type: Type.STRING, description: "Strictly a single-sentence/one-line explanation of the correct answer" },
          incorrect: {
            type: Type.OBJECT,
            properties: {
              A: { type: Type.STRING, description: "Explanation for Option A" },
              B: { type: Type.STRING, description: "Explanation for Option B" },
              C: { type: Type.STRING, description: "Explanation for Option C" },
              D: { type: Type.STRING, description: "Explanation for Option D" }
            }
          }
        },
        required: ["correct", "incorrect"]
      } : (mode === "similar-question" ? responseConfig.responseSchema : undefined),
      temperature: 0.3
    });

    let resultValue = response.text;
    if (mode === "combined-structured") {
      try {
        resultValue = JSON.parse(response.text);
      } catch (pe) {
        console.warn("[WARNING] Failed to parse structured JSON explanation response text directly. Extracting via fallback parser:", pe);
        
        // Custom parser to split conversational model outputs into structured JSON correct/incorrect explanations
        const cleanText = response.text || "";
        let correctText = "";
        const incorrectExplanations = {};
        
        // 1. Try to find the correct answer statement or summary section
        const correctMatch = cleanText.match(/(?:correct answer is|why the correct answer|correct:)\s*([^\n]+)/i) || 
                             cleanText.match(/(\*\*[^*]+\*\* is the correct answer[^\n]+)/i);
        if (correctMatch) {
          correctText = correctMatch[1].trim();
        } else {
          // If no specific tag, use the first paragraph or overall text as summary
          const paragraphs = cleanText.split("\n\n").map(p => p.trim()).filter(Boolean);
          correctText = paragraphs[0] || "This option is correct.";
        }
        
        // 2. Parse option explanations mapping: search for options labels (A, B, C, D) or option texts
        question.options.forEach((opt, idx) => {
          const letter = ["A", "B", "C", "D"][idx];
          if (opt === question.correctAnswer) return;
          
          // Try regex lookups for the option identifier:
          // e.g., "1. String:", "**String:**", "* Home Tool...", "option A:"
          const escapedOpt = opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const optionRegex = new RegExp(
            `(?:option\\s*${letter}|${idx + 1}\\.|\\*\\*${letter}\\*\\*|\\*\\s*\\*\\*${escapedOpt}\\*\\*|\\*\\s*${escapedOpt}|\\*\\*${escapedOpt}\\*\\*)[^:\\n]*[:\\-]?\\s*([^\\n]+)`,
            "i"
          );
          const optMatch = cleanText.match(optionRegex);
          if (optMatch) {
            incorrectExplanations[letter] = optMatch[1].trim();
          } else {
            // Fuzzy search fallback: search for any sentence mentioning this option text
            const sentenceRegex = new RegExp(`[^.?!]*${escapedOpt}[^.?!]*[.?!]`, "i");
            const sentenceMatch = cleanText.match(sentenceRegex);
            incorrectExplanations[letter] = sentenceMatch ? sentenceMatch[0].trim() : "This option is incorrect.";
          }
        });
        
        resultValue = {
          correct: correctText,
          incorrect: incorrectExplanations
        };
      }
    }

    res.json({ result: resultValue });
  } catch (error) {
    res.status(500).json({ message: "AI Tutor Error", error: error.message });
  }
};

module.exports = {
  savePracticeResult,
  getPracticeHistory,
  getPracticeAnalytics,
  getWrongQuestions,
  resolveWrongQuestion,
  toggleBookmark,
  getBookmarks,
  getAiTutorExplanation
};
