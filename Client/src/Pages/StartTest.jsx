import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import Logo from "../components/Logo";
import "../css/StartTest.css";

function StartTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme } = useTheme();

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Countdown state ──
  const [countdown, setCountdown] = useState(null); // null = not started
  const timerRef = useRef(null);

  // If navigated from StudentDashboard, a quiz was already chosen — lock it
  const preSelectedQuizId = location.state?.preSelectedQuizId || null;

  // 🌐 Fetch all live quizzes from MongoDB
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes?published=true`);
        const liveQuizzes = response.data;
        setQuizzes(liveQuizzes);

        const preId = location.state?.preSelectedQuizId;
        const preSelected = preId
          ? liveQuizzes.find((q) => q._id === preId)
          : liveQuizzes[0];

        if (preSelected) setSelectedQuiz(preSelected);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  // Countdown tick effect
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      navigateToQuiz();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          // Navigate immediately to avoid rendering '0' for a whole second
          setTimeout(() => navigateToQuiz(), 0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleDropdownChange = (e) => {
    const foundQuiz = quizzes.find((q) => q._id === e.target.value);
    setSelectedQuiz(foundQuiz);
  };

  const handleStart = () => {
    if (!selectedQuiz) return alert("Please select a quiz first!");
    
    // Request Fullscreen immediately upon user interaction
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Could not enable fullscreen mode:", err);
      });
    }
    
    // Log the start action
    if (localStorage.getItem("role") !== "admin") {
      axios.post(`${import.meta.env.VITE_API_URL}/api/audit-logs`, {
        action: "START_QUIZ",
        target: selectedQuiz.title,
        module: "Quiz"
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      }).catch(err => console.error("Audit log failed", err));
    }

    setCountdown(5); // Start the 5-second countdown
  };

  const handleCancel = () => {
    clearTimeout(timerRef.current);
    setCountdown(null); // Reset — stay on page
    
    // Exit fullscreen if they cancel
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  const navigateToQuiz = () => {
    navigate("/quiz", {
      state: {
        subject: selectedQuiz.subject,
        quizId: selectedQuiz._id,
        quizTitle: selectedQuiz.title,
        examName: selectedQuiz.examName,
        duration: selectedQuiz.duration,
      },
    });
  };

  // Logged-in user info
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const userName  = storedUser.fullName || storedUser.name || "Student";
  const userEmail = storedUser.email || "";

  return (
    <div className="start-page">

      {/* ── Theme Toggle ── */}
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
        <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
          <div className="pill-track-icons"><span><Sun size={14} /></span><span><Moon size={14} /></span></div>
          <div className="pill-thumb-slider"></div>
        </div>
      </div>

      {/* ── Background Blobs ── */}
      <div className="top-left"></div>
      <div className="bottom-right"></div>
      <div className="big-circle"></div>
      <div className="small-circle"></div>

      {/* ════════ 5-SECOND COUNTDOWN OVERLAY ════════ */}
      {countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-card">
            <div className="countdown-ring">
              {/* Animated SVG circle */}
              <svg className="countdown-svg" viewBox="0 0 100 100">
                <circle className="countdown-track" cx="50" cy="50" r="44" />
                <circle
                  className="countdown-progress"
                  cx="50"
                  cy="50"
                  r="44"
                  style={{
                    strokeDashoffset: `${276.46 - (countdown / 5) * 276.46}`,
                  }}
                />
              </svg>
              <span className="countdown-number">{countdown}</span>
            </div>

            <h3 className="countdown-title">Starting in {countdown}s…</h3>
            <p className="countdown-subtitle">
              {selectedQuiz?.title} — {selectedQuiz?.subject}
            </p>

            <button className="countdown-cancel-btn" onClick={handleCancel}>
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════ MAIN CARD ════════ */}
      <div className="start-card">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <Logo size="large" />
        </div>

        <h2>Test Instructions</h2>

        <div className="instruction-table">
          <div className="row">
            <div className="label">Name</div>
            <div className="value">{userName}</div>
          </div>

          <div className="row">
            <div className="label">Email</div>
            <div className="value">{userEmail}</div>
          </div>

          {/* ── SUBJECT: locked if from dashboard, dropdown if direct ── */}
          <div className="row">
            <div className="label">Select Subject</div>
            <div className="value">
              {preSelectedQuizId ? (
                <div className="subject-locked">
                  {loading
                    ? "Loading..."
                    : selectedQuiz
                    ? `${selectedQuiz.title} (${selectedQuiz.subject})`
                    : "Subject not found"}
                </div>
              ) : (
                <select
                  className="subject-dropdown"
                  value={selectedQuiz ? selectedQuiz._id : ""}
                  onChange={handleDropdownChange}
                  disabled={loading || quizzes.length === 0}
                >
                  {loading ? (
                    <option value="">Loading live exams...</option>
                  ) : quizzes.length === 0 ? (
                    <option value="">No published exams found</option>
                  ) : (
                    quizzes.map((quiz) => (
                      <option key={quiz._id} value={quiz._id}>
                        {quiz.title} ({quiz.subject})
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>

          {/* ── DURATION ── */}
          <div className="row">
            <div className="label">Duration</div>
            <div className="value">
              {selectedQuiz ? `${selectedQuiz.duration} Minutes` : "60 Minutes"}
            </div>
          </div>

          <div className="row">
            <div className="label">Do's</div>
            <div className="value">
              ✔ Read questions carefully <br />
              ✔ Manage your time properly <br />
              ✔ Submit before time ends
            </div>
          </div>

          <div className="row">
            <div className="label">Don'ts</div>
            <div className="value">
              ❌ Don't refresh the page <br />
              ❌ Don't switch tabs <br />
              ❌ Don't use external help
            </div>
          </div>
        </div>

        <button
          className="start-btn"
          onClick={handleStart}
          disabled={loading || !selectedQuiz || countdown !== null}
        >
          {loading ? "Connecting..." : "Start Test"}
        </button>
      </div>
    </div>
  );
}

export default StartTest;