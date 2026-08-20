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
  resultObj.allowReattempt = quiz ? (quiz.allowReattempt !== false) : true;
  resultObj.quizType = quiz ? quiz.quizType : "exam";
  
  if (quiz) {
    let resultsReleased = true;
    if (quiz.resultReleaseMode === "scheduled" && quiz.resultReleaseDate) {
      resultsReleased = new Date() >= new Date(quiz.resultReleaseDate);
    } else if (quiz.resultReleaseMode === "manual") {
      resultsReleased = false;
    }

    if (resultsReleased) {
      resultObj.showResultAfterSubmission = quiz.showResultAfterSubmission !== false;
      resultObj.showPassFailStatus = quiz.showPassFailStatus !== false;
      resultObj.showAnswerReview = quiz.showAnswerReview !== false;
      resultObj.passed = result.percentage >= (quiz.passPercentage || 50);

      if (quiz.showAnswerReview === false) {
        resultObj.questions = [];
        resultObj.userAnswers = [];
      }
      if (quiz.showCorrectAnswers === false) {
        if (Array.isArray(resultObj.questions)) {
          resultObj.questions = resultObj.questions.map(q => {
            delete q.correctAnswer;
            delete q.correctAnswerObfuscated;
            return q;
          });
        }
      }
      if (quiz.showExplanations === false) {
        if (Array.isArray(resultObj.questions)) {
          resultObj.questions = resultObj.questions.map(q => {
            delete q.explanation;
            delete q.solution;
            return q;
          });
        }
      }
    } else {
      // NOT YET RELEASED (Scheduled pending or Manual Hide):
      const showPassFail = quiz.showPassFailStatus === true;
      const showScore = quiz.showResultAfterSubmission === true;
      const showReview = quiz.showAnswerReview === true;

      resultObj.showPassFailStatus = showPassFail;
      resultObj.showResultAfterSubmission = showScore;
      resultObj.showAnswerReview = showReview;
      resultObj.passed = result.percentage >= (quiz.passPercentage || 50);

      // If score is hidden, zero out score values
      if (!showScore) {
        resultObj.score = 0;
        resultObj.correct = 0;
        resultObj.incorrect = 0;
        resultObj.unanswered = 0;
        resultObj.percentage = 0;
        resultObj.sectionResults = [];
        if (!showPassFail) {
          delete resultObj.passed;
        }
      }

      // If answer review is hidden, clear questions/answers
      if (!showReview) {
        resultObj.questions = [];
        resultObj.userAnswers = [];
      } else {
        if (quiz.showCorrectAnswers === false) {
          if (Array.isArray(resultObj.questions)) {
            resultObj.questions = resultObj.questions.map(q => {
              delete q.correctAnswer;
              delete q.correctAnswerObfuscated;
              return q;
            });
          }
        }
        if (quiz.showExplanations === false) {
          if (Array.isArray(resultObj.questions)) {
            resultObj.questions = resultObj.questions.map(q => {
              delete q.explanation;
              delete q.solution;
              return q;
            });
          }
        }
      }
    }
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

const updateResultFeedback = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { reaction, feedbackMessage } = req.body;

    const result = await Result.findById(resultId);
    if (!result) {
      return res.status(404).json({ message: "Result not found" });
    }



    result.reaction = reaction;
    result.feedbackMessage = feedbackMessage;
    await result.save();

    res.status(200).json({ success: true, message: "Feedback updated successfully", result });
  } catch (error) {
    console.error("UPDATE FEEDBACK ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { saveResult, getUserResults, getLeaderboard, getSharedResult, getResultByShareId, updateResultFeedback };