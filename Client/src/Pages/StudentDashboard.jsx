import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import "../css/StudentDashboard.css";

function StudentDashboard() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || storedUser.name || "Student";
  const candidateEmail = storedUser.email || "";
  const initials = candidateName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes?published=true`);
        setQuizzes(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  // Group quizzes by their exam/title prefix (e.g. "BPSC", "SSC", etc.)
  const examGroups = quizzes.reduce((acc, quiz) => {
    // Use quiz.examGroup or fall back to quiz.title as the exam name
    const examName = quiz.examGroup || quiz.exam || quiz.title || "General";
    if (!acc[examName]) acc[examName] = [];
    acc[examName].push(quiz);
    return acc;
  }, {});

  const examNames = Object.keys(examGroups);

  // If no examGroup field, treat each quiz as its own exam group by title
  // and subjects are different quizzes under same title
  const handleSubjectClick = (quiz) => {
    navigate("/start-test", {
      state: {
        preSelectedQuizId: quiz._id,
        subject: quiz.subject,
        quizId: quiz._id,
        quizTitle: quiz.title,
        duration: quiz.duration,
      },
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const examIcons = {
    BPSC: "🎯",
    SSC: "📋",
    UPSC: "🏛️",
    CTET: "📚",
    TET: "🏫",
    NDA: "⚔️",
    default: "📝",
  };

  const subjectColors = [
    { bg: "#EDE9FE", text: "#5B21B6", dot: "#7C3AED" },
    { bg: "#DCFCE7", text: "#166534", dot: "#16A34A" },
    { bg: "#FEF9C3", text: "#854D0E", dot: "#D97706" },
    { bg: "#FFE4E6", text: "#9F1239", dot: "#E11D48" },
    { bg: "#DBEAFE", text: "#1E40AF", dot: "#2563EB" },
    { bg: "#FCE7F3", text: "#9D174D", dot: "#DB2777" },
    { bg: "#F0FDF4", text: "#14532D", dot: "#15803D" },
  ];

  return (
    <div className="sd-page">
      {/* ── TOP NAVBAR ── */}
      <nav className="sd-navbar">
        <div className="sd-nav-brand">
          <div className="sd-brand-icon">🎓</div>
          <span className="sd-brand-name">Teaching Pariksha</span>
        </div>

        <div className="sd-nav-right">
          <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
            <div className="pill-track-icons"><span>☀️</span><span>🌙</span></div>
            <div className="pill-thumb-slider"></div>
          </div>
          <div className="sd-user-badge">
            <div className="sd-avatar">{initials}</div>
            <div className="sd-user-info">
              <span className="sd-user-name">{candidateName}</span>
              <span className="sd-user-email">{candidateEmail}</span>
            </div>
          </div>
          <button className="sd-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ── HERO WELCOME ── */}
      <div className="sd-hero">
        <div className="sd-hero-content">
          <p className="sd-hero-greeting">👋 Welcome back,</p>
          <h1 className="sd-hero-name">{candidateName}</h1>
          <p className="sd-hero-sub">Select your exam below and start practicing today</p>
        </div>
        <div className="sd-hero-graphic">
          <div className="sd-hero-circle c1"></div>
          <div className="sd-hero-circle c2"></div>
          <div className="sd-hero-circle c3"></div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="sd-content">

        {loading ? (
          <div className="sd-loading">
            <div className="sd-spinner"></div>
            <p>Loading available exams...</p>
          </div>
        ) : examNames.length === 0 ? (
          <div className="sd-empty">
            <div className="sd-empty-icon">📭</div>
            <h3>No Exams Published Yet</h3>
            <p>Check back soon. The admin will publish exams shortly.</p>
          </div>
        ) : (
          <>
            {/* ── EXAM CARDS ROW ── */}
            <div className="sd-section-title">Available Examinations</div>
            <div className="sd-exam-grid">
              {examNames.map((examName) => {
                const icon = examIcons[examName.toUpperCase()] || examIcons.default;
                const count = examGroups[examName].length;
                const isSelected = selectedExam === examName;
                return (
                  <div
                    key={examName}
                    className={`sd-exam-card ${isSelected ? "sd-exam-active" : ""}`}
                    onClick={() => setSelectedExam(isSelected ? null : examName)}
                  >
                    <div className="sd-exam-icon">{icon}</div>
                    <div className="sd-exam-info">
                      <div className="sd-exam-name">{examName}</div>
                      <div className="sd-exam-count">{count} Subject{count !== 1 ? "s" : ""} Available</div>
                    </div>
                    <div className={`sd-exam-arrow ${isSelected ? "sd-arrow-up" : ""}`}>▼</div>
                  </div>
                );
              })}
            </div>

            {/* ── SUBJECTS PANEL (shows when exam is selected) ── */}
            {selectedExam && (
              <div className="sd-subjects-panel">
                <div className="sd-subjects-header">
                  <span className="sd-subjects-title">
                    {examIcons[selectedExam.toUpperCase()] || "📝"} {selectedExam} — Choose a Subject
                  </span>
                  <span className="sd-subjects-count">
                    {examGroups[selectedExam].length} available
                  </span>
                </div>
                <div className="sd-subjects-grid">
                  {examGroups[selectedExam].map((quiz, idx) => {
                    const color = subjectColors[idx % subjectColors.length];
                    return (
                      <div
                        key={quiz._id}
                        className="sd-subject-card"
                        onClick={() => handleSubjectClick(quiz)}
                      >
                        <div className="sd-subject-top">
                          <div
                            className="sd-subject-dot"
                            style={{ backgroundColor: color.dot }}
                          ></div>
                          <span
                            className="sd-subject-badge"
                            style={{ backgroundColor: color.bg, color: color.text }}
                          >
                            {quiz.subject}
                          </span>
                        </div>
                        <div className="sd-subject-name">{quiz.title}</div>
                        <div className="sd-subject-meta">
                          <span>⏱ {quiz.duration} mins</span>
                          <span>❓ {quiz.questionCount || quiz.questions?.length || "—"} Qs</span>
                        </div>
                        <button className="sd-start-btn">
                          Start Test →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;
