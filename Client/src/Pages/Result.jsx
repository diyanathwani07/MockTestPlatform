import React, { useEffect, useState } from "react";
import confetti from 'canvas-confetti';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import { useLocation, useNavigate, useParams } from "react-router-dom";
import QuizHeader from "../components/QuizHeader";
import "../css/Result.css";
import axios from "axios";
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, BarChart3, Target, Award, ListChecks, Trophy, FileText, CalendarDays, HelpCircle, Medal, Timer, TrendingUp, LayoutGrid, Eye, Check, X, Minus, BookOpen, Layers, Sparkles, BarChart2 } from "lucide-react";
import MathRenderer from "../components/MathRenderer";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import { Skeleton, SkeletonCard, SkeletonStatCard } from "@/components/ui/skeleton";
import MultiQuizAnalyticsDashboard from "../components/MultiQuizAnalyticsDashboard";

const FeedbackForm = ({ resultId, initialReaction, initialComment }) => {
  const ratings = [
    { value: 1, label: "Poor", emoji: "😡", color: "#EF4444" },
    { value: 2, label: "Average", emoji: "😐", color: "#F59E0B" },
    { value: 3, label: "Good", emoji: "🙂", color: "#10B981" },
    { value: 4, label: "Very Good", emoji: "😄", color: "#3B82F6" },
    { value: 5, label: "Excellent", emoji: "😍", color: "#8B5CF6" }
  ];

  const [rating, setRating] = useState(() => {
    if (initialReaction) {
      const match = ratings.find(r => r.label.toLowerCase() === initialReaction.toLowerCase());
      return match ? match.value : 0;
    }
    return 0;
  });
  const [comment, setComment] = useState(initialComment || "");
  const [submitted, setSubmitted] = useState(Boolean(initialReaction || initialComment));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialReaction || initialComment) {
      if (initialReaction) {
        const match = ratings.find(r => r.label.toLowerCase() === initialReaction.toLowerCase());
        if (match) setRating(match.value);
      }
      if (initialComment) setComment(initialComment);
      setSubmitted(true);
    }
  }, [initialReaction, initialComment]);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating before submitting.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/results/feedback/${resultId}`, {
        reaction: ratings[rating - 1].label,
        feedbackMessage: comment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Submit feedback error:", err);
      alert(err.response?.data?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rm-feedback-card" style={{
        background: "var(--bg-card)", border: "1.5px solid var(--border-color)",
        borderRadius: "24px", padding: "30px", textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.15)", boxSizing: "border-box"
      }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🎉</div>
        <h4 style={{ color: "var(--text-primary)", fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Thank you!</h4>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.4", margin: 0 }}>Your feedback has been submitted successfully and helps us improve our exams.</p>
      </div>
    );
  }

  return (
    <div className="rm-feedback-card" style={{
      background: "var(--bg-card)", border: "1.5px solid var(--border-color)",
      borderRadius: "24px", padding: "30px", textAlign: "left",
      boxShadow: "0 10px 30px rgba(0,0,0,0.15)", boxSizing: "border-box",
      width: "100%"
    }}>
      {/* Header */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
        <div style={{
          width: "40px", height: "40px", borderRadius: "50%",
          backgroundColor: "rgba(139, 92, 246, 0.1)", display: "flex",
          alignItems: "center", justifyContent: "center"
        }}>
          <HelpCircle size={20} color="#8B5CF6" />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>Help us improve</h4>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)" }}>Your feedback helps us make exams better.</p>
        </div>
      </div>

      {/* Q1 */}
      <div style={{ marginBottom: "24px" }}>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", display: "block", marginBottom: "12px" }}>
          1. How would you rate this quiz?
        </span>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          {ratings.map((r) => {
            const isSelected = rating === r.value;
            return (
              <div 
                key={r.value}
                onClick={() => setRating(r.value)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                  cursor: "pointer", flex: 1, padding: "8px 4px", borderRadius: "12px",
                  border: isSelected ? `1.5px solid ${r.color}` : "1.5px solid transparent",
                  backgroundColor: isSelected ? `${r.color}10` : "transparent",
                  transition: "all 0.2s ease"
                }}
              >
                <span style={{ fontSize: "28px", filter: isSelected ? "none" : "grayscale(30%)", transform: isSelected ? "scale(1.15)" : "scale(1)", transition: "all 0.2s" }}>{r.emoji}</span>
                <span style={{ fontSize: "9.5px", fontWeight: isSelected ? "700" : "500", color: isSelected ? r.color : "var(--text-secondary)" }}>{r.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Q2 */}
      <div style={{ marginBottom: "24px" }}>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", display: "block", marginBottom: "8px" }}>
          2. Any comments or suggestions? (Optional)
        </span>
        <textarea
          value={comment}
          onChange={(e) => { if (e.target.value.length <= 500) setComment(e.target.value); }}
          placeholder="Write your feedback here..."
          style={{
            width: "100%", height: "100px", padding: "12px", borderRadius: "12px",
            border: "1.5px solid var(--border-color)", backgroundColor: "var(--bg-input)",
            color: "var(--text-primary)", fontSize: "12.5px", outline: "none", resize: "none",
            boxSizing: "border-box"
          }}
        />
        <div style={{ textAlign: "right", fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>
          {comment.length}/500
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%", padding: "12px 20px", borderRadius: "12px", border: "none",
          backgroundColor: rating === 0 ? "var(--border-color)" : "var(--violet)",
          color: rating === 0 ? "var(--text-muted)" : "#ffffff", fontWeight: "700",
          fontSize: "13.5px", cursor: rating === 0 || loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          transition: "all 0.2s",
          boxShadow: rating === 0 ? "none" : "0 4px 15px rgba(124, 58, 237, 0.2)"
        }}
      >
        <span>Submit Feedback</span>
      </button>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", marginTop: "12px", color: "var(--text-muted)", fontSize: "10px" }}>
        <span>🔒 Your feedback is anonymous</span>
      </div>
    </div>
  );
};

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resultId, shareId: routeShareId } = useParams();
  const effectiveResultId = resultId || routeShareId;
  const { isDark } = useTheme();

  const [error, setError] = useState(null);

  // Initialize data from location.state if it matches the current URL ID
  const [data, setData] = useState(() => {
    let initialData = location.state;
    if (initialData) {
      const stateId = initialData._id || initialData.result?._id || initialData.resultId || initialData.shareId;
      if (!effectiveResultId || stateId === effectiveResultId) {
        return initialData;
      }
    }
    if (!effectiveResultId) {
      const stored = localStorage.getItem("lastQuizResult");
      if (stored && stored !== "undefined") {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse cached result data", e);
        }
      }
    }
    return null;
  });

  let user = { name: "User" };
  try {
    const userString = localStorage.getItem("user");
    if (userString && userString !== "undefined") {
      user = JSON.parse(userString);
    }
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
  }

  const [loadingLatest, setLoadingLatest] = useState(!data);

  useEffect(() => {
    if (data) {
      localStorage.setItem("lastQuizResult", JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    const fetchResultData = async () => {
      const token = localStorage.getItem("token");
      setLoadingLatest(true);
      setError(null);
      try {
        let res;
        if (effectiveResultId) {
          res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/detail/${effectiveResultId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          setData(res.data);
        } else if (user?.id || user?._id) {
          res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id || user._id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.data && res.data.length > 0) {
            setData(res.data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch result data", err);
        if (err.response?.status === 403) {
          setError({
            type: "UNAUTHORIZED",
            title: "Access Denied",
            message: "You are not authorized to view this result."
          });
        } else if (err.response?.status === 404) {
          setError({
            type: "NOT_FOUND",
            title: "Result Not Found",
            message: "The requested quiz result could not be found or has expired."
          });
        } else {
          setError({
            type: "ERROR",
            title: "Unable to Load Result",
            message: err.response?.data?.message || "Failed to load result. Please check your internet connection."
          });
        }
      } finally {
        setLoadingLatest(false);
      }
    };

    // If data is not in state or URL effectiveResultId doesn't match loaded state, fetch from server
    const currentLoadedId = data?._id || data?.result?._id || data?.resultId || data?.shareId;
    if (!data || (effectiveResultId && currentLoadedId !== effectiveResultId)) {
      fetchResultData();
    } else {
      setLoadingLatest(false);
    }
  }, [effectiveResultId]);

  const score = data?.score ?? 0;
  const total = data?.total ?? 0;
  const correct = data?.correct ?? 0;
  const incorrect = data?.incorrect ?? 0;
  const unanswered = React.useMemo(() => {
    if (data?.unanswered !== undefined && data?.unanswered !== null && Number(data.unanswered) >= 0) {
      const attempted = (data?.attempted !== undefined && data?.attempted !== null)
        ? Number(data.attempted)
        : ((correct || 0) + (incorrect || 0));
      const totalQ = total || questions.length || 0;
      if (Number(data.unanswered) === 0 && totalQ > attempted) {
        return totalQ - attempted;
      }
      return Number(data.unanswered);
    }
    const attempted = (correct || 0) + (incorrect || 0);
    const totalQ = total || questions.length || 0;
    return Math.max(0, totalQ - attempted);
  }, [data, total, questions.length, correct, incorrect]);
  const percentage = data?.percentage;
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);

  const isMultiQuiz = Boolean(data?.sectionResults && Array.isArray(data.sectionResults) && data.sectionResults.length > 0);

  const examTitle = React.useMemo(() => {
    const rawExamName = (data?.examName || data?.quizId?.examName || location.state?.examName || "")?.trim();
    const rawTitle = (data?.quizTitle || data?.title || data?.quizId?.title || "")?.trim();
    const rawSubject = (data?.subject || data?.quizId?.subject || "")?.trim();

    if (isMultiQuiz) {
      if (rawExamName && rawExamName !== "General Mock Tests") return rawExamName;
      if (rawTitle && !rawTitle.includes(",")) return rawTitle;
      if (rawSubject && !rawSubject.includes(",")) return rawSubject;
      if (rawExamName) return rawExamName;
      return "Multi-Section Assessment";
    }

    // For single quizzes:
    if (rawTitle && !rawTitle.includes(",")) return rawTitle;
    if (rawSubject && !rawSubject.includes(",")) return rawSubject;
    if (rawExamName && rawExamName !== "General Mock Tests") return rawExamName;
    if (rawTitle) return rawTitle;
    if (rawSubject) return rawSubject.includes(",") ? rawSubject.split(",")[0].trim() : rawSubject;
    return localStorage.getItem("lastExamTaken") || "Examination";
  }, [data, location.state, isMultiQuiz]);

  const isExam = data?.quizType !== "practice";

  const [visibleCount, setVisibleCount] = useState(10);
  const [shareId, setShareId] = useState(data?.shareId || null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [reviewFilter, setReviewFilter] = useState("all"); // "all", "correct", "incorrect", "unattempted"
  const [activeSectionTab, setActiveSectionTab] = useState("all");
  const [resultTab, setResultTab] = useState("overview"); // "overview" | "analytics"

  const formatTimingSafe = (seconds) => {
    if (seconds === undefined || seconds === null || seconds === "") return "Not available";
    const num = Number(seconds);
    if (isNaN(num)) return "Not available";
    if (num === 0) return "0s";
    const m = Math.floor(num / 60);
    const s = Math.round(num % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatDurationDisplay = (val) => {
    if (!val && val !== 0) return "30 Min";
    let num = Number(val);
    if (isNaN(num) || num <= 0) return "30 Min";
    // If > 300, it's stored in seconds -> convert to minutes
    let mins = num > 300 ? Math.round(num / 60) : Math.round(num);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
    return `${mins} Min`;
  };

  const attemptedCount = React.useMemo(() => {
    if (isMultiQuiz && Array.isArray(data?.sectionResults)) {
      const sum = data.sectionResults.reduce((acc, s) => acc + (s.attempted || 0), 0);
      if (sum > 0) return sum;
    }
    return (correct || 0) + (incorrect || 0);
  }, [isMultiQuiz, data, correct, incorrect]);

  const maxPossibleMarksDisplay = React.useMemo(() => {
    if (data?.maxPossibleMarks !== undefined && data?.maxPossibleMarks !== null && Number(data.maxPossibleMarks) > 0) {
      return data.maxPossibleMarks;
    }
    if (isMultiQuiz && Array.isArray(data?.sectionResults)) {
      const sum = data.sectionResults.reduce((acc, s) => acc + (Number(s.maxMarks) || 0), 0);
      if (sum > 0) return sum;
    }
    if (total && Number(total) > 0) return total;
    if (questions.length > 0) return questions.length;
    return total || "Not available";
  }, [data, isMultiQuiz, total, questions.length]);

  const accuracyDisplay = React.useMemo(() => {
    if (data?.percentage !== undefined && data?.percentage !== null) {
      return Number(data.percentage).toFixed(1);
    }
    if (attemptedCount > 0) {
      return ((correct / attemptedCount) * 100).toFixed(1);
    }
    return total > 0 ? ((correct / total) * 100).toFixed(1) : "0.0";
  }, [data, attemptedCount, correct, total]);

  const sectionQuestions = React.useMemo(() => {
    if (!isMultiQuiz) return [];
    if (activeSectionTab === "all") return questions;
    return questions.filter(q => q.sectionId?.toString() === activeSectionTab.toString());
  }, [isMultiQuiz, questions, activeSectionTab]);

  const sectionCounts = React.useMemo(() => {
    let corr = 0;
    let incorr = 0;
    let unans = 0;
    sectionQuestions.forEach((q, idx) => {
      const userAns = q.userAnswer !== undefined ? q.userAnswer : userAnswers[idx];
      const isUnanswered = userAns === undefined || userAns === null || userAns === "";
      const isCorrect = q.status === "correct" || (q.correctAnswer ? String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase() : false);
      if (isCorrect) corr++;
      else if (isUnanswered) unans++;
      else incorr++;
    });
    return {
      all: sectionQuestions.length,
      correct: corr,
      incorrect: incorr,
      unattempted: unans
    };
  }, [sectionQuestions, userAnswers]);

  const multiQuizFilteredQuestions = React.useMemo(() => {
    if (!isMultiQuiz) return [];
    return questions
      .map((q, idx) => ({ ...q, globalIndex: idx }))
      .filter((q) => {
        // Section filter
        if (activeSectionTab !== "all") {
          const qSecId = q.sectionId?.toString();
          if (qSecId !== activeSectionTab.toString()) {
            return false;
          }
        }

        // Status filter
        const userAns = q.userAnswer !== undefined ? q.userAnswer : userAnswers[q.globalIndex];
        const isUnanswered = userAns === undefined || userAns === null || userAns === "";
        const isCorrect = q.status === "correct" || (q.correctAnswer ? String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase() : false);
        const isIncorrect = q.status === "incorrect" || (!isCorrect && !isUnanswered);

        if (reviewFilter === "correct") return isCorrect;
        if (reviewFilter === "incorrect") return isIncorrect;
        if (reviewFilter === "unattempted") return isUnanswered;
        return true;
      });
  }, [isMultiQuiz, questions, activeSectionTab, reviewFilter, userAnswers]);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > document.documentElement.scrollHeight / 3) {
        setIsScrolledDown(true);
      } else {
        setIsScrolledDown(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const computedPercentage =
    percentage !== undefined && percentage !== null
      ? Number(percentage).toFixed(2)
      : total
      ? ((score / total) * 100).toFixed(2)
      : "0.00";

  const passThreshold = data?.passPercentage ?? 50;

  useEffect(() => {
    if (Number(computedPercentage) >= passThreshold) {
      const end = Date.now() + 3 * 1000;
      const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1", "#10B981"];
      
      const frame = () => {
        if (Date.now() > end) return;
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          startVelocity: 60,
          origin: { x: 0, y: 0.5 },
          colors: colors,
          zIndex: 9999
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          startVelocity: 60,
          origin: { x: 1, y: 0.5 },
          colors: colors,
          zIndex: 9999
        });
        requestAnimationFrame(frame);
      };
      frame();
    }
  }, [computedPercentage, passThreshold]);

  const timeTakenSecs = data?.timeTaken || 0;

  useEffect(() => {
    if (data) {
      const analyticsMap = new Map();
      if (Array.isArray(data.questionAnalytics)) {
        data.questionAnalytics.forEach(qa => {
          if (qa.questionId) {
            analyticsMap.set(qa.questionId.toString(), qa);
          }
        });
      }

      if (data.questions && data.questions.length > 0) {
        const mappedQs = data.questions.map((q, idx) => {
          let correctText = q.correctAnswer || "";
          if (q.correctAnswerObfuscated) {
            try {
              correctText = atob(q.correctAnswerObfuscated);
            } catch (e) {
              console.error("Failed to decode obfuscated correct answer:", e);
            }
          }
          if (["A", "B", "C", "D", "E", "F"].includes(correctText) && Array.isArray(q.options)) {
            const idxMap = { "A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5 };
            correctText = q.options[idxMap[correctText]] || correctText;
          } else if (typeof correctText === "string" && correctText.startsWith("Option ") && Array.isArray(q.options)) {
            const optNum = parseInt(correctText.replace("Option ", ""), 10);
            if (!isNaN(optNum) && optNum >= 1 && optNum <= q.options.length) {
              correctText = q.options[optNum - 1] || correctText;
            }
          }

          const qIdStr = (q.id || q._id || q.questionId)?.toString();
          const qa = qIdStr ? analyticsMap.get(qIdStr) : null;
          const timeSpent = q.timeSpent !== undefined ? q.timeSpent : qa?.timeSpent;
          const visitCount = q.visitCount !== undefined ? q.visitCount : qa?.visitCount;
          const marksObtained = q.marksObtained !== undefined ? q.marksObtained : qa?.marksObtained;
          const status = q.status || qa?.status;
          const userAns = q.userAnswer !== undefined ? q.userAnswer : (qa?.userAnswer !== undefined ? qa.userAnswer : (data.userAnswers ? data.userAnswers[idx] : undefined));

          return {
            ...q,
            originalIndex: idx,
            correctAnswer: correctText,
            timeSpent,
            visitCount,
            marksObtained,
            status,
            userAnswer: userAns
          };
        });

        // Historical Multi Quiz backward compatibility: partition by sectionResults totalQuestions if sectionId is missing
        if (Array.isArray(data.sectionResults) && data.sectionResults.length > 0) {
          let qOffset = 0;
          data.sectionResults.forEach((sec, sIdx) => {
            const count = sec.totalQuestions || 0;
            for (let i = 0; i < count && (qOffset + i) < mappedQs.length; i++) {
              const q = mappedQs[qOffset + i];
              if (!q.sectionId) {
                q.sectionId = sec.sectionId || `sec-${sIdx}`;
                q.sectionTitle = sec.sectionTitle || sec.title || `Section ${sIdx + 1}`;
                q.sectionType = sec.type || "standard";
              }
            }
            qOffset += count;
          });
        }

        setQuestions(mappedQs);
        setUserAnswers(data.userAnswers || []);
      } else if (data.quizId) {
        const fetchQuizQuestions = async () => {
          try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes/${data.quizId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const quizData = res.data;
            let loadedSections = quizData.sections || [];
            if (loadedSections.length === 0 && quizData.questions && quizData.questions.length > 0) {
               loadedSections = [{
                  questions: quizData.questions
               }];
            }
            const normalizedSections = loadedSections.map((sec, sIdx) => {
               let qs = sec.questions || [];
               if (sec.type === 'coding' && sec.subsections) {
                  qs = [
                    ...(sec.subsections.easy || []),
                    ...(sec.subsections.medium || []),
                    ...(sec.subsections.hard || []),
                  ];
               }
               const sId = sec.sectionId || sec._id || `sec-${sIdx}`;
               const sTitle = sec.title || sec.name || `Section ${sIdx + 1}`;
               const sType = sec.type || "standard";
               return {
                 ...sec,
                 flatQuestions: qs.map(q => ({
                   ...q,
                   sectionId: q.sectionId || sId,
                   sectionTitle: q.sectionTitle || sTitle,
                   sectionType: q.sectionType || sType
                 }))
               };
            });
            const flatQs = normalizedSections.flatMap(sec => sec.flatQuestions);
            const mappedQs = flatQs.map((q, idx) => {
              let correctText = q.correctAnswer || "";
              if (q.correctAnswerObfuscated) {
                try {
                  correctText = atob(q.correctAnswerObfuscated);
                } catch (e) {
                  console.error("Failed to decode obfuscated correct answer:", e);
                }
              }
              if (["A", "B", "C", "D", "E", "F"].includes(correctText) && Array.isArray(q.options)) {
                const idxMap = { "A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5 };
                correctText = q.options[idxMap[correctText]] || correctText;
              } else if (typeof correctText === "string" && correctText.startsWith("Option ") && Array.isArray(q.options)) {
                const optNum = parseInt(correctText.replace("Option ", ""), 10);
                if (!isNaN(optNum) && optNum >= 1 && optNum <= q.options.length) {
                  correctText = q.options[optNum - 1] || correctText;
                }
              }

              const qIdStr = (q.id || q._id || q.questionId)?.toString();
              const qa = qIdStr ? analyticsMap.get(qIdStr) : null;
              const timeSpent = q.timeSpent !== undefined ? q.timeSpent : qa?.timeSpent;
              const visitCount = q.visitCount !== undefined ? q.visitCount : qa?.visitCount;
              const marksObtained = q.marksObtained !== undefined ? q.marksObtained : qa?.marksObtained;
              const status = q.status || qa?.status;
              const userAns = q.userAnswer !== undefined ? q.userAnswer : (qa?.userAnswer !== undefined ? qa.userAnswer : (data.userAnswers ? data.userAnswers[idx] : undefined));

              return {
                ...q,
                originalIndex: idx,
                correctAnswer: correctText,
                timeSpent,
                visitCount,
                marksObtained,
                status,
                userAnswer: userAns
              };
            });
            setQuestions(mappedQs);
            setUserAnswers(data.userAnswers || []);
          } catch (err) {
            console.error("Failed to fetch fallback quiz questions", err);
          }
        };
        fetchQuizQuestions();
      }
    }
  }, [data]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 300) {
        setVisibleCount((prevCount) => Math.min(prevCount + 10, questions.length));
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [questions.length]);

  // Save result to MongoDB whenever this page loads with valid data
  useEffect(() => {
    if (!data) return; // nothing to save if user landed here without quiz data

    console.log("Result Page Loaded");

    if (data?.isPreview) {
      console.log("PREVIEW MODE: Skipping result save.");
      return;
    }

    const saveResult = async () => {
      try {
        console.log("Saving Result...");

        const userString = localStorage.getItem("user");
        console.log("user from localStorage:", userString);

        if (data?.shareId) {
          console.log("Result already saved by server with shareId:", data.shareId);
          setShareId(data.shareId);
          return;
        }

        const user = userString ? JSON.parse(userString) : null;

        const userId = user?.id || user?._id;
        if (!userId) {
          console.log("SAVE SKIPPED: no logged-in user found in localStorage");
          return;
        }

        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/results/save`,
          {
            userId,
            quizId: data?.quizId || null,
            quizTitle: data?.title || null,
            subject: data?.subject || null,
            score,
            total,
            correct,
            incorrect,
            percentage: Number(computedPercentage),
            passPercentage: data?.passPercentage ?? 50,
            timeTaken: timeTakenSecs,
            questions: data?.questions || [],
            userAnswers: data?.userAnswers || [],
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          }
        );

        console.log("Result Saved");
        console.log(res.data);
        if (res.data && res.data.result && res.data.result.shareId) {
          setShareId(res.data.result.shareId);
          // Update local data cache so on refresh we still have shareId
          const newData = { ...data, shareId: res.data.result.shareId };
          setData(newData);
          localStorage.setItem("lastQuizResult", JSON.stringify(newData));
        }
      } catch (error) {
        console.log("SAVE ERROR");
        console.log(error);
      }
    };

    saveResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="result-page-new">
        <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
          <ThemeToggle />
        </div>
        <div className="result-modal-overlay">
          <div className="result-modal-card" style={{ textAlign: "center", alignItems: "center", padding: "48px 32px", maxWidth: "520px" }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: error.type === "UNAUTHORIZED" ? "rgba(239, 68, 68, 0.1)" : "color-mix(in srgb, var(--primary) 10%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              color: error.type === "UNAUTHORIZED" ? "#EF4444" : "var(--primary)"
            }}>
              <AlertCircle size={36} />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 8px" }}>{error.title}</h2>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 24px", lineHeight: "1.5" }}>{error.message}</p>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: "var(--violet)",
                color: "var(--primary-foreground)",
                border: "none",
                borderRadius: "12px",
                padding: "12px 28px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingLatest) {
    return (
      <div className="result-page">
        <QuizHeader title={examTitle} showInstructions={false} />
        <div style={{ maxWidth: "1200px", margin: "24px auto", padding: "0 20px", width: "100%", boxSizing: "border-box" }}>
          {/* Skeleton Hero Score Card */}
          <SkeletonCard style={{ padding: "32px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <Skeleton circle width={100} height={100} />
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <Skeleton width={200} height={28} rounded={8} />
                  <Skeleton width={140} height={16} rounded={4} />
                  <Skeleton width={90} height={24} rounded={12} />
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <Skeleton width={120} height={40} rounded={10} />
                <Skeleton width={120} height={40} rounded={10} />
              </div>
            </div>
          </SkeletonCard>

          {/* Skeleton Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>

          {/* Skeleton Content Card */}
          <SkeletonCard style={{ padding: "28px", minHeight: "260px" }}>
            <Skeleton width={160} height={20} rounded={6} style={{ marginBottom: "16px" }} />
            <Skeleton width="100%" height={180} rounded={10} />
          </SkeletonCard>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="result-page">
        <QuizHeader title={examTitle} showInstructions={false} />
        <div className="result-empty">
          <h2>No result data found.</h2>
          <p>Please attempt the test first.</p>
          <button className="back-btn" onClick={() => navigate("/")}>
            Go to Test
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    if (!seconds) return "0m 0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleShare = async () => {
    const shareUrl = shareId ? `${window.location.origin}/share-result/${shareId}` : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Quiz Result - ${examTitle}`, text: `I scored ${score}/${total} (${computedPercentage}%) on ${examTitle}!`, url: shareUrl });
      } catch (e) { console.log('Share cancelled'); }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Result link copied!');
    }
  };

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });



  if (data && data.showResultAfterSubmission === false) {
    const submittedOn = data.createdAt ? new Date(data.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date(data.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + ", " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    
    const showPassFail = data.showPassFailStatus === true;
    const isPassed = data.passed === true;

    return (
      <div style={{
        backgroundColor: "var(--bg-page)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: "40px 20px", boxSizing: "border-box"
      }}>
        {/* Floating Theme Toggle on Top Right */}
        <div className="rm-theme-toggle-pos" style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
          <ThemeToggle />
        </div>

        <div style={{
          display: "flex", gap: "30px", maxWidth: isExam ? "1100px" : "640px", width: "100%", justifyContent: "center", alignItems: "flex-start", boxSizing: "border-box", flexWrap: "wrap", margin: "0 auto"
        }}>
          {/* Left Column: Main Card */}
          <div style={{
            background: "var(--bg-card)", border: "1.5px solid var(--border-color)",
            borderRadius: "24px", padding: "40px",
            textAlign: "center", flex: 1.2, minWidth: "320px", maxWidth: "640px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)", boxSizing: "border-box"
          }}>
            
            {/* Circular green check icon with confetti style */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px", position: "relative" }}>
              {/* Confetti pieces */}
              <div className="confetti-piece" style={{ position: "absolute", top: "10px", left: "calc(50% - 70px)", width: "8px", height: "8px", background: "#8b5cf6", borderRadius: "2px", transform: "rotate(45deg)", animationDelay: "0s" }} />
              <div className="confetti-piece" style={{ position: "absolute", top: "40px", left: "calc(50% - 85px)", width: "6px", height: "12px", background: "#10b981", borderRadius: "1px", transform: "rotate(-15deg)", animationDelay: "0.4s" }} />
              <div className="confetti-piece" style={{ position: "absolute", top: "70px", left: "calc(50% - 65px)", width: "8px", height: "8px", background: "#3b82f6", borderRadius: "50%", animationDelay: "0.8s" }} />
              
              <div className="confetti-piece" style={{ position: "absolute", top: "15px", right: "calc(50% - 70px)", width: "8px", height: "8px", background: "#3b82f6", borderRadius: "2px", transform: "rotate(15deg)", animationDelay: "0.2s" }} />
              <div className="confetti-piece" style={{ position: "absolute", top: "45px", right: "calc(50% - 85px)", width: "6px", height: "12px", background: "#8b5cf6", borderRadius: "1px", transform: "rotate(30deg)", animationDelay: "0.6s" }} />
              <div className="confetti-piece" style={{ position: "absolute", top: "68px", right: "calc(50% - 65px)", width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", animationDelay: "1s" }} />

              <div style={{ position: "absolute", width: "160px", height: "160px", pointerEvents: "none", opacity: 0.8, background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", top: "-30px" }} />
              
              {showPassFail ? (
                <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: isPassed ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", border: isPassed ? "2px solid rgba(16, 185, 129, 0.2)" : "2px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: isPassed ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isPassed ? "0 6px 20px rgba(16, 185, 129, 0.4)" : "0 6px 20px rgba(239, 68, 68, 0.4)" }}>
                    {isPassed ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ width: "84px", height: "84px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", border: "2px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(16, 185, 129, 0.4)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>
              )}
            </div>

            {showPassFail ? (
              <>
                <h2 style={{ color: "var(--text-primary)", margin: "0 0 12px", fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                  {isPassed ? (
                    <>You have successfully <span style={{ color: "#10B981" }}>passed the exam!</span></>
                  ) : (
                    <>You did not <span style={{ color: "#EF4444" }}>pass the exam.</span></>
                  )}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "16px", fontWeight: "500", margin: "0 0 28px" }}>
                  {isPassed ? "Well done! Your hard work has paid off." : "Keep practicing! You can do better next time."}
                </p>
              </>
            ) : (
              <>
                <h2 style={{ color: "var(--text-primary)", margin: "0 0 12px", fontSize: "28px", fontWeight: "800", letterSpacing: "-0.5px" }}>
                  Test Submitted <span style={{ color: "#10B981" }}>Successfully!</span>
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "16px", fontWeight: "500", margin: "0 0 28px" }}>
                  Your responses have been recorded.
                </p>
              </>
            )}

            {showPassFail ? (
              /* Congratulations Card */
              <div style={{
                background: isPassed ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                border: isPassed ? "1.5px solid rgba(16, 185, 129, 0.2)" : "1.5px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                textAlign: "left",
                marginBottom: "32px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: isPassed ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {isPassed ? <Medal size={22} color="#10b981" /> : <AlertCircle size={22} color="#ef4444" />}
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {isPassed ? "Congratulations!" : "Result Status"}
                    </h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                      {isPassed ? "You have successfully passed the exam." : "You did not meet the passing criteria."}
                    </p>
                  </div>
                </div>
                <span style={{
                  background: isPassed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: isPassed ? "#10B981" : "#EF4444",
                  fontWeight: "700",
                  fontSize: "12px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  textTransform: "uppercase"
                }}>
                  {isPassed ? "★ Passed" : "⚠ Failed"}
                </span>
              </div>
            ) : (
              /* Dotted border card for hidden result */
              <div style={{
                background: "rgba(139, 92, 246, 0.03)",
                border: "1.5px dashed rgba(139, 92, 246, 0.3)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                textAlign: "left",
                marginBottom: "32px"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Clock size={22} color="#8b5cf6" />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>Result will be available later</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>The result for this exam will be processed and updated shortly. Please check back later.</p>
                </div>
              </div>
            )}

            {/* Style block for responsive grid */}
            <style>{`
              .submitted-details-row {
                border-top: 1.5px solid var(--border-color);
                padding-top: 28px;
                margin-bottom: 32px;
                display: grid;
                grid-template-columns: 1fr 1.3fr;
                gap: 20px;
                text-align: left;
              }
              @media (max-width: 640px) {
                .submitted-details-row {
                  grid-template-columns: 1fr;
                  gap: 24px;
                }
              }
              @keyframes confetti-drift {
                0% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-8px) translateX(3px) rotate(180deg); }
                100% { transform: translateY(0) rotate(360deg); }
              }
              .confetti-piece {
                animation: confetti-drift 4s ease-in-out infinite;
              }
            `}</style>

            {/* Grid stats section */}
            <div className="submitted-details-row">
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ color: "#8b5cf6", marginTop: "2px" }}><FileText size={20} /></div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Exam</span>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", lineHeight: "1.4" }}>{examTitle}</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ color: "#8b5cf6", marginTop: "2px" }}><CalendarDays size={20} /></div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Submitted On</span>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{submittedOn}</p>
                </div>
              </div>
            </div>

            {/* Go Back / Dashboard button */}
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: "var(--violet)",
                color: "var(--primary-foreground)",
                border: "none",
                borderRadius: "12px",
                padding: "14px 32px",
                fontSize: "15px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                margin: "0 auto",
                boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)"
              }}
            >
              <ArrowLeft size={18} />
              Go to Dashboard
            </button>

          </div>

          {/* Right Column: Feedback Card */}
          {isExam && (effectiveResultId || data?._id || data?.result?._id || data?.resultId) && (
            <div style={{ flex: 0.8, minWidth: "300px", maxWidth: "440px", width: "100%" }}>
              <FeedbackForm
                resultId={data?.result?._id || data?._id || data?.resultId || (resultId && resultId.length === 24 ? resultId : null)}
                initialReaction={data?.reaction}
                initialComment={data?.feedbackMessage}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`result-page-new ${showAnswers ? "show-answers" : ""}`}>
      {/* Floating Theme Toggle on Top Right */}
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      {isMultiQuiz ? (
        showAnswers ? (
          /* Multi Quiz Section-wise Solutions Review */
          <div className="result-review-container">
            <div className="result-details" style={{ marginTop: "0" }}>
              {/* Fixed Back Button in Absolute Top Left Corner */}
              <button 
                onClick={() => setShowAnswers(false)}
                style={{
                  position: "fixed",
                  top: "20px",
                  left: "20px",
                  zIndex: 110,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  backgroundColor: isDark ? "#1E1B2E" : "#ffffff",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                  border: "1px solid var(--border-color, #d1d5db)",
                  color: isDark ? "#ffffff" : "#000000",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                title="Back to Summary"
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <ArrowLeft size={22} strokeWidth={2.5} />
              </button>

              {/* Sticky Title */}
              <div style={{
                position: "sticky",
                top: 0,
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "18px 60px",
                backgroundColor: isDark ? "rgba(29, 27, 40, 0.95)" : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(12px)",
                borderRadius: "16px",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #E2E8F0",
                boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.35)" : "0 4px 20px rgba(0, 0, 0, 0.05)",
                marginBottom: "20px"
              }}>
                <h2 style={{ fontSize: "clamp(18px, 4vw, 24px)", margin: 0, lineHeight: "1.3", color: isDark ? "#FFFFFF" : "#1E293B", textAlign: "center", fontWeight: "700" }}>
                  Solutions & Detailed Analysis - {examTitle}
                </h2>
                <span style={{ fontSize: "12px", color: isDark ? "#94A3B8" : "#64748B", marginTop: "4px" }}>
                  Section-wise answers, bilingual explanations and timing analytics
                </span>
              </div>

              {/* Section Navigation Tabs */}
              <div style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                paddingBottom: "10px",
                marginBottom: "16px",
                scrollbarWidth: "none"
              }}>
                <button
                  onClick={() => setActiveSectionTab("all")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: activeSectionTab === "all" ? "1.5px solid #8B5CF6" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #E2E8F0"),
                    background: activeSectionTab === "all" ? (isDark ? "rgba(139, 92, 246, 0.25)" : "#EDE9FE") : (isDark ? "#1E1B2E" : "#ffffff"),
                    color: activeSectionTab === "all" ? (isDark ? "#C4B5FD" : "#6D28D9") : (isDark ? "#94A3B8" : "#64748B"),
                    fontWeight: "700",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s"
                  }}
                >
                  <Layers size={15} />
                  <span>All Sections</span>
                  <span style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    background: activeSectionTab === "all" ? "#8B5CF6" : (isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0"),
                    color: activeSectionTab === "all" ? "#ffffff" : (isDark ? "#CBD5E1" : "#475569")
                  }}>
                    {questions.length}
                  </span>
                </button>

                {data?.sectionResults?.map((sec, sIdx) => {
                  const secId = sec.sectionId || `sec-${sIdx}`;
                  const isSelected = activeSectionTab?.toString() === secId.toString();
                  const secTotal = (sec.totalQuestions && sec.totalQuestions > 0)
                    ? sec.totalQuestions
                    : ((sec.correct || 0) + (sec.incorrect || 0) + (sec.unanswered || 0)) || questions.filter(q => q.sectionId?.toString() === secId?.toString()).length || 0;
                  return (
                    <button
                      key={secId}
                      onClick={() => setActiveSectionTab(secId)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        border: isSelected ? "1.5px solid #8B5CF6" : (isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #E2E8F0"),
                        background: isSelected ? (isDark ? "rgba(139, 92, 246, 0.25)" : "#EDE9FE") : (isDark ? "#1E1B2E" : "#ffffff"),
                        color: isSelected ? (isDark ? "#C4B5FD" : "#6D28D9") : (isDark ? "#94A3B8" : "#64748B"),
                        fontWeight: "700",
                        fontSize: "13.5px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s"
                      }}
                    >
                      <span>{sec.sectionTitle || sec.title || `Section ${sIdx + 1}`}</span>
                      <span style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        background: isSelected ? "#8B5CF6" : (isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0"),
                        color: isSelected ? "#ffffff" : (isDark ? "#CBD5E1" : "#475569")
                      }}>
                        {secTotal}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filter Sub-bar */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "20px",
                padding: "10px 14px",
                borderRadius: "12px",
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FAFAFC",
                border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #E2E8F0"
              }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setReviewFilter("all")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: reviewFilter === "all" ? "#8B5CF6" : "transparent",
                      color: reviewFilter === "all" ? "#FFFFFF" : (isDark ? "#94A3B8" : "#64748B"),
                      transition: "all 0.15s ease"
                    }}
                  >
                    All ({sectionCounts.all})
                  </button>
                  <button
                    onClick={() => setReviewFilter("correct")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: reviewFilter === "correct" ? "#16A34A" : "transparent",
                      color: reviewFilter === "correct" ? "#FFFFFF" : "#16A34A",
                      transition: "all 0.15s ease"
                    }}
                  >
                    ✓ Correct ({sectionCounts.correct})
                  </button>
                  <button
                    onClick={() => setReviewFilter("incorrect")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: reviewFilter === "incorrect" ? "#DC2626" : "transparent",
                      color: reviewFilter === "incorrect" ? "#FFFFFF" : "#DC2626",
                      transition: "all 0.15s ease"
                    }}
                  >
                    ✕ Incorrect ({sectionCounts.incorrect})
                  </button>
                  <button
                    onClick={() => setReviewFilter("unattempted")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: reviewFilter === "unattempted" ? "#475569" : "transparent",
                      color: reviewFilter === "unattempted" ? "#FFFFFF" : (isDark ? "#94A3B8" : "#64748B"),
                      transition: "all 0.15s ease"
                    }}
                  >
                    — Unanswered ({sectionCounts.unattempted})
                  </button>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button 
                    onClick={() => {
                      const allIndices = {};
                      questions.forEach((_, idx) => { allIndices[idx] = true; });
                      setExpandedQuestions(allIndices);
                    }}
                    style={{ background: "transparent", border: "none", color: "var(--primary)", fontWeight: "600", cursor: "pointer", fontSize: "12.5px" }}
                  >
                    Expand All
                  </button>
                  <span style={{ color: "var(--text-muted, #94A3B8)" }}>|</span>
                  <button 
                    onClick={() => setExpandedQuestions({})}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted, #94A3B8)", fontWeight: "600", cursor: "pointer", fontSize: "12.5px" }}
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="review-list">
                {multiQuizFilteredQuestions.length === 0 ? (
                  <div style={{
                    padding: "40px",
                    textAlign: "center",
                    background: "var(--bg-card)",
                    borderRadius: "16px",
                    border: "1px dashed var(--border-color)",
                    color: "var(--text-secondary)"
                  }}>
                    <HelpCircle size={32} style={{ margin: "0 auto 12px", color: "var(--text-muted)" }} />
                    <p style={{ margin: 0, fontSize: "15px", fontWeight: "600" }}>No questions match this filter in the selected section.</p>
                  </div>
                ) : (
                  multiQuizFilteredQuestions.map((q, filteredIdx) => {
                    const globalIdx = q.globalIndex ?? filteredIdx;
                    const userAns = q.userAnswer !== undefined ? q.userAnswer : userAnswers[globalIdx];
                    const isUnanswered = userAns === undefined || userAns === null || userAns === "";
                    const isCorrect = q.status === "correct" || (q.correctAnswer ? String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase() : false);
                    const isIncorrect = q.status === "incorrect" || (!isCorrect && !isUnanswered);

                    let statusBadgeBg = "rgba(100, 116, 139, 0.15)";
                    let statusBadgeColor = "#64748B";
                    let statusBadgeLabel = "Unanswered";
                    let cardBorder = "1px solid var(--border-color)";

                    if (isCorrect) {
                      statusBadgeBg = "rgba(34, 197, 94, 0.15)";
                      statusBadgeColor = "#22C55E";
                      statusBadgeLabel = "Correct";
                      cardBorder = "1.5px solid #22C55E";
                    } else if (isIncorrect) {
                      statusBadgeBg = "rgba(239, 68, 68, 0.15)";
                      statusBadgeColor = "#EF4444";
                      statusBadgeLabel = "Incorrect";
                      cardBorder = "1.5px solid #EF4444";
                    }

                    // Marks display
                    let marksText = "0 marks";
                    if (q.marksObtained !== undefined && q.marksObtained !== null) {
                      marksText = (q.marksObtained > 0 ? `+${q.marksObtained}` : `${q.marksObtained}`) + " marks";
                    } else if (isCorrect) {
                      marksText = `+${q.marksPerQuestion || 1} mark`;
                    } else if (isIncorrect) {
                      marksText = `-${q.negativeMarking || 0} mark`;
                    }

                    const isExpanded = !!expandedQuestions[globalIdx];

                    return (
                      <div 
                        className="review-item" 
                        key={q.id || q._id || globalIdx}
                        style={{ 
                          borderRadius: "14px", 
                          marginBottom: "16px", 
                          border: cardBorder, 
                          boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                          overflow: "hidden",
                          transition: "all 0.25s ease",
                          background: "var(--bg-card)"
                        }}
                      >
                        {/* Collapsible Header */}
                        <div 
                          onClick={() => {
                            setExpandedQuestions(prev => ({
                              ...prev,
                              [globalIdx]: !prev[globalIdx]
                            }));
                          }}
                          style={{ 
                            padding: "16px 20px", 
                            cursor: "pointer", 
                            backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "#FAFAFC", 
                            display: "flex", 
                            flexDirection: "column",
                            gap: "12px",
                            userSelect: "none"
                          }}
                        >
                          {/* Top Badges Meta Row */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              {/* Section Title Pill */}
                              {q.sectionTitle && (
                                <span style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  color: isDark ? "#C4B5FD" : "#6D28D9",
                                  background: isDark ? "rgba(139, 92, 246, 0.2)" : "#f3e8ff",
                                  padding: "2px 8px",
                                  borderRadius: "6px"
                                }}>
                                  {q.sectionTitle}
                                </span>
                              )}
                              
                              {/* Status Badge */}
                              <span style={{
                                fontSize: "11.5px",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: statusBadgeBg,
                                color: statusBadgeColor
                              }}>
                                {statusBadgeLabel}
                              </span>

                              {/* Marks Pill */}
                              <span style={{
                                fontSize: "11.5px",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                                color: isCorrect ? "#22c55e" : (isIncorrect ? "#ef4444" : (isDark ? "#CBD5E1" : "#64748B"))
                              }}>
                                {marksText}
                              </span>

                              {/* Time Spent Pill */}
                              <span style={{
                                fontSize: "11.5px",
                                fontWeight: "600",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                                color: isDark ? "#FFFFFF" : "#1E293B",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}>
                                <Clock size={11} color="#8b5cf6" />
                                {formatTimingSafe(q.timeSpent)}
                              </span>

                              {/* Visit Count Pill */}
                              <span style={{
                                fontSize: "11.5px",
                                fontWeight: "600",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
                                color: isDark ? "#CBD5E1" : "#64748B",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}>
                                <Eye size={11} />
                                {q.visitCount !== undefined && q.visitCount !== null ? `${q.visitCount} visits` : "Not available"}
                              </span>
                            </div>

                            {/* Accordion Indicator Chevron */}
                            <span style={{ 
                              color: "var(--text-secondary)", 
                              fontSize: "18px", 
                              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", 
                              transition: "transform 0.2s ease",
                              fontWeight: "bold"
                            }}>
                              ❯
                            </span>
                          </div>

                          {/* Question Text */}
                          <div className="review-question" style={{ display: "flex", gap: "12px", alignItems: "flex-start", textAlign: "left" }}>
                            <span className="q-number" style={{ 
                              minWidth: "30px", 
                              height: "30px",
                              borderRadius: "8px",
                              backgroundColor: statusBadgeColor,
                              color: "#FFFFFF",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "800",
                              fontSize: "13px",
                              flexShrink: 0
                            }}>
                              {filteredIdx + 1}
                            </span>
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "600", color: isDark ? "#F1F5F9" : "#1E293B", fontSize: "15px", lineHeight: "1.5" }}>
                                <MathRenderer text={q.english || q.questionEnglish} />
                              </div>
                              {(q.hindi || q.questionHindi) && (
                                <div style={{ fontWeight: "500", color: isDark ? "#CBD5E1" : "#475569", marginTop: "6px", fontSize: "14px", lineHeight: "1.5" }}>
                                  <MathRenderer text={q.hindi || q.questionHindi} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Options and Explanation */}
                        <div style={{ 
                          height: isExpanded ? "auto" : "0px",
                          overflow: "hidden",
                          transition: "all 0.25s ease-in-out",
                          borderTop: isExpanded ? "1px solid var(--border-color)" : "none",
                          backgroundColor: isDark ? "#171622" : "#ffffff",
                          padding: isExpanded ? "20px" : "0px 20px"
                        }}>
                          {/* Options Grid */}
                          <div className="review-options" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {q.options && q.options.length > 0 ? q.options.map((opt, optIdx) => {
                              const isSelected = userAns === opt;
                              const showCorrect = data?.showCorrectAnswers !== false;
                              const isCorrectOpt = showCorrect && q.correctAnswer === opt;
                              
                              let optBg = isDark ? "#2A273A" : "#ffffff";
                              let optBorder = isDark ? "1px solid #3F3C53" : "1px solid #E2E8F0";
                              let optColor = isDark ? "#F8FAFC" : "#1E293B";
                              let optWeight = "500";
                              
                              if (isCorrectOpt) {
                                optBg = isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7";
                                optBorder = "1px solid #22c55e";
                                optColor = isDark ? "#4ade80" : "#166534";
                                optWeight = "600";
                              } else if (isSelected) {
                                if (showCorrect) {
                                  optBg = isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2";
                                  optBorder = "1px solid #ef4444";
                                  optColor = isDark ? "#f87171" : "#991b1b";
                                } else {
                                  optBg = isDark ? "rgba(139, 92, 246, 0.15)" : "#f3e8ff";
                                  optBorder = "1px solid var(--primary)";
                                  optColor = "var(--primary)";
                                  optWeight = "600";
                                }
                              }
                              
                              return (
                                <div key={optIdx} style={{ 
                                  padding: "12px 16px", 
                                  borderRadius: "10px", 
                                  backgroundColor: optBg, 
                                  border: optBorder,
                                  color: optColor,
                                  fontWeight: optWeight,
                                  fontSize: "14.5px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  transition: "all 0.2s"
                                }}>
                                  <span style={{ 
                                    width: "26px", 
                                    height: "26px", 
                                    borderRadius: "50%", 
                                    backgroundColor: isCorrectOpt ? "#22c55e" : (isSelected ? (showCorrect ? "#ef4444" : "var(--primary)") : (isDark ? "#3F3C53" : "#F1F5F9")),
                                    color: isCorrectOpt || isSelected ? "#fff" : (isDark ? "#E2E8F0" : "#64748B"),
                                    border: isCorrectOpt || isSelected ? "none" : (isDark ? "1px solid #4F4C63" : "1px solid #E2E8F0"),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    flexShrink: 0
                                  }}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span style={{ lineHeight: "1.4" }}><MathRenderer text={opt} /></span>
                                </div>
                              );
                            }) : (
                              <div style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "14px" }}>No options available.</div>
                            )}
                          </div>

                          {/* Student Answer vs Correct Answer Summary */}
                          <div className="review-answers" style={{ marginTop: "16px" }}>
                            <div style={{ marginBottom: "16px", fontSize: "14.5px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                              <strong style={{ color: isDark ? "#E2E8F0" : "#1E293B" }}>Your Answer: </strong>
                              <span
                                style={{ 
                                  padding: "4px 10px", 
                                  borderRadius: "6px", 
                                  backgroundColor: isUnanswered ? (isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9") : (isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"), 
                                  color: isUnanswered ? "var(--text-muted)" : (isCorrect ? "#22c55e" : "#ef4444"), 
                                  border: "1px solid var(--border-color)", 
                                  fontWeight: "700", 
                                  whiteSpace: "nowrap" 
                                }}
                              >
                                {(userAns !== undefined && userAns !== null && userAns !== "") ? <MathRenderer text={userAns} /> : "Not Answered"}
                              </span>

                              {data?.showCorrectAnswers !== false && q.correctAnswer && (
                                <>
                                  <strong style={{ color: isDark ? "#E2E8F0" : "#1E293B", marginLeft: "12px" }}>Correct Answer: </strong>
                                  <span style={{
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    backgroundColor: "rgba(34,197,94,0.15)",
                                    color: "#22c55e",
                                    border: "1px solid rgba(34,197,94,0.3)",
                                    fontWeight: "700",
                                    whiteSpace: "nowrap"
                                  }}>
                                    <MathRenderer text={q.correctAnswer} />
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {/* Explanations & Solution Steps */}
                            {data?.showExplanations !== false && (q.explanation || q.solution) && (
                              <div style={{ 
                                marginTop: "20px", 
                                padding: "16px 20px", 
                                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC", 
                                borderLeft: "4px solid var(--primary)", 
                                borderRadius: "8px", 
                                boxShadow: "0 2px 8px rgba(0,0,0,0.04)", 
                                textAlign: "left" 
                              }}>
                                <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span>💡</span> Explanation & Solution Steps
                                </p>
                                <div style={{ margin: 0, fontSize: "14.5px", color: isDark ? "#E2E8F0" : "#475569", lineHeight: "1.6" }}>
                                  <MathRenderer text={q.explanation || q.solution} />
                                </div>
                                {(q.explanationHindi || q.solutionHindi) && (
                                  <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed var(--border-color)", fontSize: "14px", color: isDark ? "#CBD5E1" : "#475569", lineHeight: "1.6" }}>
                                    <MathRenderer text={q.explanationHindi || q.solutionHindi} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Actions */}
              <div className="result-actions" style={{ marginTop: "40px", paddingBottom: "60px", display: "flex", justifyContent: "center", gap: "16px" }}>
                <button 
                  className="rm-btn-outline" 
                  style={{ padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
                  onClick={() => setShowAnswers(false)}
                >
                  ← Back to Summary
                </button>
                <button 
                  className="rm-btn-solid" 
                  style={{ padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
                  onClick={() => navigate("/dashboard")}
                >
                  Back to Dashboard
                </button>
              </div>

              {/* Floating scroll action button */}
              <div style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 1000 }}>
                <button
                  onClick={() => {
                    if (isScrolledDown) {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
                    }
                  }}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: isDark ? "var(--primary)" : "#ffffff",
                    color: isDark ? "#ffffff" : "var(--primary)",
                    border: "2px solid var(--border-color, #d1d5db)",
                    boxShadow: "0 4px 16px rgba(110, 63, 243, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    fontSize: "16px",
                    fontWeight: "bold"
                  }}
                  title={isScrolledDown ? "Scroll to Top" : "Scroll to Bottom"}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {isScrolledDown ? "▲" : "▼"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Multi Quiz Overall Performance & Subject Cards Summary View */
          <div className="result-modal-overlay rm-mobile-overlay" style={{ minHeight: "100vh", padding: "40px 16px" }}>
            {/* Back button */}
            <button 
              className="rm-back-btn"
              onClick={() => {
                if (location.state?.fromAttempts) {
                  navigate(-1);
                } else {
                  navigate("/dashboard/results");
                }
              }}
              style={{
                position: "fixed",
                top: "20px",
                left: "20px",
                zIndex: 110,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                backgroundColor: isDark ? "#1E1B2E" : "#ffffff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                border: "1px solid var(--border-color, #d1d5db)",
                color: isDark ? "#ffffff" : "#000000",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Go Back"
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>

            {/* Top Segmented Navigation (Overview vs Deep Analytics) */}
            <div className="mqa-top-nav" style={{ marginBottom: "24px" }}>
              <button
                className={`mqa-tab-btn ${resultTab === "overview" ? "active" : ""}`}
                onClick={() => setResultTab("overview")}
              >
                <LayoutGrid size={16} /> Overview
              </button>
              <button
                className={`mqa-tab-btn ${resultTab === "analytics" ? "active" : ""}`}
                onClick={() => setResultTab("analytics")}
              >
                <BarChart3 size={16} /> Deep Analytics & Insights
              </button>
            </div>

            {resultTab === "analytics" ? (
              <div style={{ maxWidth: "860px", width: "100%", margin: "0 auto" }}>
                <MultiQuizAnalyticsDashboard
                  resultId={effectiveResultId || data?._id}
                  initialData={data}
                  onViewSolutions={() => {
                    setActiveSectionTab("all");
                    setShowAnswers(true);
                  }}
                  onBackToOverview={() => setResultTab("overview")}
                />
              </div>
            ) : (
              <div style={{
                display: "flex",
                gap: "30px",
                maxWidth: isExam ? "1100px" : "700px",
                width: "100%",
                justifyContent: "center",
                alignItems: "flex-start",
                boxSizing: "border-box",
                flexWrap: "wrap",
                margin: "0 auto"
              }}>
                {/* SINGLE UNIFIED RESULT CARD */}
                <div className="result-modal-card" style={{ margin: 0, flex: 1.2, minWidth: "320px", maxWidth: "680px" }}>
                
                {/* Header with Mascot */}
                <div className="rm-header">
                  <div className="rm-trophy" style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                    <DotLottieReact 
                      src={Number(computedPercentage) >= passThreshold ? "/Badge.lottie" : "/idk.lottie"} 
                      loop 
                      autoplay 
                      className="rm-mascot-lottie"
                      style={{ width: "85px", height: "85px", transform: "scale(2.0)" }} 
                    />
                  </div>
                  <h2>
                    {Number(computedPercentage) >= 80 ? "Outstanding Performance!" : Number(computedPercentage) >= passThreshold ? "Exam Completed Successfully!" : "Exam Completed — Keep Practicing!"}
                  </h2>
                  <p>
                    {Number(computedPercentage) >= passThreshold ? (
                      <>Great job, <strong>{user.name || user.fullName}</strong>! You've completed <strong>{examTitle}</strong>.</>
                    ) : (
                      <>Keep practicing, <strong>{user.name || user.fullName}</strong>! You've completed <strong>{examTitle}</strong>. Review your solutions below to improve.</>
                    )}
                  </p>
                </div>

                {/* Quiz Info */}
                <div className="rm-info-card">
                  <div className="rm-icon-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#8B5CF6", backgroundColor: "rgba(139, 92, 246, 0.12)", borderRadius: "14px", width: "52px", height: "52px", flexShrink: 0 }}>
                    <FileText size={24} />
                  </div>
                  <div className="rm-info-content">
                    <p className="rm-info-label">Multi-Section Assessment</p>
                    <h3 className="rm-info-title">{examTitle}</h3>
                    <div className="rm-info-meta">
                      <span className="rm-info-chip"><CalendarDays size={13} /> {formattedDate}</span>
                      <span className="rm-info-chip"><Clock size={13} /> {formatDurationDisplay(data?.duration)}</span>
                      <span className="rm-info-chip"><HelpCircle size={13} /> {total} Questions</span>
                      {data?.sectionResults?.length > 1 && (
                        <span className="rm-info-chip" style={{ background: isDark ? "rgba(139, 92, 246, 0.2)" : "#EDE9FE", color: isDark ? "#C4B5FD" : "#6D28D9" }}>
                          <Layers size={13} /> {data.sectionResults.length} Sections
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hero Score Box */}
                <div className="rm-score-section">
                  <div className="rm-score-circle-wrapper">
                    <div className="rm-score-circle" style={{ background: `conic-gradient(#8B5CF6 ${computedPercentage}%, ${isDark ? "#141220" : "#F3F4F6"} ${computedPercentage}%)` }}>
                      <div className="rm-score-inner">
                        <span className="rm-pct">{computedPercentage}%</span>
                        <span className="rm-pct-label">Score</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rm-score-middle">
                    <p className="rm-score-label">Your Score</p>
                    <h2 className="rm-score-fraction">
                      <span className="rm-score-num">{score}</span>
                      <span className="rm-score-denom">/{maxPossibleMarksDisplay}</span>
                    </h2>
                    <div className={`rm-badge ${Number(computedPercentage) >= passThreshold ? "badge-pass" : "badge-fail"}`}>
                      {Number(computedPercentage) >= passThreshold ? "Passed 🎉" : "Failed 😢"}
                    </div>
                  </div>

                  <div className="rm-score-right">
                    <div style={{ marginBottom: "6px", color: "#8B5CF6", display: "flex", justifyContent: "center" }}>
                      <Timer size={28} />
                    </div>
                    <h4 className="rm-feedback-title" style={{ fontSize: "17px", fontWeight: "800", margin: "0 0 2px" }}>
                      {formatTimingSafe(data?.timeTaken)}
                    </h4>
                    <p className="rm-feedback-text" style={{ fontSize: "11px", margin: 0 }}>
                      Accuracy: <strong style={{ color: "#8B5CF6" }}>{accuracyDisplay}%</strong> ({attemptedCount}/{total})
                    </p>
                  </div>
                </div>

                {/* 4 Metrics Grid */}
                <div className="rm-metrics-grid">
                  <div className="rm-metric">
                    <div className="rm-metric-icon icon-green" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Target size={24} /></div>
                    <div className="rm-metric-data">
                      <h4>{correct}</h4>
                      <p>Correct Answers</p>
                    </div>
                  </div>
                  <div className="rm-metric">
                    <div className="rm-metric-icon icon-red" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><XCircle size={24} /></div>
                    <div className="rm-metric-data">
                      <h4>{incorrect}</h4>
                      <p>Incorrect Answers</p>
                    </div>
                  </div>
                  <div className="rm-metric">
                    <div className="rm-metric-icon icon-blue" style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(100, 116, 139, 0.15)", color: "#64748B" }}><HelpCircle size={24} /></div>
                    <div className="rm-metric-data">
                      <h4>{unanswered}</h4>
                      <p>Unanswered</p>
                    </div>
                  </div>
                  <div className="rm-metric">
                    <div className="rm-metric-icon icon-orange" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={24} /></div>
                    <div className="rm-metric-data">
                      <h4>{attemptedCount}</h4>
                      <p>Attempted ({accuracyDisplay}%)</p>
                    </div>
                  </div>
                </div>

                {/* Integrated Section Breakdown (Only when quiz actually has multiple sections > 1) */}
                {/* Subject-Wise Micro Breakdown Card */}
                {data?.sectionResults?.length > 1 && (
                  <div className="rm-section-breakdown-card" style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: isDark ? "rgba(255, 255, 255, 0.02)" : "#F8FAFC",
                    border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #E2E8F0",
                    textAlign: "left"
                  }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Layers size={16} color="#8B5CF6" /> Section-wise Breakdown
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {data.sectionResults.map((sec, idx) => {
                        const secId = sec.sectionId || `sec-${idx}`;
                        const secTotal = (sec.totalQuestions && sec.totalQuestions > 0)
                          ? sec.totalQuestions
                          : ((sec.correct || 0) + (sec.incorrect || 0) + (sec.unanswered || 0)) || questions.filter(q => q.sectionId?.toString() === secId?.toString()).length || 0;
                        const secMax = (sec.maxMarks !== undefined && sec.maxMarks !== null && sec.maxMarks > 0)
                          ? sec.maxMarks
                          : (secTotal > 0 ? secTotal * (sec.marksPerQuestion || 1) : secTotal);
                        const secAcc = sec.accuracy !== undefined && sec.accuracy !== null
                          ? `${Number(sec.accuracy).toFixed(1)}%`
                          : (sec.attempted > 0 ? `${((sec.correct / sec.attempted) * 100).toFixed(1)}%` : "0%");

                        return (
                          <div
                            key={secId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              borderRadius: "12px",
                              background: isDark ? "#1E1B2E" : "#FFFFFF",
                              border: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #E2E8F0",
                              flexWrap: "wrap",
                              gap: "8px"
                            }}
                          >
                            <div style={{ minWidth: "140px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
                                {sec.sectionTitle || sec.title || `Section ${idx + 1}`}
                              </span>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "8px", marginTop: "2px" }}>
                                <span style={{ color: "#22C55E" }}>✓ {sec.correct ?? 0}</span>
                                <span style={{ color: "#EF4444" }}>✕ {sec.incorrect ?? 0}</span>
                                <span>{secTotal} Qs</span>
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#8B5CF6" }}>
                                {sec.score ?? 0} <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--text-secondary)" }}>/ {secMax}</span>
                              </span>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                Acc: {secAcc} • {formatTimingSafe(sec.timeTaken)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Button to navigate to Deep Analytics */}
                      <button
                        onClick={() => setResultTab("analytics")}
                        style={{
                          marginTop: "10px",
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: isDark ? "rgba(139, 92, 246, 0.15)" : "#EDE9FE",
                          color: isDark ? "#C4B5FD" : "#6D28D9",
                          border: isDark ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid #DDD6FE",
                          fontWeight: "700",
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <Sparkles size={15} />
                        <span>View Deep Section Analytics & Recommendations →</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ONE Action Buttons Row */}
                <div className="rm-modal-actions">
                  <button
                    className="btn-review"
                    onClick={() => {
                      setActiveSectionTab("all");
                      setShowAnswers(true);
                    }}
                  >
                    <BookOpen size={17} />
                    Review Detailed Solutions
                  </button>
                  <button
                    className="btn-dashboard"
                    onClick={() => navigate("/dashboard")}
                  >
                    Dashboard
                  </button>
                </div>

                {/* Social Share Box */}
                <div className="rm-social-share" style={{ textAlign: "center", marginTop: "12px" }}>
                  <p>Share Your Result</p>
                  {shareId ? (
                    <div className="rm-social-icons">
                      <button title="Share on WhatsApp" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`I scored ${score}/${total} on ${examTitle}! Check it out here: ${window.location.origin}/share-result/${shareId}`)}`, '_blank')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#25D366" }}>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      </button>
                      <button title="Share on Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/share-result/${shareId}`)}`, '_blank')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#1877F2" }}>
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                      </button>
                      <button title="Share on Instagram" onClick={() => { navigator.clipboard.writeText(`I scored ${score}/${total} on ${examTitle}! Link: ${window.location.origin}/share-result/${shareId}`); alert("Result text and link copied! Open Instagram to share it."); }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#E1306C" }}>
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                      </button>
                      <button title="Copy Link" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share-result/${shareId}`); alert("Link copied to clipboard!"); }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6B7280" }}>
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Generating share link...</p>
                  )}
                </div>
              </div>

              {/* Right Column: Feedback Card (if isExam) */}
              {isExam && (effectiveResultId || data?._id || data?.result?._id || data?.resultId) && (
                <div style={{ flex: 0.8, minWidth: "300px", maxWidth: "440px", width: "100%" }}>
                  <FeedbackForm
                    resultId={data?.result?._id || data?._id || data?.resultId || (resultId && resultId.length === 24 ? resultId : null)}
                    initialReaction={data?.reaction}
                    initialComment={data?.feedbackMessage}
                  />
                </div>
              )}
            </div>
          )}
          </div>
        )
      ) : (
        /* Original Single Quiz Experience (100% UNCHANGED) */
        <>
            {/* Header */}
      {!showAnswers && isMobile && (
        <div style={{
          backgroundColor: "var(--bg-page)",
          color: "var(--text-primary)",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', sans-serif",
          padding: "20px",
          boxSizing: "border-box"
        }}>
          {/* Top Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", marginTop: "10px" }}>
            <button 
              onClick={() => {
                if (location.state?.fromAttempts) {
                  navigate(-1);
                } else {
                  navigate("/dashboard/results");
                }
              }}
              style={{
                background: "none", border: "none", color: "var(--text-primary)", fontSize: "24px", cursor: "pointer", padding: "0"
              }}
            >
              ←
            </button>
            <h2 style={{ fontSize: "16px", fontWeight: "600", margin: "0", textAlign: "center", flex: 1, padding: "0 10px" }}>
              {examTitle}
            </h2>
            <div style={{ width: "24px" }}></div>
          </div>

          {/* Mascot & Motivational Text */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
            <DotLottieReact src={Number(computedPercentage) >= passThreshold ? "/Badge.lottie" : "/idk.lottie"} loop autoplay style={{ width: "100px", height: "100px", marginBottom: "16px", transform: "scale(1.8)" }} />
            <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0", textAlign: "center" }}>
              {Number(computedPercentage) >= 80 ? "Excellent Work!" : Number(computedPercentage) >= passThreshold ? "Good effort, keep going" : "Keep Practicing!"}
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, textAlign: "center" }}>
              {Number(computedPercentage) >= 80 ? "Outstanding performance!" : Number(computedPercentage) >= passThreshold ? "You're on the right track" : "Don't give up, try again"}
            </p>
          </div>

          {/* Score Circle */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
            <div style={{
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              background: `conic-gradient(var(--primary) ${computedPercentage}%, ${isDark ? "#1D1B28" : "#E5E7EB"} ${computedPercentage}%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 16px rgba(0,0,0,0.1)"
            }}>
              <div style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                backgroundColor: "var(--bg-page)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Your score</span>
                <span style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1 }}>{score}/{total}</span>
                <span style={{ fontSize: "14px", color: "var(--primary)", fontWeight: "600", marginTop: "4px" }}>{computedPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", gap: "10px" }}>
            <div 
              onClick={() => {
                if (data?.showAnswerReview !== false) {
                  setReviewFilter(reviewFilter === "correct" ? "all" : "correct");
                  setShowAnswers(true);
                }
              }}
              style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderRadius: "16px", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", cursor: data?.showAnswerReview !== false ? "pointer" : "default" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px", fontSize: "14px" }}>✓</div>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>{correct}</span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Correct</span>
            </div>
            <div 
              onClick={() => {
                if (data?.showAnswerReview !== false) {
                  setReviewFilter(reviewFilter === "incorrect" ? "all" : "incorrect");
                  setShowAnswers(true);
                }
              }}
              style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderRadius: "16px", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", cursor: data?.showAnswerReview !== false ? "pointer" : "default" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px", fontSize: "14px" }}>✕</div>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>{incorrect}</span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Wrong</span>
            </div>
            <div 
              onClick={() => {
                if (data?.showAnswerReview !== false) {
                  setReviewFilter(reviewFilter === "unattempted" ? "all" : "unattempted");
                  setShowAnswers(true);
                }
              }}
              style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderRadius: "16px", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", cursor: data?.showAnswerReview !== false ? "pointer" : "default" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(156, 163, 175, 0.1)", color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px", fontSize: "14px" }}>—</div>
              <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>{unanswered}</span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Skipped</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "row", gap: "12px", marginTop: "8px" }}>
            <button 
              onClick={() => setShowAnswers(true)}
              style={{
                flex: 1, padding: "14px 8px", borderRadius: "16px", backgroundColor: "var(--primary)", color: "var(--primary-foreground)", fontSize: "14.5px", fontWeight: "600", border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", textAlign: "center", whiteSpace: "nowrap"
              }}
            >
              Review Answers
            </button>
            <button 
              onClick={() => navigate("/dashboard")}
              style={{
                flex: 1, padding: "14px 8px", borderRadius: "16px", backgroundColor: "transparent", color: "var(--text-primary)", fontSize: "14.5px", fontWeight: "600", border: "1px solid var(--border-color)", cursor: "pointer", textAlign: "center", whiteSpace: "nowrap"
              }}
            >
              Dashboard
            </button>
          </div>
          
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <span onClick={handleShare} style={{ color: "var(--primary)", fontSize: "14px", fontWeight: "500", cursor: "pointer", textDecoration: "underline" }}>
              Share Result
            </span>
          </div>
        </div>
      )} {!showAnswers && !isMobile && (
        <div className="result-modal-overlay">
          {/* Back button to go to previous page (e.g. Attempts list) */}
          <button 
            onClick={() => {
              if (location.state?.fromAttempts) {
                navigate(-1);
              } else {
                navigate("/dashboard/results");
              }
            }}
            style={{
              position: "fixed",
              top: "20px",
              left: "20px",
              zIndex: 110,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "46px",
              height: "46px",
              borderRadius: "50%",
              backgroundColor: isDark ? "#1E1B2E" : "#ffffff",
              boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
              border: "1px solid var(--border-color, #d1d5db)",
              color: isDark ? "#ffffff" : "#000000",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title="Go Back"
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>

          <div style={{
            display: "flex", gap: "30px", maxWidth: isExam ? "1100px" : "650px", width: "100%", justifyContent: "center", alignItems: "flex-start", boxSizing: "border-box", flexWrap: "wrap", margin: "0 auto"
          }}>
            <div className="result-modal-card" style={{ margin: 0, flex: 1.2, minWidth: "320px", maxWidth: "650px" }}>
              
            {/* DESKTOP ORIGINAL TOP SECTION */}
            <div className="rm-desktop-top">
<div className="rm-header">
              <div className="rm-trophy" style={{ display: "flex", justifyContent: "center", marginBottom: "16px", color: "#F59E0B" }}>
                <DotLottieReact src={Number(computedPercentage) >= passThreshold ? "/Badge.lottie" : "/idk.lottie"} loop autoplay style={{ width: "80px", height: "80px", transform: "scale(2.2)" }} />
              </div>
              <h2>{Number(computedPercentage) >= passThreshold ? "Quiz Completed!" : "Keep Practicing!"}</h2>
              <p>
                {Number(computedPercentage) >= passThreshold ? (
                  <>Great job, <strong>{user.name || user.fullName}</strong>! You've completed the quiz.</>
                ) : (
                  <>Keep practicing, <strong>{user.name || user.fullName}</strong>! Review your answers below to improve your score.</>
                )}
              </p>
            </div>

            {/* Quiz Info */}
            <div className="rm-info-card">
              <div className="rm-icon-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)", borderRadius: "14px", width: "52px", height: "52px", flexShrink: 0 }}>
                <FileText size={24} />
              </div>
              <div className="rm-info-content">
                <p className="rm-info-label">Quiz Title</p>
                <h3 className="rm-info-title">{examTitle}</h3>
                <div className="rm-info-meta">
                  <span className="rm-info-chip"><CalendarDays size={13} /> {formattedDate}</span>
                  <span className="rm-info-chip"><Clock size={13} /> {formatDurationDisplay(data?.duration)}</span>
                  <span className="rm-info-chip"><HelpCircle size={13} /> {total} Questions</span>
                </div>
              </div>
            </div>

            {/* Score Section */}
            <div className="rm-score-section">
              <div className="rm-score-circle-wrapper">
                <div className="rm-score-circle" style={{ background: `conic-gradient(var(--primary) ${computedPercentage}%, ${isDark ? "#1D1B28" : "#F3F4F6"} ${computedPercentage}%)` }}>
                  <div className="rm-score-inner">
                    <span className="rm-pct">{computedPercentage}%</span>
                    <span className="rm-pct-label">Score</span>
                  </div>
                </div>
              </div>
              
              <div className="rm-score-middle">
                <p className="rm-score-label">Your Score</p>
                <h2 className="rm-score-fraction">
                  <span className="rm-score-num">{score}</span>
                  <span className="rm-score-denom">/{total}</span>
                </h2>
                <div className={`rm-badge ${Number(computedPercentage) >= passThreshold ? "badge-pass" : "badge-fail"}`}>
                  {Number(computedPercentage) >= passThreshold ? "Passed 🎉" : "Failed 😢"}
                </div>
              </div>

              <div className="rm-score-right">
                <div className="rm-medal" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "#F59E0B" }}>
                  <Medal size={40} strokeWidth={1.5} />
                </div>
                <h4 className="rm-feedback-title">
                  {Number(computedPercentage) >= 80 ? "Excellent Work!" : Number(computedPercentage) >= passThreshold ? "Good Job!" : "Keep Trying!"}
                </h4>
                <p className="rm-feedback-text">
                  {computedPercentage === 0 
                    ? "Don't give up! Review your answers and try again." 
                    : <>You scored higher than <strong>{computedPercentage}%</strong> of users</>
                  }
                </p>
              </div>
            </div>

                        </div>

            {/* Metrics Grid */}
            <div className="rm-metrics-grid">
              <div 
                className="rm-metric"
                onClick={() => {
                  if (data?.showAnswerReview !== false) {
                    setReviewFilter(reviewFilter === "correct" ? "all" : "correct");
                    setShowAnswers(true);
                  }
                }}
                style={{ 
                  cursor: (data?.showAnswerReview !== false) ? "pointer" : "default"
                }}
              >
                <div className="rm-metric-icon icon-green" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Target size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{correct}</h4>
                  <p>Correct Answers</p>
                </div>
              </div>
              <div 
                className="rm-metric"
                onClick={() => {
                  if (data?.showAnswerReview !== false) {
                    setReviewFilter(reviewFilter === "incorrect" ? "all" : "incorrect");
                    setShowAnswers(true);
                  }
                }}
                style={{ 
                  cursor: (data?.showAnswerReview !== false) ? "pointer" : "default"
                }}
              >
                <div className="rm-metric-icon icon-red" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><XCircle size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{incorrect}</h4>
                  <p>Incorrect Answers</p>
                </div>
              </div>
              <div 
                className="rm-metric"
                onClick={() => {
                  if (data?.showAnswerReview !== false) {
                    setReviewFilter(reviewFilter === "unattempted" ? "all" : "unattempted");
                    setShowAnswers(true);
                  }
                }}
                style={{ 
                  cursor: (data?.showAnswerReview !== false) ? "pointer" : "default"
                }}
              >
                <div className="rm-metric-icon icon-blue" style={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(100, 116, 139, 0.15)", color: "#64748B" }}><HelpCircle size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{Math.max(0, total - (correct + incorrect))}</h4>
                  <p>Unattempted Answers</p>
                </div>
              </div>
              <div className="rm-metric">
                <div className="rm-metric-icon icon-orange" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Timer size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{formatTime(timeTakenSecs)}</h4>
                  <p>Time Taken</p>
                </div>
              </div>
            </div>



            {/* Action Buttons */}
          <div className="rm-modal-actions">
            <button 
              className="btn-review"
              onClick={() => setShowAnswers(true)}
            >
              Review Answers
            </button>
            <button 
              className="btn-dashboard"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
          </div>

            {/* Social Share */}
            <div className="rm-social-share">
              <p>Share Your Result</p>
              {shareId ? (
                <div className="rm-social-icons">
                  <button title="Share on WhatsApp" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`I scored ${score}/${total} on the ${examTitle} test! Can you beat my score? Check it out here: ${window.location.origin}/share-result/${shareId}`)}`, '_blank')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#25D366" }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                  </button>
                  <button title="Share on Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/share-result/${shareId}`)}`, '_blank')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#1877F2" }}>
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </button>
                  <button title="Share on Instagram" onClick={() => { navigator.clipboard.writeText(`I scored ${score}/${total} on the ${examTitle} test! Link: ${window.location.origin}/share-result/${shareId}`); alert("Result text and link copied! Open Instagram to share it."); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#E1306C" }}>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </button>
                  <button title="Copy Link" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share-result/${shareId}`); alert("Link copied to clipboard!"); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6B7280" }}>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Generating share link...</p>
              )}
            </div>
          </div>

          {/* Right Column: Feedback Card */}
          {isExam && (effectiveResultId || data?._id || data?.result?._id || data?.resultId) && (
            <div style={{ flex: 0.8, minWidth: "300px", maxWidth: "440px", width: "100%" }}>
              <FeedbackForm
                resultId={data?.result?._id || data?._id || data?.resultId || (resultId && resultId.length === 24 ? resultId : null)}
                initialReaction={data?.reaction}
                initialComment={data?.feedbackMessage}
              />
            </div>
          )}
        </div>
      </div>
    )}

      {showAnswers && (
        <div className="result-review-container">
          
          <div className="result-details" style={{ marginTop: "0" }}>
            {/* Fixed Back Button in Absolute Top Left Corner */}
            <button 
              className="rm-back-btn"
              onClick={() => setShowAnswers(false)}
              style={{
                position: "fixed",
                top: "20px",
                left: "20px",
                zIndex: 110,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                backgroundColor: isDark ? "#1E1B2E" : "#ffffff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                border: "1px solid var(--border-color, #d1d5db)",
                color: isDark ? "#ffffff" : "#000000",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Back to Summary"
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>

            {/* Sticky Title */}
            <div style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px 60px",
              backgroundColor: isDark ? "rgba(29, 27, 40, 0.92)" : "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(12px)",
              borderRadius: "16px",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #E2E8F0",
              boxShadow: isDark ? "0 4px 20px rgba(0, 0, 0, 0.35)" : "0 4px 20px rgba(0, 0, 0, 0.05)",
              marginBottom: "24px"
            }}>
              <h2 style={{ fontSize: "clamp(18px, 4vw, 24px)", margin: 0, lineHeight: "1.3", color: isDark ? "#FFFFFF" : "#1E293B", textAlign: "center", fontWeight: "700" }}>Answer Review - {examTitle}</h2>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                {reviewFilter !== "all" && (
                  <span 
                    onClick={() => setReviewFilter("all")}
                    style={{ 
                      fontSize: "13px", 
                      backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)", 
                      color: "var(--primary)", 
                      padding: "4px 12px", 
                      borderRadius: "20px", 
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    Showing {reviewFilter === "correct" ? "Correct" : reviewFilter === "incorrect" ? "Incorrect" : "Unattempted"} Answers ✕
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => {
                    const allIndices = {};
                    questions.forEach((_, idx) => { allIndices[idx] = true; });
                    setExpandedQuestions(allIndices);
                  }}
                  style={{ background: "transparent", border: "none", color: "var(--primary)", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
                >
                  Expand All
                </button>
                <span style={{ color: "var(--text-muted, #94A3B8)" }}>|</span>
                <button 
                  onClick={() => setExpandedQuestions({})}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted, #94A3B8)", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
                >
                  Collapse All
                </button>
              </div>
            </div>

            <div className="review-list">
              {questions
                .map((q, idx) => ({ ...q, originalIndex: idx }))
                .filter((q) => {
                  const userAns = userAnswers[q.originalIndex];
                  const isUnanswered = userAns === undefined || userAns === null || userAns === "";
                  const isCorrect = q.correctAnswer ? userAns === q.correctAnswer : false;

                  if (reviewFilter === "correct") return !isUnanswered && isCorrect;
                  if (reviewFilter === "incorrect") return !isUnanswered && !isCorrect;
                  if (reviewFilter === "unattempted") return isUnanswered;
                  return true;
                })
                .slice(0, visibleCount)
                .map((q) => {
                  const index = q.originalIndex;
                  const userAns = userAnswers[index];
                  const isUnanswered = userAns === undefined || userAns === null || userAns === "";
                  const isCorrect = q.correctAnswer ? userAns === q.correctAnswer : false;

                // Color configuration based on answer status
                let statusColor = "#64748B"; // grey
                let cardBorder = "1px solid var(--border-color)";
                let cardShadow = "0 4px 12px rgba(0,0,0,0.02)";

                if (!isUnanswered) {
                  if (isCorrect) {
                    statusColor = "#22C55E"; // green
                    cardBorder = "1.5px solid #22C55E";
                    cardShadow = isDark ? "0 4px 18px rgba(34, 197, 94, 0.2)" : "0 4px 18px rgba(34, 197, 94, 0.15)";
                  } else {
                    statusColor = "#EF4444"; // red
                    cardBorder = "1.5px solid #EF4444";
                    cardShadow = isDark ? "0 4px 18px rgba(239, 68, 68, 0.2)" : "0 4px 18px rgba(239, 68, 68, 0.15)";
                  }
                }

                const isExpanded = !!expandedQuestions[index];

                return (
                  <div 
                    className="review-item" 
                    key={q.id || index}
                    style={{ 
                      borderRadius: "12px", 
                      marginBottom: "16px", 
                      border: cardBorder, 
                      boxShadow: cardShadow,
                      overflow: "hidden",
                      transition: "all 0.25s ease"
                    }}
                  >
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => {
                        setExpandedQuestions(prev => ({
                          ...prev,
                          [index]: !prev[index]
                        }));
                      }}
                      style={{ 
                        padding: "16px 20px", 
                        cursor: "pointer", 
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.02)" : "#FAFAFC", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center",
                        userSelect: "none"
                      }}
                    >
                      <div className="review-question" style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: 1, textAlign: "left" }}>
                        {/* Rounded Status Badge for Q number */}
                        <span className="q-number" style={{ 
                          minWidth: "30px", 
                          height: "30px",
                          borderRadius: "8px",
                          backgroundColor: statusColor,
                          color: "#FFFFFF",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "800",
                          fontSize: "13px",
                          flexShrink: 0
                        }}>
                          {index + 1}
                        </span>
                        
                        <div style={{ flex: 1, paddingTop: "4px" }}>
                          <div style={{ fontWeight: "600", color: isDark ? "#F1F5F9" : "#1E293B", fontSize: "15px", lineHeight: "1.5" }}><MathRenderer text={q.english || q.questionEnglish} /></div>
                          {(q.hindi || q.questionHindi) && <div style={{ fontWeight: "500", color: isDark ? "#CBD5E1" : "#475569", marginTop: "4px", fontSize: "14px", lineHeight: "1.5" }}><MathRenderer text={q.hindi || q.questionHindi} /></div>}
                        </div>
                      </div>
                      
                      {/* Accordion Indicator Chevron */}
                      <span style={{ 
                        marginLeft: "16px", 
                        color: "var(--text-secondary)", 
                        fontSize: "18px", 
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", 
                        transition: "transform 0.2s ease",
                        fontWeight: "bold"
                      }}>
                        ❯
                      </span>
                    </div>

                    {/* Expandable options and explanation container */}
                    <div style={{ 
                      height: isExpanded ? "auto" : "0px",
                      overflow: "hidden",
                      transition: "all 0.25s ease-in-out",
                      borderTop: isExpanded ? "1px solid var(--border-color)" : "none",
                      backgroundColor: isDark ? "#171622" : "#ffffff",
                      padding: isExpanded ? "20px" : "0px 20px"
                    }}>
                      <div className="review-options" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {q.options && q.options.length > 0 ? q.options.map((opt, optIdx) => {
                          const isSelected = userAns === opt;
                          const showCorrect = data?.showCorrectAnswers !== false;
                          const isCorrectOpt = showCorrect && q.correctAnswer === opt;
                          
                          let optBg = isDark ? "#2A273A" : "#ffffff";
                          let optBorder = isDark ? "1px solid #3F3C53" : "1px solid #E2E8F0";
                          let optColor = isDark ? "#F8FAFC" : "#1E293B";
                          let optWeight = "500";
                          
                          if (isCorrectOpt) {
                            optBg = isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7";
                            optBorder = "1px solid #22c55e";
                            optColor = isDark ? "#4ade80" : "#166534";
                            optWeight = "600";
                          } else if (isSelected) {
                            if (showCorrect) {
                              optBg = isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2";
                              optBorder = "1px solid #ef4444";
                              optColor = isDark ? "#f87171" : "#991b1b";
                            } else {
                              optBg = isDark ? "color-mix(in srgb, var(--primary) 15%, transparent)" : "#f3e8ff";
                              optBorder = "1px solid var(--primary)";
                              optColor = isDark ? "var(--primary)" : "var(--primary)";
                              optWeight = "600";
                            }
                          }
                          
                          return (
                            <div key={optIdx} style={{ 
                              padding: "12px 16px", 
                              borderRadius: "10px", 
                              backgroundColor: optBg, 
                              border: optBorder,
                              color: optColor,
                              fontWeight: optWeight,
                              fontSize: "14.5px",
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              transition: "all 0.2s"
                            }}>
                              <span style={{ 
                                width: "26px", 
                                height: "26px", 
                                borderRadius: "50%", 
                                backgroundColor: isCorrectOpt ? "#22c55e" : (isSelected ? (showCorrect ? "#ef4444" : "var(--primary)") : (isDark ? "#3F3C53" : "#F1F5F9")),
                                color: isCorrectOpt || isSelected ? "#fff" : (isDark ? "#E2E8F0" : "#64748B"),
                                border: isCorrectOpt || isSelected ? "none" : (isDark ? "1px solid #4F4C63" : "1px solid #E2E8F0"),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "13px",
                                fontWeight: "700",
                                flexShrink: 0
                              }}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span style={{ lineHeight: "1.4" }}><MathRenderer text={opt} /></span>
                            </div>
                          );
                        }) : (
                          <div style={{ color: "#94A3B8", fontStyle: "italic", fontSize: "14px" }}>No options available.</div>
                        )}
                      </div>

                      <div className="review-answers" style={{ marginTop: "16px" }}>
                        <div style={{ marginBottom: "16px", fontSize: "14.5px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                          <strong style={{ color: "#1E293B" }}>Your Answer: </strong>
                          <span
                            className={
                              data?.showCorrectAnswers === false
                                ? ""
                                : userAns === undefined || userAns === null
                                ? "unanswered-text"
                                : isCorrect === false
                                ? "wrong-text"
                                : "correct-text"
                            }
                            style={{ 
                              padding: "4px 10px", 
                              borderRadius: "6px", 
                              backgroundColor: data?.showCorrectAnswers === false ? "#F1F5F9" : undefined, 
                              color: data?.showCorrectAnswers === false ? "#475569" : undefined, 
                              border: "1px solid #E2E8F0", 
                              fontWeight: "600", 
                              whiteSpace: "nowrap" 
                            }}
                          >
                            {(userAns !== undefined && userAns !== null) ? <MathRenderer text={userAns} /> : "Not Answered"}
                          </span>
                        </div>
                        
                        {data?.showExplanations !== false && q.explanation && (
                          <div style={{ marginTop: "20px", padding: "16px 20px", backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC", borderLeft: "4px solid var(--primary)", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", textAlign: "left" }}>
                            <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: isDark ? "var(--primary)" : "var(--primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>💡</span> Explanation
                            </p>
                            <p style={{ margin: 0, fontSize: "14.5px", color: isDark ? "#E2E8F0" : "#475569", lineHeight: "1.6" }}><MathRenderer text={q.explanation} /></p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="result-actions" style={{ marginTop: "40px", paddingBottom: "60px", display: "flex", justifyContent: "center", gap: "16px" }}>
              <button 
                className="rm-btn-outline" 
                style={{ padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
                onClick={() => setShowAnswers(false)}
              >
                ← Back to Summary
              </button>
              <button 
                className="rm-btn-solid" 
                style={{ padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
            
             {/* Floating scroll action button */}
             <div style={{
               position: "fixed",
               bottom: "30px",
               right: "30px",
               zIndex: 1000
             }}>
               <button
                 onClick={() => {
                   if (isScrolledDown) {
                     window.scrollTo({ top: 0, behavior: "smooth" });
                   } else {
                     window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
                   }
                 }}
                 style={{
                   width: "48px",
                   height: "48px",
                   borderRadius: "50%",
                   backgroundColor: isDark ? "var(--primary)" : "#ffffff",
                   color: isDark ? "#ffffff" : "var(--primary)",
                   border: "2px solid var(--border-color, #d1d5db)",
                   boxShadow: "0 4px 16px rgba(110, 63, 243, 0.3)",
                   display: "flex",
                   alignItems: "center",
                   justifyContent: "center",
                   cursor: "pointer",
                   transition: "all 0.25s ease",
                   fontSize: "16px",
                   fontWeight: "bold"
                 }}
                 title={isScrolledDown ? "Scroll to Top" : "Scroll to Bottom"}
                 onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
                 onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
               >
                 {isScrolledDown ? "▲" : "▼"}
               </button>
             </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

export default Result;