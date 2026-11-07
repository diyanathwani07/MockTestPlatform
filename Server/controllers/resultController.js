const Result = require("../models/Result");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const PracticeQuiz = require("../models/PracticeQuiz");
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
      userAnswers: userAnswers || [],
      status: "submitted"
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
    const results = await Result.find({ userId, status: { $ne: "active" } }).sort({ createdAt: -1 });
    
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
      studentName: result.userId ? (result.userId.fullName || result.userId.name) : "Student",
      isVerified: true,
      resultId: result._id,
      shareId: result.shareId
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

const getResultById = async (req, res) => {
  try {
    const { resultId } = req.params;
    const mongoose = require("mongoose");

    let result = null;
    if (mongoose.Types.ObjectId.isValid(resultId)) {
      result = await Result.findById(resultId).populate("userId", "fullName name email");
    }

    // Fallback: Check by shareId if not found by ObjectId
    if (!result) {
      result = await Result.findOne({ shareId: resultId }).populate("userId", "fullName name email");
    }

    if (!result) {
      return res.status(404).json({ message: "Result not found." });
    }

    // Authorization Security: Student can only view their own result unless admin/superadmin
    const userRole = req.user?.role;
    const isOwner = result.userId && (result.userId._id ? result.userId._id.toString() : result.userId.toString()) === req.user._id.toString();
    const isAdmin = ["admin", "superadmin"].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to view this result." });
    }

    const Quiz = require("../models/Quiz");
    const PracticeQuiz = require("../models/PracticeQuiz");
    let quiz = null;
    if (result.quizId) {
      quiz = await Quiz.findById(result.quizId);
      if (!quiz) {
        quiz = await PracticeQuiz.findById(result.quizId);
      }
    }

    const sanitized = sanitizeResult(result, quiz, userRole);
    res.status(200).json(sanitized);
  } catch (error) {
    console.error("GET RESULT BY ID ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
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

    // Ownership check: only the test taker or admin can submit/update feedback
    const isOwner = result.userId.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superadmin"].includes(req.user?.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to submit feedback for this result." });
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

