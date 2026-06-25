import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuizzes: 0,
    totalQuestions: 0,
    totalAttempts: 0,
    averageScore: 0,
    activeUsers: 856,
    quizzesPublished: 178,
    questionsAdded: 1289,
    topSubjects: [],
    topQuizzes: [],
    activities: [],
    chartData: []
  });
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const [explorerPage, setExplorerPage] = useState(1);
  const [explorerPath, setExplorerPath] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch basic stats
        const statsRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/quizzes/stats/dashboard`,
          { headers }
        );
        setStats(statsRes.data);

        // Fetch quizzes for detailed statuses
        const quizzesRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/quizzes`,
          { headers }
        );
        setQuizzes(quizzesRes.data);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError("Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const formatNumber = (num) => {
    return num ? Number(num).toLocaleString() : "0";
  };

  // Compute actual counts from db, falling back to mockup counts if database is empty
  const usersCount = stats.totalUsers || 1248;
  const quizzesCount = stats.totalQuizzes || 236;
  const questionsCount = stats.totalQuestions || 5389;
  const attemptsCount = stats.totalAttempts || 8742;
  const averageScoreCount = stats.averageScore ? `${stats.averageScore.toFixed(2)}%` : "72.45%";

  const publishedQuizzes = stats.quizzesPublished || quizzes.filter(q => q.status === "Published" || q.published).length || 178;
  const draftQuizzes = quizzes.filter(q => q.status === "Draft" || (!q.published && q.status !== "Scheduled")).length || 45;
  const scheduledQuizzes = quizzes.filter(q => q.status === "Scheduled").length || 6;
  const archivedQuizzes = quizzes.filter(q => q.status === "Archived").length || 12;

  // Real-data aggregates with mockup fallbacks
  const activities = stats.activities && stats.activities.length > 0 ? stats.activities : [
    { text: 'Quiz "BPSC Mock Test 5" published', time: '22 Jun 2026, 10:25 AM', icon: '📖', bg: '#EDE9FE', color: '#6E3FF3' },
    { text: 'New quiz "The Loop Exam" created', time: '22 Jun 2026, 09:40 AM', icon: '➕', bg: '#FEF3C7', color: '#D97706' },
    { text: 'User Ravi Kumar attempted "BPSC Mock Test 5"', time: '22 Jun 2026, 09:15 AM', icon: '👥', bg: '#D1FAE5', color: '#10B981' },
    { text: 'Subject "History" updated', time: '21 Jun 2026, 04:45 PM', icon: '✏️', bg: '#DBEAFE', color: '#2563EB' },
    { text: 'Question added in "Geography"', time: '21 Jun 2026, 02:30 PM', icon: '❓', bg: '#FCE7F3', color: '#DB2777' },
  ];

  const topSubjectsList = stats.topSubjects && stats.topSubjects.length > 0 ? stats.topSubjects : [
    { name: "Quantitative Aptitude", count: 1724, percentage: 32 },
    { name: "General Studies", count: 1293, percentage: 24 },
    { name: "Aptitude", count: 970, percentage: 18 },
    { name: "Computer Science", count: 754, percentage: 14 },
    { name: "Others", count: 648, percentage: 12 }
  ];

  const topQuizzesList = stats.topQuizzes && stats.topQuizzes.length > 0 ? stats.topQuizzes : [
    { rank: 1, name: "BPSC Mock Test 5", attempts: 1245 },
    { rank: 2, name: "The Loop Exam", attempts: 982 },
    { rank: 3, name: "JEE Main Final 1", attempts: 875 },
    { rank: 4, name: "Teaching Pariksha Aptitude", attempts: 740 },
    { rank: 5, name: "Quantitative Aptitude Test", attempts: 654 }
  ];

  const chartDataList = stats.chartData && stats.chartData.length > 0 ? stats.chartData : [
    { label: "16 Jun", quizzesCreated: 1050, attempts: 480 },
    { label: "17 Jun", quizzesCreated: 1450, attempts: 800 },
    { label: "18 Jun", quizzesCreated: 1350, attempts: 650 },
    { label: "19 Jun", quizzesCreated: 1700, attempts: 750 },
    { label: "20 Jun", quizzesCreated: 1550, attempts: 1080 },
    { label: "21 Jun", quizzesCreated: 1380, attempts: 1000 },
    { label: "22 Jun", quizzesCreated: 1700, attempts: 1220 }
  ];

  const activeUsersCount = stats.activeUsers || 856;
  const questionsAddedCount = stats.questionsAdded || 1289;

  // Quiz Explorer Logic
  const explorerData = {};
  quizzes.forEach(q => {
    const exam = q.examName || "Uncategorized";
    const subj = q.subject || "No Subject";
    if (!explorerData[exam]) explorerData[exam] = {};
    if (!explorerData[exam][subj]) explorerData[exam][subj] = [];
    explorerData[exam][subj].push(q);
  });

  let explorerView = "exams";
  let explorerList = [];
  
  if (explorerPath.length === 0) {
    explorerView = "exams";
    explorerList = Object.keys(explorerData).map(exam => ({
      name: exam,
      count: Object.keys(explorerData[exam]).length,
      totalQuizzes: Object.values(explorerData[exam]).reduce((acc, subj) => acc + subj.length, 0)
    }));
  } else if (explorerPath.length === 1) {
    explorerView = "subjects";
    const exam = explorerPath[0];
    if (explorerData[exam]) {
      explorerList = Object.keys(explorerData[exam]).map(subj => ({
        name: subj,
        count: explorerData[exam][subj].length
      }));
    }
  } else if (explorerPath.length === 2) {
    explorerView = "quizzes";
    const exam = explorerPath[0];
    const subj = explorerPath[1];
    if (explorerData[exam] && explorerData[exam][subj]) {
      explorerList = explorerData[exam][subj].map(q => ({
        name: q.title,
        status: q.status || (q.published ? "Published" : "Draft"),
        date: new Date(q.createdAt).toLocaleDateString()
      }));
    }
  }

  const totalActivityPages = Math.max(1, Math.ceil(activities.length / itemsPerPage));
  const currentActivities = activities.slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage);



  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Dashboard Overview" />

        <div className="admin-content">
          {error && <p className="admin-error">{error}</p>}

          {/* 1. FIVE STAT CARDS AT THE TOP */}
          <div className="stat-cards-grid">
            {/* Card 1: Users */}
            <div className="stat-card accent-violet">
              <div className="stat-card-icon" style={{ background: "rgba(110, 63, 243, 0.08)", color: "#6E3FF3" }}>👥</div>
              <div>
                <p className="stat-card-label">Total Users</p>
                <p className="stat-card-value">{loading ? "—" : formatNumber(usersCount)}</p>
                <span className="stat-card-trend trend-up">↑ 12.5% <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>vs last 7 days</span></span>
              </div>
              <div className="stat-card-sparkline">
                <svg viewBox="0 0 100 30" width="70" height="25" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="gradient-users" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6E3FF3" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6E3FF3" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,25 Q15,20 30,12 T60,18 T90,2 T100,6 L100,30 L0,30 Z" fill="url(#gradient-users)" />
                  <path d="M0,25 Q15,20 30,12 T60,18 T90,2 T100,6" fill="none" stroke="#6E3FF3" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 2: Quizzes */}
            <div className="stat-card accent-green">
              <div className="stat-card-icon" style={{ background: "rgba(16, 185, 129, 0.08)", color: "#10B981" }}>📋</div>
              <div>
                <p className="stat-card-label">Total Quizzes</p>
                <p className="stat-card-value">{loading ? "—" : formatNumber(quizzesCount)}</p>
                <span className="stat-card-trend trend-up">↑ 8.4% <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>vs last 7 days</span></span>
              </div>
              <div className="stat-card-sparkline">
                <svg viewBox="0 0 100 30" width="70" height="25" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="gradient-quizzes-card" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,26 Q15,22 30,18 T60,10 T90,5 T100,2 L100,30 L0,30 Z" fill="url(#gradient-quizzes-card)" />
                  <path d="M0,26 Q15,22 30,18 T60,10 T90,5 T100,2" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 3: Questions */}
            <div className="stat-card accent-gold">
              <div className="stat-card-icon" style={{ background: "rgba(245, 158, 11, 0.08)", color: "#F59E0B" }}>❓</div>
              <div>
                <p className="stat-card-label">Total Questions</p>
                <p className="stat-card-value">{loading ? "—" : formatNumber(questionsCount)}</p>
                <span className="stat-card-trend trend-up">↑ 15.3% <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>vs last 7 days</span></span>
              </div>
              <div className="stat-card-sparkline">
                <svg viewBox="0 0 100 30" width="70" height="25" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="gradient-questions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,24 Q15,20 30,22 T60,15 T90,6 T100,4 L100,30 L0,30 Z" fill="url(#gradient-questions)" />
                  <path d="M0,24 Q15,20 30,22 T60,15 T90,6 T100,4" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 4: Attempts */}
            <div className="stat-card accent-navy">
              <div className="stat-card-icon" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#2563EB" }}>🏆</div>
              <div>
                <p className="stat-card-label">Total Attempts</p>
                <p className="stat-card-value">{loading ? "—" : formatNumber(attemptsCount)}</p>
                <span className="stat-card-trend trend-up">↑ 18.7% <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>vs last 7 days</span></span>
              </div>
              <div className="stat-card-sparkline">
                <svg viewBox="0 0 100 30" width="70" height="25" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="gradient-attempts-card" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,28 Q15,22 30,24 T60,14 T90,8 T100,5 L100,30 L0,30 Z" fill="url(#gradient-attempts-card)" />
                  <path d="M0,28 Q15,22 30,24 T60,14 T90,8 T100,5" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 5: Average Score */}
            <div className="stat-card accent-pink">
              <div className="stat-card-icon" style={{ background: "rgba(236, 72, 153, 0.08)", color: "#EC4899" }}>📈</div>
              <div>
                <p className="stat-card-label">Average Score</p>
                <p className="stat-card-value">{loading ? "—" : averageScoreCount}</p>
                <span className="stat-card-trend" style={{ color: "#9D174D", fontWeight: "600", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px", marginTop: "4px" }}>
                  ↑ 5.3% <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>vs last 7 days</span>
                </span>
              </div>
              <div className="stat-card-sparkline">
                <svg viewBox="0 0 100 30" width="70" height="25" style={{ overflow: "visible" }}>
                  <defs>
                    <linearGradient id="gradient-score-card" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,22 Q15,28 30,15 T60,25 T90,5 T100,12 L100,30 L0,30 Z" fill="url(#gradient-score-card)" />
                  <path d="M0,22 Q15,28 30,15 T60,25 T90,5 T100,12" fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* 2. MIDDLE TWO-COLUMN GRID: CHART & METRICS */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "24px", marginTop: "24px" }}>
            {/* Overview Line Chart */}
            <div className="form-card" style={{ margin: 0, padding: "24px", display: "flex", flexDirection: "column" }}>
              <div className="dashboard-card-title-row">
                <h3 className="dashboard-card-title">Overview</h3>
                <div>
                  <select defaultValue="Last 7 Days" style={{ padding: "6px 12px", border: "1.5px solid var(--border-input)", borderRadius: "8px", fontSize: "12px", background: "var(--bg-input)", color: "var(--text-primary)", fontWeight: "600" }}>
                    <option>Last 7 Days</option>
                  </select>
                </div>
              </div>

              {/* Legends */}
              <div style={{ display: "flex", gap: "20px", marginBottom: "20px", fontSize: "12.5px", fontWeight: "600" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255, 99, 132, 0.08)", padding: "4px 12px", borderRadius: "100px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#FF6384" }}></span>
                  <span style={{ color: "#FF6384" }}>Quizzes Created</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255, 159, 64, 0.08)", padding: "4px 12px", borderRadius: "100px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#FF9F40" }}></span>
                  <span style={{ color: "#FF9F40" }}>Attempts</span>
                </div>
              </div>

              {/* High-Fidelity SVG Chart */}
              <div style={{ flex: 1, position: "relative" }}>
                {(() => {
                  const width = 1000;
                  const height = 250;

                  const maxVal = Math.max(10, ...chartDataList.map(d => Math.max(d.quizzesCreated, d.attempts)));
                  
                  let dynamicMax = 10;
                  if (maxVal <= 10) dynamicMax = 10;
                  else if (maxVal <= 20) dynamicMax = 20;
                  else if (maxVal <= 50) dynamicMax = 50;
                  else if (maxVal <= 100) dynamicMax = 100;
                  else if (maxVal <= 200) dynamicMax = 200;
                  else if (maxVal <= 500) dynamicMax = 500;
                  else if (maxVal <= 1000) dynamicMax = 1000;
                  else if (maxVal <= 2000) dynamicMax = 2000;
                  else dynamicMax = Math.ceil(maxVal / 500) * 500;

                  const getScaledY = (val) => {
                    const scaled = 200 - (val / dynamicMax) * 170;
                    return Math.max(30, Math.min(200, scaled));
                  };

                  const formatYLabel = (val) => {
                    if (val >= 1000) return (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + "K";
                    return Math.round(val).toString();
                  };

                  const startX = 60;
                  const endX = width - 40;
                  const stepX = (endX - startX) / (chartDataList.length - 1);

                  const pointsQuizzes = chartDataList.map((d, i) => ({ x: startX + i * stepX, y: getScaledY(d.quizzesCreated), val: d.quizzesCreated, label: d.label, dataset: "Quizzes Created", color: "#FF6384" }));
                  const pointsAttempts = chartDataList.map((d, i) => ({ x: startX + i * stepX, y: getScaledY(d.attempts), val: d.attempts, label: d.label, dataset: "Attempts", color: "#FF9F40" }));

                  const getSmoothPath = (pts) => {
                    if (pts.length === 0) return "";
                    let d = `M ${pts[0].x},${pts[0].y}`;
                    const cpOffset = stepX / 3;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const curr = pts[i];
                      const next = pts[i + 1];
                      d += ` C ${curr.x + cpOffset},${curr.y} ${next.x - cpOffset},${next.y} ${next.x},${next.y}`;
                    }
                    return d;
                  };

                  const pathQuizzesStroke = getSmoothPath(pointsQuizzes);
                  const pathAttemptsStroke = getSmoothPath(pointsAttempts);

                  return (
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                      <svg viewBox="0 0 1000 250" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                        {/* Gridlines */}
                        <line x1={startX} y1="30" x2={endX} y2="30" stroke="var(--border-color)" strokeWidth="1" />
                        <line x1={startX} y1="72.5" x2={endX} y2="72.5" stroke="var(--border-color)" strokeWidth="1" />
                        <line x1={startX} y1="115" x2={endX} y2="115" stroke="var(--border-color)" strokeWidth="1" />
                        <line x1={startX} y1="157.5" x2={endX} y2="157.5" stroke="var(--border-color)" strokeWidth="1" />
                        <line x1={startX} y1="200" x2={endX} y2="200" stroke="var(--border-color)" strokeWidth="1" />
                        
                        {/* Y Axis */}
                        <text x="45" y="34" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax)}</text>
                        <text x="45" y="76.5" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.75)}</text>
                        <text x="45" y="119" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.5)}</text>
                        <text x="45" y="161.5" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.25)}</text>
                        <text x="45" y="204" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">0</text>

                        {/* Quizzes Created Path */}
                        <path d={pathQuizzesStroke} fill="none" stroke="#FF6384" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Attempts Path */}
                        <path d={pathAttemptsStroke} fill="none" stroke="#FF9F40" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                        {/* Hover Overlay Targets (Invisible) */}
                        {pointsQuizzes.concat(pointsAttempts).map((pt, i) => (
                          <g 
                            key={`target-${i}`}
                            onMouseEnter={() => setHoveredPoint(pt)}
                            onMouseLeave={() => setHoveredPoint(null)}
                            style={{ cursor: "crosshair" }}
                          >
                            <circle cx={pt.x} cy={pt.y} r="15" fill="transparent" />
                            <circle 
                              cx={pt.x} cy={pt.y} r="5" 
                              fill={hoveredPoint && hoveredPoint.x === pt.x && hoveredPoint.y === pt.y ? pt.color : "#ffffff"} 
                              stroke={pt.color} strokeWidth="3" 
                              style={{ transition: "all 0.15s" }}
                            />
                          </g>
                        ))}

                        {/* X Axis Labels */}
                        {chartDataList.map((d, i) => (
                          <text key={`x-${i}`} x={startX + i * stepX} y="225" fill="var(--text-muted)" fontSize="11" textAnchor="middle" fontWeight="500">{d.label}</text>
                        ))}
                      </svg>

                      {/* Tooltip Overlay */}
                      {hoveredPoint && (
                        <div style={{
                          position: "absolute",
                          left: `${(hoveredPoint.x / 1000) * 100}%`,
                          top: `${(hoveredPoint.y / 250) * 100}%`,
                          transform: "translate(-50%, -120%)",
                          background: "rgba(0, 0, 0, 0.8)",
                          color: "#fff",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          pointerEvents: "none",
                          whiteSpace: "nowrap",
                          zIndex: 10,
                          boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                        }}>
                          <div style={{ fontWeight: "700", marginBottom: "4px", fontSize: "11px", color: "#ccc" }}>{hoveredPoint.label}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                            <span style={{ display: "inline-block", width: "10px", height: "10px", background: hoveredPoint.color, borderRadius: "2px" }}></span>
                            {hoveredPoint.dataset}: {formatNumber(hoveredPoint.val)}
                          </div>
                          {/* Triangle pointer */}
                          <div style={{
                            position: "absolute",
                            bottom: "-4px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "0",
                            height: "0",
                            borderLeft: "5px solid transparent",
                            borderRight: "5px solid transparent",
                            borderTop: "5px solid rgba(0, 0, 0, 0.8)"
                          }} />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Attempts Overview Donut & Status Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="form-card" style={{ margin: 0, padding: "20px", display: "flex", flexDirection: "column" }}>
                <h3 className="dashboard-card-title" style={{ marginBottom: "16px" }}>Attempts Overview</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <div style={{ position: "relative", width: "110px", height: "110px" }}>
                    <svg viewBox="0 0 100 100" width="110" height="110">
                      {/* Completed Segment (Green) - 59.6% */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="38" 
                        fill="transparent" 
                        stroke="#10B981" 
                        strokeWidth="9" 
                        strokeDasharray="142.3 96.4" 
                        strokeDashoffset="0" 
                        transform="rotate(-90 50 50)" 
                        strokeLinecap="round"
                      />
                      {/* In Progress Segment (Yellow) - 26.9% */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="38" 
                        fill="transparent" 
                        stroke="#F59E0B" 
                        strokeWidth="9" 
                        strokeDasharray="64.2 174.5" 
                        strokeDashoffset="-142.3" 
                        transform="rotate(-90 50 50)" 
                        strokeLinecap="round"
                      />
                      {/* Not Started Segment (Red) - 13.5% */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="38" 
                        fill="transparent" 
                        stroke="#EF4444" 
                        strokeWidth="9" 
                        strokeDasharray="32.2 206.5" 
                        strokeDashoffset="-206.5" 
                        transform="rotate(-90 50 50)" 
                        strokeLinecap="round"
                      />
                    </svg>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                      <span style={{ fontSize: "15px", fontWeight: "750", color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>{formatNumber(attemptsCount)}</span>
                      <span style={{ fontSize: "8px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Attempts</span>
                    </div>
                  </div>

                  {/* Donut Legend Labels */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#10B981" }}></span>
                        <span style={{ color: "var(--text-secondary)" }}>Completed</span>
                      </div>
                      <span style={{ color: "var(--text-primary)" }}>{formatNumber(Math.round(attemptsCount * 0.596))} (59.6%)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#F59E0B" }}></span>
                        <span style={{ color: "var(--text-secondary)" }}>In Progress</span>
                      </div>
                      <span style={{ color: "var(--text-primary)" }}>{formatNumber(Math.round(attemptsCount * 0.269))} (26.9%)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "600" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: "#EF4444" }}></span>
                        <span style={{ color: "var(--text-secondary)" }}>Not Started</span>
                      </div>
                      <span style={{ color: "var(--text-primary)" }}>{formatNumber(Math.round(attemptsCount * 0.135))} (13.5%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiz Status Mini Grid */}
              <div className="form-card" style={{ margin: 0, padding: "20px" }}>
                <h3 className="dashboard-card-title" style={{ marginBottom: "16px" }}>Quiz Status</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                  <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px", background: "rgba(16, 185, 129, 0.1)", color: "#10B981", padding: "6px", borderRadius: "8px" }}>📖</span>
                    <div>
                      <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Published</p>
                      <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{publishedQuizzes}</p>
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px", background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", padding: "6px", borderRadius: "8px" }}>📝</span>
                    <div>
                      <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Draft</p>
                      <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{draftQuizzes}</p>
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px", background: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", padding: "6px", borderRadius: "8px" }}>📦</span>
                    <div>
                      <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Archived</p>
                      <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{archivedQuizzes}</p>
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "16px", background: "rgba(37, 99, 235, 0.1)", color: "#2563EB", padding: "6px", borderRadius: "8px" }}>📅</span>
                    <div>
                      <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Scheduled</p>
                      <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{scheduledQuizzes}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. BOTTOM THREE-COLUMN GRID: EXPLORER, ACTIVITY */}
          <div className="dashboard-three-column-grid">
            {/* Quiz Explorer (Spans 2 columns) */}
            <div className="form-card quiz-explorer-card" style={{ margin: 0, padding: "24px", gridColumn: "span 2", display: "flex", flexDirection: "column" }}>
              <div className="dashboard-card-title-row" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
                <h3 className="dashboard-card-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px" }}>
                  <span 
                    style={{ cursor: "pointer", color: explorerPath.length === 0 ? "var(--text-primary)" : "var(--text-secondary)", transition: "color 0.2s" }} 
                    onClick={() => { setExplorerPath([]); setExplorerPage(1); }}
                    onMouseOver={(e) => { if(explorerPath.length > 0) e.target.style.color = "var(--text-primary)"; }}
                    onMouseOut={(e) => { if(explorerPath.length > 0) e.target.style.color = "var(--text-secondary)"; }}
                  >
                    Exams
                  </span>
                  {explorerPath.length > 0 && (
                    <>
                      <span style={{ color: "var(--text-muted)" }}>/</span>
                      <span 
                        style={{ cursor: "pointer", color: explorerPath.length === 1 ? "var(--text-primary)" : "var(--text-secondary)", transition: "color 0.2s" }} 
                        onClick={() => { setExplorerPath([explorerPath[0]]); setExplorerPage(1); }}
                        onMouseOver={(e) => { if(explorerPath.length > 1) e.target.style.color = "var(--text-primary)"; }}
                        onMouseOut={(e) => { if(explorerPath.length > 1) e.target.style.color = "var(--text-secondary)"; }}
                      >
                        {explorerPath[0]}
                      </span>
                    </>
                  )}
                  {explorerPath.length > 1 && (
                    <>
                      <span style={{ color: "var(--text-muted)" }}>/</span>
                      <span style={{ color: "var(--text-primary)" }}>{explorerPath[1]}</span>
                    </>
                  )}
                </h3>
                
                <div className="pagination-controls" style={{ transform: "scale(0.85)", transformOrigin: "right" }}>
                  <button className="page-nav-btn" onClick={() => setExplorerPage(Math.max(1, explorerPage - 1))} disabled={explorerPage === 1}>&lt;</button>
                  <button className="page-nav-btn active-page">{explorerPage}</button>
                  <button className="page-nav-btn" onClick={() => setExplorerPage(Math.min(Math.max(1, Math.ceil(explorerList.length / itemsPerPage)), explorerPage + 1))} disabled={explorerPage >= Math.max(1, Math.ceil(explorerList.length / itemsPerPage))}>&gt;</button>
                </div>
              </div>

              <div className="explorer-list" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", minHeight: "300px" }}>
                {explorerList.slice((explorerPage - 1) * itemsPerPage, explorerPage * itemsPerPage).map((item, idx) => (
                  <div key={idx} className="explorer-item" onClick={() => {
                    if (explorerView === "exams") {
                      setExplorerPath([item.name]);
                      setExplorerPage(1);
                    } else if (explorerView === "subjects") {
                      setExplorerPath([explorerPath[0], item.name]);
                      setExplorerPage(1);
                    }
                  }} style={{ 
                    padding: "16px 20px", 
                    borderRadius: "10px", 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    cursor: explorerView === "quizzes" ? "default" : "pointer",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-card)",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { if(explorerView !== "quizzes") { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = "var(--border-input)"; } }}
                  onMouseOut={(e) => { if(explorerView !== "quizzes") { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border-color)"; } }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: explorerView === "quizzes" ? "rgba(16, 185, 129, 0.1)" : "rgba(110, 63, 243, 0.1)", color: explorerView === "quizzes" ? "#10B981" : "#6E3FF3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                        {explorerView === "exams" ? "🎓" : explorerView === "subjects" ? "📚" : "📄"}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: "600", color: "var(--text-primary)", fontSize: "14.5px" }}>{item.name}</p>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                          {explorerView === "exams" ? `${item.count} Subjects • ${item.totalQuizzes} Quizzes` : 
                           explorerView === "subjects" ? `${item.count} Quizzes` : 
                           `Created: ${item.date}`}
                        </p>
                      </div>
                    </div>
                    {explorerView !== "quizzes" && (
                      <div style={{ color: "var(--text-muted)", fontSize: "16px" }}>➔</div>
                    )}
                    {explorerView === "quizzes" && (
                      <span style={{ 
                        fontSize: "12px", 
                        padding: "6px 12px", 
                        borderRadius: "8px", 
                        background: item.status === "Published" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                        color: item.status === "Published" ? "#10B981" : "#F59E0B",
                        fontWeight: "700" 
                      }}>
                        {item.status}
                      </span>
                    )}
                  </div>
                ))}
                {explorerList.length === 0 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                    No data found for this selection.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="form-card" style={{ margin: 0, padding: "20px" }}>
              <div className="dashboard-card-title-row">
                <h3 className="dashboard-card-title">Recent Activity</h3>
                <div className="pagination-controls" style={{ transform: "scale(0.85)", transformOrigin: "right" }}>
                  <button className="page-nav-btn" onClick={() => setActivityPage(Math.max(1, activityPage - 1))} disabled={activityPage === 1}>&lt;</button>
                  <button className="page-nav-btn active-page">{activityPage}</button>
                  <button className="page-nav-btn" onClick={() => setActivityPage(Math.min(totalActivityPages, activityPage + 1))} disabled={activityPage === totalActivityPages}>&gt;</button>
                </div>
              </div>
              <div className="recent-activities-list">
                {currentActivities.map((act, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-icon-badge" style={{ background: act.bg, color: act.color }}>
                      {act.icon}
                    </div>
                    <div className="activity-info">
                      <span className="activity-text" title={act.text}>{act.text}</span>
                      <span className="activity-time">{act.time}</span>
                    </div>
                    <span className="activity-arrow">➔</span>
                  </div>
                ))}
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;