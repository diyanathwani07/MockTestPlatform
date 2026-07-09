const PracticeResult = require("../models/PracticeResult");
const User = require("../models/User");
const PracticeQuiz = require("../models/PracticeQuiz");
const { GoogleGenAI, Type } = require("@google/genai");

// Initialize Gemini API Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // Save the practice result record
    const practiceResult = new PracticeResult({
      userId,
      practiceQuizId: quizId,
      title: quiz.title,
      subject: quiz.subject,
      difficulty: quiz.difficulty || "Medium",
      stats: {
        totalQuestions: stats.totalQuestions,
        firstTryCorrect: stats.firstTryCorrect,
        multipleTries: stats.multipleTries,
        totalWrongAttempts: stats.totalWrongAttempts,
        totalAttemptsAll: stats.totalAttemptsAll,
        timeSpent: stats.timeSpent,
        accuracy: stats.accuracy,
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

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured on the server." });
    }

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
Question: ${question.questionEnglish}
Hindi translation if available: ${question.questionHindi || "N/A"}
Options: ${JSON.stringify(question.options)}
Correct Answer: ${question.correctAnswer}
Provided explanations: ${JSON.stringify(question.explanations || {})}

Task: ${instruction}
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
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        ...responseConfig,
        temperature: 0.7
      }
    });

    res.json({ result: response.text() });
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