// ─── ADMIN: All Attempts ───
const getAllAttempts = async (req, res) => {
  try {
    const results = await Result.find()
      .populate("userId", "fullName name email")
      .populate("quizId", "title")
      .sort({ createdAt: -1 })
      .select("userId quizId quizTitle score total percentage timeTaken createdAt passPercentage");

    const formatted = results.map(r => ({
      _id: r._id,
      studentName: r.userId
        ? (r.userId.fullName || r.userId.name || (r.userId.email ? r.userId.email.split("@")[0] : "Student"))
        : "Deleted User",
      studentEmail: r.userId?.email || "",
      quizTitle: r.quizId?.title || r.quizTitle || "Untitled Quiz",
      score: r.score,
      total: r.total,
      percentage: r.percentage,
      timeTaken: r.timeTaken,
      passed: r.percentage >= (r.passPercentage || 33),
      date: r.createdAt
    }));

    res.json({ totalAttempts: formatted.length, attempts: formatted });
  } catch (error) {
    console.error("GET ALL ATTEMPTS ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ─── ADMIN: Score Analytics ───
const getScoreAnalytics = async (req, res) => {
  try {
    const results = await Result.find()
      .populate("quizId", "title")
      .select("quizId quizTitle score total percentage passPercentage");

    // Group by quiz
    const quizMap = {};
    let totalPercentageSum = 0;
    let totalCount = 0;

    results.forEach(r => {
      const quizKey = r.quizId?._id?.toString() || r.quizTitle || "unknown";
      const quizTitle = r.quizId?.title || r.quizTitle || "Untitled Quiz";
      
      if (!quizMap[quizKey]) {
        quizMap[quizKey] = { quizTitle, attempts: 0, percentages: [], passCount: 0 };
      }
      quizMap[quizKey].attempts += 1;
      quizMap[quizKey].percentages.push(r.percentage || 0);
      if (r.percentage >= (r.passPercentage || 33)) quizMap[quizKey].passCount += 1;

      totalPercentageSum += (r.percentage || 0);
      totalCount += 1;
    });

    const quizzes = Object.values(quizMap).map(q => {
      const sorted = [...q.percentages].sort((a, b) => a - b);
      return {
        quizTitle: q.quizTitle,
        totalAttempts: q.attempts,
        averageScore: parseFloat((q.percentages.reduce((s, v) => s + v, 0) / q.attempts).toFixed(1)),
        highestScore: sorted[sorted.length - 1] || 0,
        lowestScore: sorted[0] || 0,
        passRate: parseFloat(((q.passCount / q.attempts) * 100).toFixed(1))
      };
    });

    quizzes.sort((a, b) => b.totalAttempts - a.totalAttempts);

    res.json({
      overallAverage: totalCount > 0 ? parseFloat((totalPercentageSum / totalCount).toFixed(1)) : 0,
      totalAttempts: totalCount,
      totalQuizzes: quizzes.length,
      quizzes
    });
  } catch (error) {
    console.error("GET SCORE ANALYTICS ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


const getMultiQuizAnalytics = async (req, res) => {
  try {
    const { resultId } = req.params;
    const mongoose = require("mongoose");

    let result = null;
    if (mongoose.Types.ObjectId.isValid(resultId)) {
      result = await Result.findById(resultId).populate("userId", "fullName name email");
    }
    if (!result) {
      result = await Result.findOne({ shareId: resultId }).populate("userId", "fullName name email");
    }

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found." });
    }

    // Authorization Security: Student can only access their own results unless admin/superadmin
    const userRole = req.user?.role;
    const isOwner = result.userId && (result.userId._id ? result.userId._id.toString() : result.userId.toString()) === req.user._id.toString();
    const isAdmin = ["admin", "superadmin"].includes(userRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "You are not authorized to view this result's analytics." });
    }

    const isMultiQuiz = Boolean(result.sectionResults && Array.isArray(result.sectionResults) && result.sectionResults.length > 0);

    // 1. Process Section Analytics Authoritatively
    let sections = [];
    if (isMultiQuiz) {
      sections = result.sectionResults.map((sec, idx) => {
        const secId = sec.sectionId || `sec-${idx}`;
        const totalQuestions = Number(sec.totalQuestions) || 0;
        const attempted = Number(sec.attempted) || 0;
        const correct = Number(sec.correct) || 0;
        const incorrect = Number(sec.incorrect) || 0;
        const unanswered = sec.unanswered !== undefined && sec.unanswered !== null
          ? Number(sec.unanswered)
          : Math.max(0, totalQuestions - attempted);
        const score = Number(sec.score) || 0;
        const maxMarks = Number(sec.maxMarks) || (totalQuestions > 0 ? totalQuestions : score);
        const timeTaken = Number(sec.timeTaken) || 0;
        
        let accuracy = 0;
        if (sec.accuracy !== undefined && sec.accuracy !== null) {
          accuracy = Number(Number(sec.accuracy).toFixed(1));
        } else if (attempted > 0) {
          accuracy = Number(((correct / attempted) * 100).toFixed(1));
        }

        const avgTimePerQuestion = attempted > 0 
          ? Number((timeTaken / attempted).toFixed(1)) 
          : (totalQuestions > 0 ? Number((timeTaken / totalQuestions).toFixed(1)) : 0);

        // Strength Classification:
        let strength = "average";
        if (attempted === 0) {
          strength = "unattempted";
        } else if (accuracy >= 70 && score > 0) {
          strength = "strong";
        } else if (accuracy < 40 || incorrect > correct) {
          strength = "weak";
        }

        return {
          sectionId: secId,
          sectionTitle: sec.sectionTitle || `Section ${idx + 1}`,
          totalQuestions,
          attempted,
          correct,
          incorrect,
          unanswered,
          score,
          maxMarks,
          accuracy,
          timeTaken,
          avgTimePerQuestion,
          strength,
          type: sec.type || "standard"
        };
      });
    }

    // 2. Summary: Strongest & Weakest Sections
    let strongestSection = null;
    let weakestSection = null;

    const attemptedSections = sections.filter(s => s.attempted > 0);
    if (attemptedSections.length > 0) {
      const sortedByPerformance = [...attemptedSections].sort((a, b) => {
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.score - a.score;
      });
      strongestSection = sortedByPerformance[0];
      weakestSection = sortedByPerformance[sortedByPerformance.length - 1];
    } else if (sections.length > 0) {
      strongestSection = sections[0];
      weakestSection = sections[sections.length - 1];
    }

    // 3. Dynamic Personalized Recommendations
    const recommendations = [];

    sections.forEach(sec => {
      // Heuristic 1: Low accuracy (< 50%)
      if (sec.attempted >= 2 && sec.accuracy < 50) {
        recommendations.push({
          type: "concept_revision",
          priority: "high",
          sectionTitle: sec.sectionTitle,
          title: `Revise Fundamentals: ${sec.sectionTitle}`,
          description: `Accuracy in ${sec.sectionTitle} is ${sec.accuracy}%. Review core theories, formulas, and concepts before your next mock test.`
        });
      }

      // Heuristic 2: Negative marking impact (incorrect > correct)
      if (sec.attempted >= 2 && sec.incorrect > sec.correct) {
        recommendations.push({
          type: "negative_marking",
          priority: "high",
          sectionTitle: sec.sectionTitle,
          title: `Minimize Negative Marking in ${sec.sectionTitle}`,
          description: `You had ${sec.incorrect} incorrect answers compared to ${sec.correct} correct. Eliminate guess-work and focus on high-confidence questions.`
        });
      }

      // Heuristic 3: High unanswered / pacing penalty
      if (sec.totalQuestions >= 3 && (sec.unanswered / sec.totalQuestions) >= 0.4) {
        recommendations.push({
          type: "time_management",
          priority: "medium",
          sectionTitle: sec.sectionTitle,
          title: `Improve Pacing in ${sec.sectionTitle}`,
          description: `${sec.unanswered} of ${sec.totalQuestions} questions (${Math.round((sec.unanswered / sec.totalQuestions) * 100)}%) were left unattempted. Allocate a fixed time budget to attempt the full section.`
        });
      }

      // Heuristic 4: Excessive time spent with high accuracy
      if (sec.attempted >= 3 && sec.accuracy >= 75 && sec.avgTimePerQuestion >= 90) {
        recommendations.push({
          type: "speed_practice",
          priority: "medium",
          sectionTitle: sec.sectionTitle,
          title: `Speed Drilling: ${sec.sectionTitle}`,
          description: `You have strong accuracy (${sec.accuracy}%) in ${sec.sectionTitle}, but average ${sec.avgTimePerQuestion}s per question. Practice speed drills to bank minutes for tougher sections.`
        });
      }

      // Heuristic 5: Consistent mastery
      if (sec.attempted >= 3 && sec.accuracy >= 80 && sec.score >= 0.7 * sec.maxMarks) {
        recommendations.push({
          type: "advanced_practice",
          priority: "low",
          sectionTitle: sec.sectionTitle,
          title: `Advance to Tougher Sets: ${sec.sectionTitle}`,
          description: `Outstanding performance (${sec.accuracy}% accuracy) in ${sec.sectionTitle}! Maintain your edge by solving advanced-level problem sets.`
        });
      }
    });

    if (recommendations.length === 0 && sections.length > 0) {
      const overallAcc = result.total > 0 ? Number(((result.correct / result.total) * 100).toFixed(1)) : 0;
      if (overallAcc >= 75) {
        recommendations.push({
          type: "general_strength",
          priority: "low",
          sectionTitle: "Overall Test",
          title: "Maintain Balanced Preparation",
          description: `Strong overall test attempt with ${overallAcc}% accuracy. Continue practicing full-length timed tests to preserve exam stamina.`
        });
      } else {
        recommendations.push({
          type: "general_improvement",
          priority: "medium",
          sectionTitle: "Overall Test",
          title: "Focus on Section Weak Spots",
          description: `Analyze the section accuracy breakdown above and prioritize concept revision in your lowest-scoring subjects.`
        });
      }
    }

    // 4. Historical Performance: Prior Attempts for the same quiz
    let history = {
      hasHistory: false,
      totalAttempts: 1,
      attemptsProgression: [],
      comparisonWithPrevious: null
    };

    if (result.quizId) {
      const allUserAttempts = await Result.find({
        userId: result.userId._id || result.userId,
        quizId: result.quizId,
        status: "submitted"
      }).sort({ createdAt: 1 });

      if (allUserAttempts.length > 1) {
        history.hasHistory = true;
        history.totalAttempts = allUserAttempts.length;
        
        history.attemptsProgression = allUserAttempts.map((att, idx) => ({
          attemptNumber: idx + 1,
          resultId: att._id,
          score: att.score ?? 0,
          total: att.total ?? 0,
          percentage: att.percentage ?? (att.total > 0 ? Number(((att.score / att.total) * 100).toFixed(1)) : 0),
          createdAt: att.createdAt
        }));

        const currentIdx = allUserAttempts.findIndex(a => a._id.toString() === result._id.toString());
        const prevAttempt = currentIdx > 0 ? allUserAttempts[currentIdx - 1] : (currentIdx === -1 ? allUserAttempts[allUserAttempts.length - 2] : null);

        if (prevAttempt) {
          const scoreDiff = Number((result.score - (prevAttempt.score ?? 0)).toFixed(2));
          const currentPct = result.percentage ?? 0;
          const prevPct = prevAttempt.percentage ?? 0;
          const percentageDiff = Number((currentPct - prevPct).toFixed(2));
          const timeDiff = Number(((result.timeTaken ?? 0) - (prevAttempt.timeTaken ?? 0)).toFixed(0));

          const sectionChanges = [];
          if (isMultiQuiz && Array.isArray(prevAttempt.sectionResults)) {
            sections.forEach(currentSec => {
              const prevSec = prevAttempt.sectionResults.find(ps => 
                (ps.sectionId && ps.sectionId.toString() === currentSec.sectionId.toString()) ||
                (ps.sectionTitle && ps.sectionTitle.trim().toLowerCase() === currentSec.sectionTitle.trim().toLowerCase())
              );

              if (prevSec) {
                const prevSecScore = Number(prevSec.score) || 0;
                const prevSecAcc = prevSec.accuracy !== undefined ? Number(prevSec.accuracy) : (prevSec.attempted > 0 ? Number(((prevSec.correct / prevSec.attempted) * 100).toFixed(1)) : 0);
                const sScoreDiff = Number((currentSec.score - prevSecScore).toFixed(2));
                const sAccDiff = Number((currentSec.accuracy - prevSecAcc).toFixed(1));

                let trend = "stable";
                if (sScoreDiff > 0 || sAccDiff > 2) {
                  trend = "improving";
                } else if (sScoreDiff < 0 || sAccDiff < -2) {
                  trend = "declining";
                }

                sectionChanges.push({
                  sectionId: currentSec.sectionId,
                  sectionTitle: currentSec.sectionTitle,
                  currentScore: currentSec.score,
                  previousScore: prevSecScore,
                  scoreDiff: sScoreDiff,
                  currentAccuracy: currentSec.accuracy,
                  previousAccuracy: prevSecAcc,
                  accuracyDiff: sAccDiff,
                  trend
                });
              }
            });
          }

          history.comparisonWithPrevious = {
            previousResultId: prevAttempt._id,
            previousDate: prevAttempt.createdAt,
            scoreDiff,
            percentageDiff,
            timeDiff,
            sectionChanges
          };
        }
      }
    }

    return res.status(200).json({
      success: true,
      resultId: result._id,
      quizId: result.quizId,
      isMultiQuiz,
      totalScore: result.score ?? 0,
      maxPossibleMarks: result.maxPossibleMarks ?? result.total ?? 0,
      totalAccuracy: result.total > 0 ? Number(((result.correct / result.total) * 100).toFixed(1)) : 0,
      totalTimeTaken: result.timeTaken ?? 0,
      sections,
      summary: {
        strongestSection: strongestSection ? {
          sectionTitle: strongestSection.sectionTitle,
          accuracy: strongestSection.accuracy,
          score: strongestSection.score
        } : null,
        weakestSection: weakestSection ? {
          sectionTitle: weakestSection.sectionTitle,
          accuracy: weakestSection.accuracy,
          score: weakestSection.score
        } : null,
        strongCount: sections.filter(s => s.strength === "strong").length,
        averageCount: sections.filter(s => s.strength === "average").length,
        weakCount: sections.filter(s => s.strength === "weak").length,
        unattemptedCount: sections.filter(s => s.strength === "unattempted").length
      },
      recommendations,
      history
    });
  } catch (error) {
    console.error("GET MULTI QUIZ ANALYTICS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to generate multi-quiz analytics", error: error.message });
  }
};

module.exports = {
  saveResult,
  getUserResults,
  getLeaderboard,
  getSharedResult,
  getResultByShareId,
  getResultById,
  updateResultFeedback,
  getAllAttempts,
  getScoreAnalytics
,
  getMultiQuizAnalytics
};
