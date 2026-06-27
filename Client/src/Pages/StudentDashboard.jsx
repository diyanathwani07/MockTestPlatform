import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { ClipboardList, Clock, Edit3, BookOpen, TrendingUp, Target, Calendar, ChevronRight } from "lucide-react";
import "../css/StudentDashboard.css";

function StudentDashboard() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || storedUser.name || "Student";
  const candidateEmail = storedUser.email || "";
  const initials = candidateName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!user.id) return;
        
        // Fetch results for the user
        const resultsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id}`);
        setResults(resultsRes.data);
        
        // Fetch published quizzes to find upcoming mocks
        const quizzesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes?published=true`);
        setQuizzes(quizzesRes.data);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Compute Stats
  const mocksAttempted = results.length;
  const averageScore = results.length > 0 
    ? Math.round(results.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / results.length) 
    : 0;
  
  const bestResult = results.length > 0 
    ? [...results].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0] 
    : null;
  const bestScore = bestResult ? Math.round(bestResult.percentage || 0) : 0;
  const bestScoreExam = bestResult ? (bestResult.quizTitle || bestResult.subject || "N/A") : "No attempts yet";

  const upcomingQuizzes = quizzes.filter(q => q.status === "Scheduled" && new Date(q.scheduledDate) > new Date());
  const upcomingCount = upcomingQuizzes.length;
  const recentUpcoming = [...upcomingQuizzes].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).slice(0, 3);

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
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Dashboard" />

      {/* ── HERO WELCOME ── */}
      <div className="sd-hero">
        <div className="sd-hero-content">
          <p className="sd-hero-greeting">👋 Welcome back,</p>
          <h1 className="sd-hero-name">{candidateName}</h1>
          <p className="sd-hero-subtitle">Keep practicing, keep improving!</p>
        </div>
        <div className="sd-hero-graphic">
          <div className="sd-hero-illustration">
            <ClipboardList className="sd-ill-icon clipboard" />
            <Clock className="sd-ill-icon clock" />
            <Edit3 className="sd-ill-icon pencil" />
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="sd-content">
        
        {/* STATS ROW */}
        <div className="sd-stats-grid">
          <div className="sd-stat-card">
            <div className="sd-stat-icon-wrapper purple">
              <BookOpen size={24} />
            </div>
            <div className="sd-stat-info">
              <h3>{mocksAttempted}</h3>
              <p>Mocks Attempted</p>
            </div>
          </div>
          
          <div className="sd-stat-card">
            <div className="sd-stat-icon-wrapper green">
              <TrendingUp size={24} />
            </div>
            <div className="sd-stat-info">
              <h3>{averageScore}%</h3>
              <p>Average Score</p>
            </div>
          </div>
          
          <div className="sd-stat-card">
            <div className="sd-stat-icon-wrapper orange">
              <Target size={24} />
            </div>
            <div className="sd-stat-info">
              <h3>{bestScore}</h3>
              <p>Best Score</p>
              <span className="sd-stat-meta orange-text">{bestScoreExam}</span>
            </div>
          </div>
          
          <div className="sd-stat-card clickable" onClick={() => navigate("/dashboard/exams")}>
            <div className="sd-stat-icon-wrapper blue">
              <Calendar size={24} />
            </div>
            <div className="sd-stat-info">
              <h3>{upcomingCount}</h3>
              <p>Upcoming Mocks</p>
              <span className="sd-stat-meta blue-text">View schedule →</span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="sd-bottom-grid">
          
          {/* LEFT: PERFORMANCE CHART */}
          <div className="sd-performance-section">
            <div className="sd-section-header">
              <h2>Performance Overview</h2>
              <select className="sd-period-select">
                <option>All Time</option>
                <option>This Week</option>
              </select>
            </div>
            
            <div className="sd-chart-container">
              {results.length === 0 ? (
                <div className="sd-empty-chart">
                  <TrendingUp size={32} color="var(--border-input)" />
                  <p>Attempt some mocks to see your performance trend.</p>
                </div>
              ) : (
                <div className="sd-css-chart">
                  {results.slice(-7).map((r, i) => (
                    <div key={i} className="sd-chart-bar-wrapper">
                      <div className="sd-chart-bar" style={{ height: `${r.percentage || 0}%` }}>
                        <div className="sd-chart-tooltip">{r.percentage}%</div>
                      </div>
                      <span className="sd-chart-label">Mock {i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: UPCOMING MOCKS */}
          <div className="sd-upcoming-section">
            <div className="sd-section-header">
              <h2>Upcoming Mocks</h2>
              <span className="sd-view-all" onClick={() => navigate("/dashboard/exams")}>View All</span>
            </div>
            
            <div className="sd-upcoming-list">
              {recentUpcoming.length === 0 ? (
                <div className="sd-empty-upcoming">
                  <Calendar size={32} color="var(--border-input)" />
                  <p>No scheduled mocks right now.</p>
                </div>
              ) : (
                recentUpcoming.map(quiz => {
                  const d = new Date(quiz.scheduledDate);
                  return (
                    <div key={quiz._id} className="sd-upcoming-item" onClick={() => navigate("/dashboard/exams")}>
                      <div className="sd-upcoming-date">
                        <span className="month">{d.toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
                        <span className="day">{d.getDate()}</span>
                      </div>
                      <div className="sd-upcoming-info">
                        <h4>{quiz.title}</h4>
                        <p>
                          <Clock size={12} /> {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <span className="dot">•</span>
                          {quiz.duration} min
                        </p>
                      </div>
                      <ChevronRight size={16} className="sd-chevron" />
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
    </div>
  );
}

export default StudentDashboard;
