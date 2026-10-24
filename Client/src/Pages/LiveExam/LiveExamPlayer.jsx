import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  Clock,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Send,
  HelpCircle,
  Wifi,
  WifiOff,
  Star,
  ThumbsUp,
  MessageSquare,
  Home,
  ShieldAlert,
  Palette,
  Grid,
  X,
} from "lucide-react";
import Logo from "../../components/Logo";
import MathRenderer from "../../components/MathRenderer";
import ThemeToggle from "../../components/ThemeToggle";
import { useTheme } from "../../context/ThemeContext";
import "../../css/LiveExam.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

function LiveExamPlayer() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme, toggleThemePicker } = useTheme();

  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

  // Loading & State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examData, setExamData] = useState(null);

  // Normalized Questions & Sections
  const [questions, setQuestions] = useState([]);
  const [sections, setSections] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Answers & Reviews State
  const [userAnswers, setUserAnswers] = useState([]);
  const [reviewQuestions, setReviewQuestions] = useState([]);

  // Server-Authoritative Timer
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Disconnection & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState("synced"); // "synced" | "saving" | "error"
  const saveTimeoutRef = useRef(null);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  // Post-Submission & Feedback State
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackReaction, setFeedbackReaction] = useState("excellent");
  const [feedbackComments, setFeedbackComments] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Fetch Play Data
  useEffect(() => {
    const fetchPlayData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(`${API_BASE}/api/live-exams/attempts/${attemptId}/play-data`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;
        setExamData(data);

        // If attempt is already submitted or auto-submitted, show completion state immediately
        if (data.status === "submitted" || data.status === "auto_submitted") {
          setSubmissionComplete(true);
          setLoading(false);
          return;
        }

        // Normalize Questions (Single or Multi-Section)
        let flatQuestions = [];
        let extractedSections = [];

        if (data.quiz) {
          if (Array.isArray(data.quiz.sections) && data.quiz.sections.length > 0) {
            extractedSections = data.quiz.sections.map((sec) => ({
              _id: sec._id,
              title: sec.title,
              count: Array.isArray(sec.questions) ? sec.questions.length : 0,
            }));
            setSections(extractedSections);
            if (extractedSections.length > 0) {
              setActiveSectionId(extractedSections[0]._id);
            }

            data.quiz.sections.forEach((sec) => {
              if (Array.isArray(sec.questions)) {
                sec.questions.forEach((q) => {
                  flatQuestions.push({
                    ...q,
                    sectionId: sec._id,
                    sectionTitle: sec.title,
                    marksPerQuestion: sec.marksPerQuestion ?? data.quiz.marksPerQuestion ?? 1,
                    negativeMarking: sec.negativeMarking ?? data.quiz.negativeMarking ?? 0,
                  });
                });
              }
            });
          } else if (Array.isArray(data.quiz.questions)) {
            flatQuestions = data.quiz.questions.map((q) => ({
              ...q,
              marksPerQuestion: data.quiz.marksPerQuestion ?? 1,
              negativeMarking: data.quiz.negativeMarking ?? 0,
            }));
          }
        }

        setQuestions(flatQuestions);

        // Restore Saved Answers
        const restoredAnswers = new Array(flatQuestions.length).fill(null);
        if (data.savedAnswers) {
          if (Array.isArray(data.savedAnswers)) {
            data.savedAnswers.forEach((ans, idx) => {
              if (idx < flatQuestions.length && ans !== undefined) {
                restoredAnswers[idx] = ans;
              }
            });
          } else if (typeof data.savedAnswers === "object") {
            Object.keys(data.savedAnswers).forEach((key) => {
              const idx = parseInt(key, 10);
              if (!isNaN(idx) && idx < flatQuestions.length) {
                restoredAnswers[idx] = data.savedAnswers[key];
              }
            });
          }
        }
        setUserAnswers(restoredAnswers);

        // Restore Current Question
        if (data.currentQuestionIndex && data.currentQuestionIndex < flatQuestions.length) {
          setCurrentQuestionIndex(data.currentQuestionIndex);
        }

        // Initialize Timer to Server Deadline
        if (data.serverDeadline) {
          const deadlineTime = new Date(data.serverDeadline).getTime();
          const serverTime = data.serverTime ? new Date(data.serverTime).getTime() : Date.now();
          const diffSeconds = Math.floor((deadlineTime - serverTime) / 1000);
          if (diffSeconds > 0) {
            setRemainingSeconds(diffSeconds);
          } else if (data.duration && data.status === "in_progress") {
            // If server deadline is zero or in the past but attempt is actively in progress, fallback to exam duration in seconds
            setRemainingSeconds(data.duration * 60);
          } else {
            setRemainingSeconds(0);
          }
        } else if (data.duration) {
          setRemainingSeconds(data.duration * 60);
        }
      } catch (err) {
        console.error("Failed to load play data:", err);
        setError(err.response?.data?.message || "Failed to load examination player.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayData();
  }, [attemptId, token]);

  // Network Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Save Progress to Backend (Debounced)
  const saveProgress = useCallback(
    async (answersToSave, qIdx) => {
      if (!attemptId || !token || submissionComplete) return;

      try {
        setSyncStatus("saving");
        const answeredCount = answersToSave.filter((a) => a !== null && a !== undefined && a !== "").length;

        await axios.post(
          `${API_BASE}/api/live-exams/attempts/${attemptId}/save-progress`,
          {
            savedAnswers: answersToSave,
            currentQuestionIndex: qIdx,
            answeredCount,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSyncStatus("synced");
      } catch (err) {
        console.warn("Auto-save sync warning:", err);
        setSyncStatus("error");
      }
    },
    [attemptId, token, submissionComplete]
  );

  // Trigger Save with Debounce
  const scheduleSave = (newAnswers, qIdx) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress(newAnswers, qIdx);
    }, 1200);
  };

  // Periodic Heartbeat every 20 seconds
  useEffect(() => {
    if (submissionComplete || loading || error) return;

    const heartbeatInterval = setInterval(() => {
      saveProgress(userAnswers, currentQuestionIndex);
    }, 20000);

    return () => clearInterval(heartbeatInterval);
  }, [userAnswers, currentQuestionIndex, submissionComplete, loading, error, saveProgress]);

  // Tab switch warning
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !submissionComplete) {
        setTabWarning(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [submissionComplete]);

  // Fullscreen Helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // Submit Handler (Manual or Auto-Submit)
  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (isSubmitting || submissionComplete) return;

    try {
      setIsSubmitting(true);
      setShowConfirmSubmit(false);

      const res = await axios.post(
        `${API_BASE}/api/live-exams/attempts/${attemptId}/submit`,
        {
          userAnswers,
          isAutoSubmit,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubmissionResult(res.data);
      setSubmissionComplete(true);

      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert(err.response?.data?.message || "Failed to submit exam. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timer Tick (Server-Authoritative Countdown)
  useEffect(() => {
    if (submissionComplete || loading || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true); // Auto-submit on deadline!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, submissionComplete, loading]);

  // Format Time Helper
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Navigation & Option Selection
  const handleSelectOption = (optionText) => {
    setUserAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = optionText;
      scheduleSave(next, currentQuestionIndex);
      return next;
    });
  };

  const handleClearResponse = () => {
    setUserAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = null;
      scheduleSave(next, currentQuestionIndex);
      return next;
    });
  };

  const toggleReview = () => {
    setReviewQuestions((prev) =>
      prev.includes(currentQuestionIndex)
        ? prev.filter((idx) => idx !== currentQuestionIndex)
        : [...prev, currentQuestionIndex]
    );
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      if (questions[nextIdx]?.sectionId) {
        setActiveSectionId(questions[nextIdx].sectionId);
      }
      scheduleSave(userAnswers, nextIdx);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      const prevIdx = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIdx);
      if (questions[prevIdx]?.sectionId) {
        setActiveSectionId(questions[prevIdx].sectionId);
      }
      scheduleSave(userAnswers, prevIdx);
    }
  };

  const handleJumpToQuestion = (idx) => {
    if (idx >= 0 && idx < questions.length) {
      setCurrentQuestionIndex(idx);
      setShowMobilePalette(false);
      if (questions[idx]?.sectionId) {
        setActiveSectionId(questions[idx].sectionId);
      }
      scheduleSave(userAnswers, idx);
    }
  };

  // Feedback Submission
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      await axios.post(
        `${API_BASE}/api/live-exams/attempts/${attemptId}/feedback`,
        {
          rating: feedbackRating,
          reaction: feedbackReaction,
          comments: feedbackComments,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Feedback submit error:", err);
      alert("Failed to submit feedback. Thank you anyway!");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="live-exam-page" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="loader" style={{ width: "42px", height: "42px", border: "4px solid var(--primary, #7c3aed)", borderBottomColor: "transparent", borderRadius: "50%", animation: "rotation 1s linear infinite" }}></div>
        <p style={{ marginTop: "16px", color: "var(--text-secondary)", fontSize: "14px" }}>Synchronizing examination questions...</p>
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="live-exam-page">
        <header className="live-exam-header"><Logo /></header>
        <div className="live-lobby-container" style={{ textAlign: "center", marginTop: "60px" }}>
          <div className="live-card">
            <ShieldAlert size={48} color="#ef4444" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Unable to Enter Examination</h2>
            <p style={{ color: "var(--text-secondary)", margin: "12px 0 24px" }}>{error || "Access denied or session expired."}</p>
            <Link to="/dashboard" className="live-btn-primary">Return to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  // POST-SUBMISSION & FEEDBACK VIEW
  if (submissionComplete) {
    const isImmediate = submissionResult?.showResultNow;

    return (
      <div className="live-exam-page">
        <header className="live-exam-header">
          <Logo />
          <ThemeToggle />
        </header>

        <div className="live-lobby-container" style={{ maxWidth: "680px", marginTop: "40px" }}>
          <div className="live-card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <CheckCircle2 size={56} color="#10b981" style={{ margin: "0 auto 16px" }} />
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
              Exam Submitted Successfully!
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", maxWidth: "480px", margin: "0 auto 28px" }}>
              {isImmediate
                ? "Your responses have been evaluated and your detailed analysis is ready."
                : "Your responses have been recorded on the server. Examination results will be published once released by the administrator."}
            </p>

            {isImmediate && submissionResult?.resultId && (
              <div style={{ marginBottom: "32px" }}>
                <Link
                  to={`/result/${submissionResult.resultId}`}
                  className="live-btn-primary"
                  style={{ padding: "12px 28px" }}
                >
                  View Performance & Solutions <ChevronRight size={18} />
                </Link>
              </div>
            )}

            {/* Candidate Feedback Section */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "28px", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <MessageSquare size={18} color="var(--primary)" />
                <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>Candidate Feedback</h3>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "0 0 20px" }}>
                How was your experience with this live examination?
              </p>

              {feedbackSubmitted ? (
                <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "12px", padding: "16px", textAlign: "center", color: "#10b981", fontWeight: "600" }}>
                  ✓ Thank you! Your feedback has been submitted.
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback}>
                  {/* Emoji Reactions */}
                  <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                    {[
                      { id: "excellent", label: "🤩 Excellent" },
                      { id: "good", label: "😊 Good" },
                      { id: "average", label: "😐 Average" },
                      { id: "challenging", label: "😕 Challenging" },
                      { id: "difficult", label: "😫 Hard" },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setFeedbackReaction(item.id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: feedbackReaction === item.id ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                          background: feedbackReaction === item.id ? "rgba(124, 58, 237, 0.15)" : "var(--bg-card)",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Rating Stars */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={22}
                        onClick={() => setFeedbackRating(star)}
                        fill={star <= feedbackRating ? "#f59e0b" : "none"}
                        color={star <= feedbackRating ? "#f59e0b" : "var(--text-secondary)"}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </div>

                  {/* Comment Box */}
                  <textarea
                    rows="3"
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    placeholder="Share any feedback regarding question quality, interface, or technical performance..."
                    style={{
                      width: "100%",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "rgba(255, 255, 255, 0.03)",
                      color: "var(--text-primary)",
                      padding: "12px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                      marginBottom: "16px",
                      resize: "vertical",
                    }}
                  />

                  <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="live-btn-primary"
                      style={{ padding: "10px 20px", fontSize: "13px" }}
                    >
                      {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div style={{ marginTop: "32px", textAlign: "center" }}>
              <Link to="/dashboard" className="live-btn-secondary" style={{ display: "inline-flex" }}>
                <Home size={16} /> Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Statistics for palette
  const current = questions[currentQuestionIndex];
  const totalAnswered = userAnswers.filter((a) => a !== null && a !== undefined && a !== "").length;
  const totalReview = reviewQuestions.length;
  const isTimerDanger = remainingSeconds < 300; // Under 5 minutes

  return (
    <div className="live-player-root">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="live-offline-banner">
          <WifiOff size={16} />
          You are currently offline. Answers are saved locally on your device and will sync as soon as you reconnect.
        </div>
      )}

      {/* Tab switch warning toast */}
      {tabWarning && (
        <div style={{ background: "#f59e0b", color: "#000", padding: "6px 16px", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>⚠️ Warning: Tab switching is monitored during live examinations. Please stay focused on the test.</span>
          <button onClick={() => setTabWarning(false)} style={{ background: "transparent", border: "none", fontWeight: "900", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Top Bar */}
      <header className="live-player-topbar">
        <div className="live-player-brand-wrap" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Logo />
          <div className="live-player-exam-title" title={examData.title}>
            {examData.title}
          </div>
        </div>

        {/* Server Clock Timer */}
        <div className={`live-player-timer ${isTimerDanger ? "danger" : ""}`}>
          <Clock size={18} color={isTimerDanger ? "#ef4444" : "var(--primary)"} />
          <span>{formatTime(remainingSeconds)}</span>
        </div>

        {/* Action Controls */}
        <div className="live-player-topbar-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Mobile Question Palette Toggle */}
          <button
            type="button"
            onClick={() => setShowMobilePalette((prev) => !prev)}
            className="live-btn-secondary live-mobile-palette-btn"
            title="Question Palette"
            aria-label="Toggle Question Palette"
          >
            {showMobilePalette ? <X size={16} /> : <Grid size={16} />}
          </button>

          {/* Light / Dark Mode Toggle */}
          <div className="live-player-theme-toggle">
            <ThemeToggle />
          </div>

          {/* Theme & Color Customizer Button */}
          <button
            type="button"
            onClick={toggleThemePicker}
            className="live-btn-secondary live-btn-theme-picker"
            style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Themes & Colors"
            aria-label="Customize Theme"
          >
            <Palette size={16} />
            <span className="live-btn-theme-text" style={{ fontSize: "12px" }}>Theme</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="live-btn-secondary live-btn-fullscreen"
            style={{ padding: "6px 12px", fontSize: "12px" }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Section Tabs (if Multi-Section) */}
      {sections.length > 1 && (
        <div style={{ display: "flex", gap: "8px", padding: "8px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)", overflowX: "auto" }}>
          {sections.map((sec) => (
            <button
              key={sec._id}
              onClick={() => {
                setActiveSectionId(sec._id);
                const firstSecIdx = questions.findIndex((q) => q.sectionId === sec._id);
                if (firstSecIdx !== -1) setCurrentQuestionIndex(firstSecIdx);
              }}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "700",
                cursor: "pointer",
                border: activeSectionId === sec._id ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
                background: activeSectionId === sec._id ? "rgba(124, 58, 237, 0.15)" : "transparent",
                color: activeSectionId === sec._id ? "var(--primary)" : "var(--text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {sec.title} ({sec.count})
            </button>
          ))}
        </div>
      )}

      {/* Main Examination Player Body */}
      <div className="live-player-body">
        {/* Left: Question & Answers Canvas */}
        <div className="live-player-main">
          {current ? (
            <div style={{ maxWidth: "860px", margin: "0 auto", width: "100%" }}>
              {/* Question Header & Pills */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ background: "rgba(124, 58, 237, 0.15)", color: "var(--primary)", border: "1px solid var(--primary)", fontWeight: "700", fontSize: "13px", padding: "4px 14px", borderRadius: "16px" }}>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  {current.sectionTitle && (
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
                      Section: {current.sectionTitle}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "4px 10px", borderRadius: "6px" }}>
                    +{current.marksPerQuestion || 1}
                  </span>
                  {current.negativeMarking > 0 && (
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "4px 10px", borderRadius: "6px" }}>
                      -{current.negativeMarking}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={toggleReview}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: reviewQuestions.includes(currentQuestionIndex) ? "#8b5cf6" : "var(--text-secondary)" }}
                    title={reviewQuestions.includes(currentQuestionIndex) ? "Marked for review" : "Mark for review"}
                  >
                    <Bookmark size={22} fill={reviewQuestions.includes(currentQuestionIndex) ? "#8b5cf6" : "none"} />
                  </button>
                </div>
              </div>

              {/* English Question */}
              {current.english && (
                <div style={{ fontSize: "17px", fontWeight: "700", lineHeight: "1.6", color: "var(--text-primary)", marginBottom: current.hindi ? "14px" : "28px" }}>
                  <MathRenderer text={current.english} />
                </div>
              )}

              {/* Hindi Question */}
              {current.hindi && (
                <div style={{ fontSize: "16px", fontWeight: "600", lineHeight: "1.6", color: "var(--text-secondary)", marginBottom: "28px" }}>
                  <MathRenderer text={current.hindi} />
                </div>
              )}

              {/* Interactive Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "36px" }}>
                {Array.isArray(current.options) &&
                  current.options.map((option, optIdx) => {
                    const isSelected = userAnswers[currentQuestionIndex] === option;
                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(option)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          padding: "14px 18px",
                          borderRadius: "12px",
                          border: isSelected ? "2px solid var(--primary, #7c3aed)" : "1.5px solid var(--border-color)",
                          background: isSelected ? "rgba(124, 58, 237, 0.12)" : "var(--bg-card)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            border: isSelected ? "6px solid var(--primary, #7c3aed)" : "2px solid var(--text-secondary)",
                            background: "transparent",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ fontSize: "15px", fontWeight: isSelected ? "700" : "500", color: "var(--text-primary)" }}>
                          <MathRenderer text={option} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <p>No questions available.</p>
          )}
        </div>

        {/* Right: Question Palette Sidebar */}
        <aside className={`live-player-sidebar ${showMobilePalette ? "mobile-open" : ""}`}>
          {/* Mobile Header with close button */}
          <div
            className="mobile-palette-header"
            style={{
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <span style={{ fontWeight: "700", fontSize: "14px" }}>Question Palette</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
                aria-label="Close palette"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Candidate Card */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--primary)", color: "var(--primary-foreground)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "15px" }}>
              {(storedUser.fullName || "C").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>{storedUser.fullName || "Candidate"}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                {syncStatus === "saving" ? "Syncing..." : isOnline ? "Synced" : "Offline (Local)"}
              </div>
            </div>
          </div>

          {/* Palette Legend */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#10b981", display: "inline-block" }}></span>
              Answered ({totalAnswered})
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "var(--bg-card)", border: "1px solid var(--border-color)", display: "inline-block" }}></span>
              Unanswered ({questions.length - totalAnswered})
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#8b5cf6", display: "inline-block" }}></span>
              Review ({totalReview})
            </div>
          </div>

          {/* Question Number Buttons Grid */}
          <div className="palette-grid">
            {questions.map((q, idx) => {
              const isAns = userAnswers[idx] !== null && userAnswers[idx] !== undefined && userAnswers[idx] !== "";
              const isRev = reviewQuestions.includes(idx);
              const isCur = currentQuestionIndex === idx;

              let btnClass = "unanswered";
              if (isRev && isAns) btnClass = "review-answered";
              else if (isRev) btnClass = "review";
              else if (isAns) btnClass = "answered";

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleJumpToQuestion(idx)}
                  className={`palette-btn ${btnClass} ${isCur ? "current" : ""}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Bottom Action Bar */}
      <footer className="live-player-bottombar">
        <div className="live-player-bottombar-left">
          <button
            type="button"
            onClick={handleClearResponse}
            disabled={userAnswers[currentQuestionIndex] === null}
            className="live-btn-secondary"
          >
            <span className="btn-full-text">Clear Response</span>
            <span className="btn-short-text">Clear</span>
          </button>

          <button
            type="button"
            onClick={toggleReview}
            className="live-btn-secondary"
            style={{ color: reviewQuestions.includes(currentQuestionIndex) ? "#8b5cf6" : "var(--text-primary)" }}
          >
            <Bookmark size={15} />
            <span className="btn-full-text">{reviewQuestions.includes(currentQuestionIndex) ? "Marked for Review" : "Mark for Review"}</span>
            <span className="btn-short-text">{reviewQuestions.includes(currentQuestionIndex) ? "Marked" : "Review"}</span>
          </button>
        </div>

        <div className="live-player-bottombar-right">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
            className="live-btn-secondary"
          >
            <ChevronLeft size={16} />
            <span className="btn-full-text">Previous</span>
            <span className="btn-short-text">Prev</span>
          </button>

          {currentQuestionIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="live-btn-primary"
            >
              <span className="btn-full-text">Save & Next</span>
              <span className="btn-short-text">Next</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmSubmit(true)}
              className="live-btn-primary"
              style={{
                background: "#ef4444",
                borderColor: "#ef4444",
                boxShadow: "0 2px 10px rgba(239, 68, 68, 0.4)",
              }}
            >
              <span className="btn-full-text">Submit Exam</span>
              <span className="btn-short-text">Submit</span>
              <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </footer>

      {/* Submission Confirmation Modal */}
      {showConfirmSubmit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div className="live-card" style={{ maxWidth: "460px", width: "100%", margin: 0 }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Confirm Examination Submission</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              Are you sure you want to finish and submit your examination? Once submitted, answers cannot be modified.
            </p>

            {/* Submission Summary Table */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "14px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Total Questions:</span>
                <span style={{ fontWeight: "700" }}>{questions.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Answered:</span>
                <span style={{ fontWeight: "700", color: "#10b981" }}>{totalAnswered}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Unanswered:</span>
                <span style={{ fontWeight: "700", color: "#ef4444" }}>{questions.length - totalAnswered}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Marked for Review:</span>
                <span style={{ fontWeight: "700", color: "#8b5cf6" }}>{totalReview}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="live-btn-secondary"
                style={{ padding: "10px 18px", fontSize: "13px" }}
              >
                Keep Testing
              </button>
              <button
                type="button"
                onClick={() => handleSubmitExam(false)}
                disabled={isSubmitting}
                className="live-btn-primary"
                style={{ padding: "10px 22px", fontSize: "13px", background: "#ef4444" }}
              >
                {isSubmitting ? "Submitting..." : "Yes, Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveExamPlayer;
