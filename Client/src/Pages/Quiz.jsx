import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import { usePreview } from "../context/PreviewContext";
import { Sun, Moon, X } from "lucide-react";
import Logo from "../components/Logo";
import "../css/Quiz.css";

function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme } = useTheme();
  const { previewMode } = usePreview();

  const { quizId: paramQuizId } = useParams();
  const [searchParams] = useSearchParams();

  // 🪝 1. GRABS THE EXACT EXAM CLICKED IN 'StartTest.jsx'
  const isPreview = searchParams.get("preview") === "true" && localStorage.getItem("role") === "admin";
  const quizId = location.state?.quizId || paramQuizId;

  const [examName, setExamName] = useState(location.state?.examName || location.state?.subject || "Live Examination");
  const [quizTitle, setQuizTitle] = useState(location.state?.quizTitle || "Mock Test");
  const [examSubject, setExamSubject] = useState(location.state?.subject || localStorage.getItem("lastExamTaken") || "General Studies");
  const [initialDurationMinutes, setInitialDurationMinutes] = useState(location.state?.duration || 30);

  // Immediately cache subject so Result page always knows what exam was taken
  // (survives backend redirects, page refreshes, etc.)
  if (location.state?.subject) {
    localStorage.setItem("lastExamTaken", location.state.subject);
  }

  // Grab logged-in user's name for the Profile Card
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || "Registered Aspirant";

  const [questions, setQuestions] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [userAnswers, setUserAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(initialDurationMinutes * 60);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [visitedQuestions, setVisitedQuestions] = useState([0]);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showPaletteMobile, setShowPaletteMobile] = useState(false);

  const [palettePage, setPalettePage] = useState(0);
  const itemsPerPage = 20; // 20 questions per page (4 rows of 5)
  
  useEffect(() => {
    const correctPage = Math.floor(currentQuestion / itemsPerPage);
    setPalettePage(correctPage);
  }, [currentQuestion, itemsPerPage]);

  // ── Anti-Cheat State ──
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [violations, setViolations] = useState(0);
  const MAX_VIOLATIONS = 3;

  // ── Enter fullscreen on quiz load ──
  useEffect(() => {
    if (isPreview) return; // Disable anti-cheat for preview

    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();

    return () => {
      // Exit fullscreen when leaving the quiz page
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, []);

  // ── Fullscreen change listener ──
  useEffect(() => {
    if (isPreview) return;
    
    const handleFSChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && !pageLoading) {
        // Student exited fullscreen
        setViolations((v) => {
          const newV = v + 1;
          if (newV >= MAX_VIOLATIONS) {
            setWarningMsg(`⚠️ Final Warning! Auto-submitting due to ${MAX_VIOLATIONS} violations.`);
            setShowWarning(true);
            setTimeout(() => submitQuiz(true), 3000);
          } else {
            setWarningMsg(`⚠️ You exited fullscreen! Violation ${newV}/${MAX_VIOLATIONS}. Return to fullscreen to continue.`);
            setShowWarning(true);
          }
          return newV;
        });
      }
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    document.addEventListener("webkitfullscreenchange", handleFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
      document.removeEventListener("webkitfullscreenchange", handleFSChange);
    };
  }, [pageLoading]);

  // ── Tab switch / window blur listener ──
  useEffect(() => {
    if (isPreview) return;

    const handleVisibility = () => {
      if (document.hidden && !pageLoading) {
        setViolations((v) => {
          const newV = v + 1;
          if (newV >= MAX_VIOLATIONS) {
            setWarningMsg(`⚠️ Final Warning! Auto-submitting due to ${MAX_VIOLATIONS} tab-switch violations.`);
            setShowWarning(true);
            setTimeout(() => submitQuiz(true), 3000);
          } else {
            setWarningMsg(`⚠️ Tab switching detected! Violation ${newV}/${MAX_VIOLATIONS}. Stay on this tab!`);
            setShowWarning(true);
          }
          return newV;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [pageLoading]);

  // ── Block right-click & keyboard shortcuts ──
  useEffect(() => {
    const blockRight = (e) => e.preventDefault();
    const blockKeys = (e) => {
      // Block: F11, Alt+Tab, Ctrl+T, Ctrl+N, Ctrl+W, Ctrl+Tab, PrintScreen
      if (
        e.key === "F11" ||
        (e.altKey && e.key === "Tab") ||
        (e.ctrlKey && ["t", "n", "w"].includes(e.key.toLowerCase())) ||
        e.key === "PrintScreen"
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", blockRight);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", blockRight);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  const reEnterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    setShowWarning(false);
  };

  // 🌐 MONGO FETCH (Untouched - Your exact logic)
  useEffect(() => {
    // Allow re-entry for reattempts, removing the sessionStorage block

    const fetchLiveExam = async () => {
      if (!quizId) {
        alert("No Exam ID detected! Redirecting back.");
        navigate("/start-test");
        return;
      }
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const rawQuestions = response.data.questions || [];
        const mappedQuestions = rawQuestions.map((q, idx) => {
          let correctText = q.correctAnswer || "";
          if (["A", "B", "C", "D"].includes(correctText) && Array.isArray(q.options)) {
            const idxMap = { "A": 0, "B": 1, "C": 2, "D": 3 };
            correctText = q.options[idxMap[correctText]] || correctText;
          }

          return {
            id: idx + 1,
            _id: q._id,
            english: q.questionEnglish || q.english || "",
            hindi: q.questionHindi || q.hindi || "",
            options: q.options || [],
            correctAnswer: correctText,
            explanation: q.explanation || q.solution || ""
          };
        });

        if (!location.state) {
            setExamName(response.data.examName || response.data.subject || "Live Examination");
            setQuizTitle(response.data.title || "Mock Test");
            setExamSubject(response.data.subject || "General Studies");
            setInitialDurationMinutes(response.data.duration || 30);
            setTimeLeft((response.data.duration || 30) * 60);
        }

        setQuestions(mappedQuestions);
        setUserAnswers(new Array(mappedQuestions.length).fill(undefined));
      } catch (err) {
        console.error(err);
        if (err.response && err.response.status === 403) {
          alert("You have already submitted this exam! You cannot take it again.");
          navigate("/dashboard/results", { replace: true });
        } else {
          alert("Could not load exam packet from MongoDB.");
          navigate("/start-test");
        }
      } finally {
        setPageLoading(false);
      }
    };
    fetchLiveExam();
  }, [quizId, navigate]);

  // Timer Tick
  useEffect(() => {
    if (pageLoading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [pageLoading]);

  // Visited Tracker
  useEffect(() => {
    setVisitedQuestions((prev) => prev.includes(currentQuestion) ? prev : [...prev, currentQuestion]);
  }, [currentQuestion]);

  const markForReview = () => {
    setReviewQuestions((prev) => prev.includes(currentQuestion) ? prev : [...prev, currentQuestion]);
  };

  const clearResponse = () => {
    setUserAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestion] = undefined;
      return updated;
    });
  };

  const submitQuiz = async (forced = false) => {
    if (!forced && !window.confirm("Are you sure you want to submit your exam?")) return;
    // Exit fullscreen cleanly before navigating
    if (document.exitFullscreen && document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }

    const timeTaken = (initialDurationMinutes * 60) - timeLeft;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswers, questions }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const serverData = await res.json();
      

      
      navigate("/result", { 
        replace: true,
        state: { 
          ...serverData,
          quizId,
          title: examSubject,
          subject: examSubject,
          questions,
          userAnswers,
          isPreview,
          timeTaken,
          duration: initialDurationMinutes
        } 
      });
    } catch (err) {
      // Offline fallback
      let correct = 0, incorrect = 0, unanswered = 0;
      questions.forEach((q, i) => {
        const ans = userAnswers[i];
        if (ans === undefined || ans === null) unanswered++;
        else if (ans === q.correctAnswer) correct++;
        else incorrect++;
      });
      const total = questions.length;
      

      
      navigate("/result", {
        replace: true,
        state: {
          quizId,
          title: examSubject,
          subject: examSubject,
          score: correct,
          total,
          correct,
          incorrect,
          unanswered,
          percentage: total ? ((correct / total) * 100).toFixed(2) : "0.00",
          questions,
          userAnswers,
          isPreview,
          timeTaken,
          duration: initialDurationMinutes
        }
      });
    }
  };


  // Helper to turn 1800 seconds into "00 : 30 : 00"
  const formatTimeBox = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, "0")} : ${m.toString().padStart(2, "0")} : ${s.toString().padStart(2, "0")}`;
  };

  // Helper to decide button colors in the Palette
  const getPaletteStatus = (idx) => {
    if (reviewQuestions.includes(idx)) return "review";
    if (userAnswers[idx] !== undefined) return "answered";
    if (visitedQuestions.includes(idx)) return "visited";
    return "unvisited";
  };

  if (pageLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", padding: "40px 60px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.04)", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px", animation: "spin 1s infinite" }}>⏳</div>
          <h3 style={{ margin: 0, color: "var(--text-primary)", fontFamily: "sans-serif" }}>Decrypting Exam Packet...</h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>Establishing secure handshake with MongoDB</p>
        </div>
      </div>
    );
  }

  const current = questions[currentQuestion];

  return (
    <div style={{ backgroundColor: "var(--bg-page)", minHeight: "100vh", paddingBottom: "60px", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif", userSelect: "none" }}>

      {/* ════ ANTI-CHEAT WARNING OVERLAY ════ */}
      {showWarning && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(10,9,20,0.92)",
          backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#1c1b2e", border: "2px solid #DC2626",
            borderRadius: "24px", padding: "48px 52px",
            textAlign: "center", maxWidth: "460px", width: "90%",
            boxShadow: "0 0 60px rgba(220,38,38,0.25)"
          }}>
            <div style={{ fontSize: "52px", marginBottom: "16px" }}>🚨</div>
            <h2 style={{ color: "#F87171", margin: "0 0 12px", fontSize: "22px", fontWeight: "800" }}>
              Integrity Violation!
            </h2>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "15px", margin: "0 0 8px", lineHeight: 1.6 }}>
              {warningMsg}
            </p>
            <p style={{ color: "#F4C842", fontSize: "13px", fontWeight: "600", margin: "0 0 28px" }}>
              Violations: {violations} / {MAX_VIOLATIONS}
            </p>
            {violations < MAX_VIOLATIONS && (
              <button
                onClick={reEnterFullscreen}
                style={{
                  background: "linear-gradient(135deg,#3730A3,#6E3FF3)",
                  color: "#fff", border: "none", borderRadius: "12px",
                  padding: "14px 36px", fontSize: "15px", fontWeight: "700",
                  cursor: "pointer", width: "auto"
                }}
              >
                🔒 Return to Fullscreen
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── TOP HEADER ─── */}
      <header className="quiz-header-wrapper">
        <div className="quiz-header-inner">

          {/* LEFT: Brand only */}
          <div style={{ display: "flex", alignItems: "center", zIndex: 1 }}>
            <Logo />
          </div>

          {/* CENTER: Dynamic Exam Name */}
          <div style={{ fontWeight: "700", fontSize: "15px", color: "#DC2626", letterSpacing: "0.5px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#DC2626", display: "inline-block", animation: "pulse 1.5s infinite" }}></span>
            {examName}
          </div>

          {/* RIGHT: Theme toggle + Instructions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
              <div className="pill-track-icons"><span><Sun size={14}/></span><span><Moon size={14}/></span></div>
              <div className="pill-thumb-slider"></div>
            </div>
            <button 
              onClick={() => setShowInstructionsModal(true)}
              style={{ background: "#1E1B4B", color: "#FFF", border: "none", borderRadius: "10px", padding: "10px 20px", fontWeight: "600", fontSize: "13px", cursor: "pointer" }}
            >
              Instructions
            </button>
          </div>
        </div>
      </header>

      {/* Centering wrapper */}
      <div className="quiz-main-wrapper">

        {/* ─── 2. DYNAMIC EXAM TITLE PILL ─── */}
        <div style={{ marginBottom: "20px" }}>
          <span style={{ backgroundColor: "#1E1B4B", color: "#FFF", fontWeight: "600", fontSize: "13px", padding: "8px 18px", borderRadius: "10px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span>⊞</span> {examSubject}
          </span>
        </div>

        {/* ─── 3. VIEWPORT GRID ─── */}
        <div className="quiz-main-grid">
        
        {/* LEFT: QUESTION & OPTIONS */}
        <div className="quiz-question-card">
          
          <div>
            {/* Question Number Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <span style={{ backgroundColor: "var(--bg-page)", color: "var(--text-secondary)", border: "1px solid var(--border-color)", fontWeight: "700", fontSize: "13px", padding: "8px 16px", borderRadius: "20px" }}>
                Question No. {currentQuestion + 1} of {questions.length}
              </span>
            </div>

            {/* English Question */}
            {current?.english && (
              <div style={{ marginBottom: current?.hindi ? "20px" : "30px", textAlign: "left" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "700", lineHeight: "1.5", margin: 0, color: "var(--text-primary)", textAlign: "left" }}>{current.english}</h2>
              </div>
            )}

            {/* Hindi Question */}
            {current?.hindi && (
              <div style={{ marginBottom: "30px", textAlign: "left" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "600", lineHeight: "1.5", color: "var(--text-secondary)", margin: 0, textAlign: "left" }}>{current.hindi}</h2>
              </div>
            )}

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "40px" }}>
              {current?.options.map((option) => {
                const isSelected = userAnswers[currentQuestion] === option;
                return (
                  <div 
                    key={option}
                    onClick={() => {
                      setUserAnswers((prev) => {
                        const updated = [...prev];
                        updated[currentQuestion] = option;
                        return updated;
                      });
                    }}
                    className={`option-card ${isSelected ? "selected-opt-card" : ""}`}
                    style={{ 
                      border: isSelected ? "2.5px solid var(--violet)" : "1.5px solid var(--border-color)", 
                      backgroundColor: isSelected ? "var(--option-hover)" : "var(--bg-card)", 
                      borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer",
                      fontWeight: "600", fontSize: "15px", transition: "all 0.15s ease",
                      color: "var(--text-primary)"
                    }}
                  >
                    <div style={{ 
                      width: "20px", height: "20px", borderRadius: "50%", 
                      border: isSelected ? "6px solid var(--violet)" : "2.5px solid var(--text-muted)", backgroundColor: "var(--bg-card)" 
                    }} />
                    <span>{option}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="quiz-action-bar">
            <div className="quiz-action-left">
              <button onClick={markForReview} style={{ background: "#F4C842", color: "#FFFFFF", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: "700", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease" }}>
                Mark Review
              </button>
              <button onClick={clearResponse} style={{ background: "#C51414", color: "#FFFFFF", border: "none", borderRadius: "10px", padding: "12px 24px", fontWeight: "700", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease" }}>
                Clear Response
              </button>
            </div>

            <div className="quiz-action-right">
              <button 
                onClick={() => setCurrentQuestion(Math.max(currentQuestion - 1, 0))} 
                disabled={currentQuestion === 0}
                style={{ 
                  background: "#F1EFFA",
                  color: "#2D1B69", 
                  border: "1.5px solid #D8D3F0", 
                  borderRadius: "10px", 
                  padding: "12px 24px", 
                  fontWeight: "700", 
                  fontSize: "13px", 
                  cursor: currentQuestion === 0 ? "not-allowed" : "pointer",
                  opacity: currentQuestion === 0 ? 0.5 : 1,
                  transition: "all 0.15s ease"
                }}
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentQuestion(Math.min(currentQuestion + 1, questions.length - 1))} 
                disabled={currentQuestion === questions.length - 1}
                style={{ 
                  background: "#3730A3",
                  color: "#FFFFFF", 
                  border: "none", 
                  borderRadius: "10px", 
                  padding: "12px 32px", 
                  fontWeight: "700", 
                  fontSize: "13px", 
                  cursor: currentQuestion === questions.length - 1 ? "not-allowed" : "pointer",
                  opacity: currentQuestion === questions.length - 1 ? 0.5 : 1,
                  transition: "all 0.15s ease"
                }}
              >
                Next
              </button>
              {currentQuestion === questions.length - 1 && (
                <button 
                  onClick={submitQuiz} 
                  disabled={previewMode}
                  title={previewMode ? "Submitting disabled in Preview Mode" : ""}
                  style={{ background: previewMode ? "#6b7280" : "#16A34A", color: "#FFFFFF", border: "none", borderRadius: "10px", padding: "12px 28px", fontWeight: "700", fontSize: "13px", cursor: previewMode ? "not-allowed" : "pointer", transition: "all 0.15s ease" }}
                >
                  {previewMode ? "Preview Mode" : "Submit Test"}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: LIVE TELEMETRY */}
        <div className="quiz-right-panel">
          
          {/* 1. Candidate Info */}
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "16px", border: "1.5px solid var(--border-color)", padding: "20px", boxShadow: "var(--card-shadow)" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "16px", display: "block" }}>
              👤 Aspirant Identity
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "50%", backgroundColor: "rgba(110, 63, 243, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold", color: "var(--violet)" }}>
                {candidateName.charAt(0)}
              </div>
              <div style={{ overflow: "hidden" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 2px 0", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{candidateName}</h3>
                <span style={{ fontSize: "12px", color: "var(--violet)", fontWeight: "600", display: "block", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {examSubject}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Clock */}
          <div className="quiz-timer-container" style={{ backgroundColor: "var(--bg-card)", borderRadius: "16px", border: "1.5px solid var(--border-color)", padding: "20px", boxShadow: "var(--card-shadow)" }}>
            <span className="quiz-timer-title" style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px", display: "block", textAlign: "center" }}>
              ⏱️ Time Remaining
            </span>
            <div className="quiz-timer-clock" style={{ textAlign: "center", padding: "8px 0 16px 0", borderBottom: "1.5px solid var(--border-color)", marginBottom: "16px" }}>
              <div className="quiz-timer-time" style={{ fontSize: "34px", fontWeight: "800", color: timeLeft < 300 ? "#DC2626" : "var(--violet)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "1px" }}>
                {formatTimeBox(timeLeft)}
              </div>
              <div className="quiz-timer-labels" style={{ display: "flex", justifyContent: "center", gap: "34px", color: "var(--text-muted)", fontSize: "10px", fontWeight: "700", marginTop: "4px" }}>
                <span>HRS</span>
                <span>MINS</span>
                <span>SECS</span>
              </div>
            </div>

            {/* Legend */}
            <div className="quiz-timer-legend" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981" }} /> Answered</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#C51414" }} /> Not Answered</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--border-color)" }} /> Not Visited</div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#F4C842" }} /> Review</div>
            </div>
            
            {/* Mobile View Palette Button */}
            <button 
              className="mobile-palette-toggle"
              onClick={() => setShowPaletteMobile(!showPaletteMobile)}
              style={{ marginTop: "16px", width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid var(--border-color)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)", fontWeight: "600", cursor: "pointer" }}
            >
              {showPaletteMobile ? "Hide Question Palette" : "View Question Palette"}
            </button>
          </div>

          {/* 3. Real-Time Palette Grid */}
          {showPaletteMobile && <div className="palette-overlay" onClick={() => setShowPaletteMobile(false)}></div>}
          <div className={`question-palette ${!showPaletteMobile ? "mobile-hidden" : ""}`} style={{ backgroundColor: "var(--bg-card)", borderRadius: "16px", border: "1.5px solid var(--border-color)", padding: "20px", boxShadow: "var(--card-shadow)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                🎨 Navigation Palette
              </span>
              <button 
                className="mobile-palette-close" 
                onClick={() => setShowPaletteMobile(false)}
                style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", paddingRight: "4px" }}>
              {questions.slice(palettePage * itemsPerPage, palettePage * itemsPerPage + itemsPerPage).map((_, i) => {
                const idx = palettePage * itemsPerPage + i;
                const status = getPaletteStatus(idx);
                const isCurrent = currentQuestion === idx;

                let bg = "var(--bg-card)";
                let col = "var(--text-secondary)";
                let bdr = "1.5px solid var(--border-color)";

                if (status === "answered") { bg = "#10B981"; col = "#FFF"; bdr = "none"; }
                else if (status === "review") { bg = "#F4C842"; col = "#FFF"; bdr = "none"; }
                else if (status === "visited") { bg = "#C51414"; col = "#FFF"; bdr = "none"; }

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    style={{
                      height: "36px", borderRadius: "8px", backgroundColor: bg, color: col, 
                      border: isCurrent ? "2px solid var(--text-primary)" : bdr,
                      fontWeight: "700", fontSize: "13px", cursor: "pointer",
                      boxShadow: isCurrent ? "0 0 0 2px rgba(110, 63, 243, 0.2)" : "none"
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            {(() => {
              const totalPages = Math.ceil(questions.length / itemsPerPage);
              if (totalPages <= 1) return null;

              let startPage = Math.max(0, palettePage - 2);
              let endPage = Math.min(totalPages - 1, startPage + 4);
              
              if (endPage - startPage < 4) {
                startPage = Math.max(0, endPage - 4);
              }

              const visiblePages = [];
              for (let i = startPage; i <= endPage; i++) {
                visiblePages.push(i);
              }

              return (
                <div style={{ display: "flex", justifyContent: "center", gap: "6px", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1.5px solid var(--border-color)", flexWrap: "wrap" }}>
                  {/* Prev Button */}
                  <button 
                    onClick={() => setPalettePage(Math.max(0, palettePage - 1))}
                    disabled={palettePage === 0}
                    style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", cursor: palettePage === 0 ? "not-allowed" : "pointer", opacity: palettePage === 0 ? 0.5 : 1, fontWeight: "bold", color: "var(--text-secondary)", transition: "all 0.2s" }}
                  >
                    {"<"}
                  </button>

                  {/* Page Numbers */}
                  {visiblePages.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPalettePage(p)}
                      style={{
                        width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s",
                        backgroundColor: palettePage === p ? "#3B82F6" : "var(--bg-card)",
                        border: palettePage === p ? "none" : "1.5px solid var(--border-color)",
                        color: palettePage === p ? "#fff" : "var(--text-primary)",
                        fontWeight: "700",
                        fontSize: "13px",
                        boxShadow: palettePage === p ? "0 4px 10px rgba(59, 130, 246, 0.3)" : "none"
                      }}
                    >
                      {p + 1}
                    </button>
                  ))}

                  {/* Next Button */}
                  <button 
                    onClick={() => setPalettePage(Math.min(totalPages - 1, palettePage + 1))}
                    disabled={palettePage === totalPages - 1}
                    style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", cursor: palettePage === totalPages - 1 ? "not-allowed" : "pointer", opacity: palettePage === totalPages - 1 ? 0.5 : 1, fontWeight: "bold", color: "var(--text-secondary)", transition: "all 0.2s" }}
                  >
                    {">"}
                  </button>
                </div>
              );
            })()}
          </div>

        </div>

      </div>
    </div>
    
    {/* ── INSTRUCTIONS MODAL ── */}
    {showInstructionsModal && (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)", width: "600px", maxWidth: "90%", borderRadius: "16px", padding: "32px", position: "relative", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: "1.5px solid var(--border-color)" }}>
          <button 
            onClick={() => setShowInstructionsModal(false)}
            style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={24} />
          </button>
          <h2 style={{ margin: "0 0 24px 0", fontSize: "22px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>Test Instructions</h2>
          
          <div style={{ maxHeight: "60vh", overflowY: "auto", fontSize: "14px", lineHeight: "1.6" }}>
            <p><strong>1. General Guidelines:</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li>Ensure you have a stable internet connection.</li>
              <li>Do not refresh the page or press the back button during the test.</li>
              <li>The test will automatically submit when the timer runs out.</li>
            </ul>
            
            <p><strong>2. Navigation:</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li>Use the <strong>Next</strong> and <strong>Previous</strong> buttons to move between questions.</li>
              <li>Use the <strong>Question Palette</strong> on the right to jump to specific questions.</li>
            </ul>
            
            <p><strong>3. Marking System:</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "16px" }}>
              <li><span style={{ color: "#16A34A", fontWeight: "bold" }}>Answered:</span> Questions you have saved an answer for.</li>
              <li><span style={{ color: "#DC2626", fontWeight: "bold" }}>Not Answered:</span> Questions you visited but didn't answer.</li>
              <li><span style={{ color: "#F59E0B", fontWeight: "bold" }}>Review:</span> Questions you marked to look at again later.</li>
              <li><span style={{ color: "var(--text-muted)", fontWeight: "bold" }}>Not Visited:</span> Questions you haven't seen yet.</li>
            </ul>
            
            <p><strong>4. Anti-Cheat:</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "0" }}>
              <li>Exiting full-screen mode will trigger a warning.</li>
              <li>Multiple violations may lead to automatic submission of your test.</li>
            </ul>
          </div>
          
          <div style={{ marginTop: "24px", textAlign: "right" }}>
            <button 
              onClick={() => setShowInstructionsModal(false)}
              style={{ background: "#6E3FF3", color: "white", padding: "10px 24px", borderRadius: "8px", fontWeight: "600", border: "none", cursor: "pointer" }}
            >
              Understood, Resume Test
            </button>
          </div>
        </div>
      </div>
    )}

  </div>
);
}

export default Quiz;