const Result = require("../models/Result");
const crypto = require("crypto");

const saveResult = async (req, res) => {
  // NOTE: This is a legacy/manual path gated behind protect.
  // Prefer using /api/quizzes/:id/submit where grading and result generation are authoritative.
  try {
    const {
      quizId,
      quizTitle,
      subject,
      examName,
      reaction,
      feedbackMessage,
      score,
      total,
      correct,
      incorrect,
      percentage,
      timeTaken,
      sectionResults,
      difficultyBreakdown,
      questions,
      userAnswers,
      passPercentage
    } = req.body;

    const shareId = crypto.randomBytes(4).toString("hex");

    const result = await Result.create({
      userId: req.user._id,
      quizId,
      quizTitle,
      subject,
      examName,
      reaction,
      feedbackMessage,
      score,
      total,
      correct,
      incorrect,
      percentage,
      passPercentage: passPercentage ?? 50,
      timeTaken: timeTaken || 0,
      shareId,
      isPublic: true,
      sectionResults: sectionResults || [],
      difficultyBreakdown: difficultyBreakdown || {
        easy: { correct: 0, total: 0 },
        medium: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 }
      },
      questions: questions || [],
      userAnswers: userAnswers || []
    });

    res.status(201).json({
      success: true,
      result,
    });
  } catch (error) {
    console.log("SAVE ERROR", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const sanitizeResult = (result, quiz, userRole) => {
  if (["admin", "superadmin"].includes(userRole)) {
    return result;
  }
  
  const resultObj = result.toObject ? result.toObject() : JSON.parse(JSON.stringify(result));
  
  if (quiz) {
    let resultsReleased = true;
    if (quiz.resultReleaseMode === "scheduled" && quiz.resultReleaseDate) {
      resultsReleased = new Date() >= new Date(quiz.resultReleaseDate);
    } else if (quiz.resultReleaseMode === "manual") {
      resultsReleased = false;
    }

    if (quiz.showResultAfterSubmission === false || !resultsReleased) {
      resultObj.score = 0;
      resultObj.correct = 0;
      resultObj.incorrect = 0;
      resultObj.unanswered = 0;
      resultObj.percentage = 0;
      resultObj.questions = [];
      resultObj.userAnswers = [];
      resultObj.sectionResults = [];
      resultObj.showResultAfterSubmission = false;
      resultObj.showCorrectAnswers = false;
      resultObj.showExplanations = false;
      resultObj.showAnswerReview = false;
      return resultObj;
    }
    
    if (quiz.showCorrectAnswers === false) {
      if (Array.isArray(resultObj.questions)) {
        resultObj.questions = resultObj.questions.map(q => {
          delete q.correctAnswer;
          delete q.correctAnswerObfuscated;
          return q;
        });
      }
      resultObj.showCorrectAnswers = false;
    }
    
    if (quiz.showExplanations === false) {
      if (Array.isArray(resultObj.questions)) {
        resultObj.questions = resultObj.questions.map(q => {
          delete q.explanation;
          delete q.solution;
          return q;
        });
      }
      resultObj.showExplanations = false;
    }
    
    if (quiz.showAnswerReview === false) {
      resultObj.questions = [];
      resultObj.userAnswers = [];
      resultObj.showAnswerReview = false;
    }
    
    resultObj.showResultAfterSubmission = quiz.showResultAfterSubmission ?? true;
  }
  
  return resultObj;
};

const getUserResults = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user._id.toString() !== userId && !["admin", "superadmin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access Denied: unauthorized to fetch these results." });
    }

    const Quiz = require("../models/Quiz");
    const PracticeQuiz = require("../models/PracticeQuiz");
    const results = await Result.find({ userId }).sort({ createdAt: -1 });
    
    const quizIds = [...new Set(results.map(r => r.quizId).filter(Boolean))];
    
    // Batch fetch from both collections concurrently
    const [quizzes, practiceQuizzes] = await Promise.all([
      Quiz.find({ _id: { $in: quizIds } }),
      PracticeQuiz.find({ _id: { $in: quizIds } })
    ]);
    
    const quizMap = new Map();
    quizzes.forEach(q => quizMap.set(q._id.toString(), q));
    practiceQuizzes.forEach(pq => quizMap.set(pq._id.toString(), pq));
    
    const sanitizedResults = [];
    for (const r of results) {
      const quiz = r.quizId ? quizMap.get(r.quizId.toString()) : null;
      sanitizedResults.push(sanitizeResult(r, quiz, req.user?.role));
    }
    
    res.status(200).json(sanitizedResults);
  } catch (error) {
    console.error("GET RESULTS ERROR", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    // Fetch all results, populate user info (name, maybe avatar)
    // In a real app we might aggregate by highest score per user, but for now we fetch top 100 results
    const results = await Result.find()
      .populate("userId", "fullName name email avatar")
      .sort({ score: -1, percentage: -1, createdAt: 1 })
      .limit(100);
      
    res.status(200).json(results);
  } catch (error) {
    console.error("GET LEADERBOARD ERROR", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getSharedResult = async (req, res) => {
  try {
    const { shareId } = req.params;
    const result = await Result.findOne({ shareId })
      .populate("userId", "fullName name");
      
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }

    if (!result.isPublic) {
      return res.status(403).json({ message: "This result is private." });
    }

    const safeResult = {
      quizTitle: result.quizTitle || result.examName || "Quiz",
      subject: result.subject,
      score: result.score,
      percentage: result.percentage,
      correct: result.correct,
      incorrect: result.incorrect,
      timeTaken: result.timeTaken,
      createdAt: result.createdAt,
      studentName: result.userId ? (result.userId.name || result.userId.fullName) : "Student",
    };

    res.status(200).json(safeResult);
  } catch (error) {
    console.error("GET SHARED RESULT ERROR", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getResultByShareId = async (req, res) => {
  try {
    const { shareId } = req.params;
    const result = await Result.findOne({ shareId }).populate("userId", "fullName name email");
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }
    const Quiz = require("../models/Quiz");
    const quiz = await Quiz.findById(result.quizId);
    const sanitized = sanitizeResult(result, quiz, req.user?.role);
    res.status(200).json(sanitized);
  } catch (error) {
    console.error("GET RESULT BY SHARE ID ERROR", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { saveResult, getUserResults, getLeaderboard, getSharedResult, getResultByShareId };