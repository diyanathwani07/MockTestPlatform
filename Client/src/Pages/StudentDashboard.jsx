import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { ClipboardList, Clock, Edit3, BookOpen, TrendingUp, Target, Calendar, ChevronRight } from "lucide-react";
import "../css/StudentDashboard.css";

const ScoreTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="sd-empty-chart">
        <TrendingUp size={32} color="var(--border-input)" />
        <p>Attempt some mocks to see your performance trend.</p>
      </div>
    );
  }

  // Data processing: take the 6 most recent tests and reverse so oldest is on the left
  const chartData = [...data].slice(0, 6).reverse();
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = chartData.map((d, i) => {
    const x = padding.left + (chartData.length > 1 ? (i * innerWidth) / (chartData.length - 1) : innerWidth / 2);
    const pct = d.percentage || 0;
    const y = padding.top + innerHeight - (pct / 100) * innerHeight;
    return { x, y, val: pct, date: d.createdAt };
  });

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
    : "";

  const yTicks = [100, 75, 50, 25, 0];

  const formatDate = (dateStr, index) => {
    if(!dateStr) return `Test ${index + 1}`;
    const d = new Date(dateStr);
    if(isNaN(d.getTime())) return `Test ${index + 1}`;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => {
        const y = padding.top + innerHeight - (tick / 100) * innerHeight;
        return (
          <g key={`y-${i}`}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-input)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
            <text x={padding.left - 10} y={y} fill="var(--text-muted)" fontSize="11" textAnchor="end" dominantBaseline="middle">{tick}%</text>
          </g>
        );
      })}
      {points.map((p, i) => (
        <g key={`x-${i}`}>
          <line x1={p.x} y1={padding.top} x2={p.x} y2={height - padding.bottom} stroke="var(--border-input)" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.5" />
          <text x={p.x} y={height - padding.bottom + 15} fill="var(--text-muted)" fontSize="11" textAnchor="middle">{formatDate(p.date, i)}</text>
        </g>
      ))}
      {points.length > 0 && (
        <>
          <path d={areaPath} fill="url(#areaGradient)" />
          <path d={linePath} fill="none" stroke="#8B5CF6" strokeWidth="2.5" />
        </>
      )}
      {points.map((p, i) => (
        <circle key={`point-${i}`} cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#8B5CF6" strokeWidth="2.5" />
      ))}
    </svg>
  );
};

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

  const availableQuizzes = quizzes;
  const availableCount = availableQuizzes.length;
  const recentAvailable = [...availableQuizzes].reverse().slice(0, 3);

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
              <h3>{availableCount}</h3>
              <p>Available Mocks</p>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="sd-bottom-grid">
          
          {/* LEFT: PERFORMANCE CHART */}
          <div className="sd-performance-section">
            <div className="sd-section-header" style={{ alignItems: "flex-start", marginBottom: "0" }}>
              <div>
                <h2 style={{ marginBottom: "4px" }}>Score Trend</h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, fontWeight: "500" }}>Your average score over time</p>
              </div>
              <select className="sd-period-select" style={{ background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", outline: "none", cursor: "pointer" }}>
                <option>Last 6 Tests</option>
                <option>All Time</option>
              </select>
            </div>
            
            <div className="sd-chart-container" style={{ height: "220px", width: "100%", marginTop: "16px" }}>
              <ScoreTrendChart data={results} />
            </div>
          </div>

          {/* RIGHT: UPCOMING MOCKS */}
          <div className="sd-upcoming-section">
            <div className="sd-section-header">
              <h2>Available Mocks</h2>
              <span className="sd-view-all" onClick={() => navigate("/dashboard/exams")}>View All</span>
            </div>
            
            <div className="sd-upcoming-list">
              {recentAvailable.length === 0 ? (
                <div className="sd-empty-upcoming">
                  <Calendar size={32} color="var(--border-input)" />
                  <p>No available mocks right now.</p>
                </div>
              ) : (
                recentAvailable.map(quiz => {
                  const d = new Date(quiz.createdAt || new Date());
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
