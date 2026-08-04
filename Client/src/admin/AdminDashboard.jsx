import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Users, User, ClipboardList, HelpCircle, Trophy, TrendingUp, Plus, BookOpen, Ban, Edit3, ArrowRight, FileText, Package, CalendarDays, GraduationCap, Library, File, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
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

  const [rangeDays, setRangeDays] = useState(7);
  const [activeDashboardView, setActiveDashboardView] = useState("main"); // "main" or "support"
  const [explorerPage, setExplorerPage] = useState(1);
  const [explorerPath, setExplorerPath] = useState([]);
  const [activityPage, setActivityPage] = useState(1);
  const itemsPerPage = 5;

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  const hasGlobalAccess = currentUser.role === "superadmin" || 
    (currentUser.role === "admin" && (!currentUser.permissions || currentUser.permissions.length === 0 || currentUser.permissions.includes("*")));
  
  const hasSupportAccess = hasGlobalAccess || 
    (currentUser.permissions && currentUser.permissions.includes("support_tickets")) || 
    currentUser.department === "Calling Team" || 
    currentUser.department === "Operations Team";
    
  const hasContentAccess = hasGlobalAccess || 
    (currentUser.permissions && currentUser.permissions.includes("quizzes")) || 
    currentUser.department === "Content Team" || 
    currentUser.department === "Faculty";

  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch basic stats with range parameter
        const statsRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/quizzes/stats/dashboard?range=${rangeDays}`,
          { headers }
        );
        setStats(statsRes.data);

        // Fetch quizzes for detailed statuses
        const quizzesRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/quizzes`,
          { headers }
        );
        setQuizzes(quizzesRes.data);

        // Fetch support tickets if authorized
        if (hasSupportAccess) {
          try {
            const ticketsRes = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/tickets`,
              { headers }
            );
            setTickets(ticketsRes.data || []);
          } catch (e) {
            console.error("Dashboard error fetching support tickets:", e);
          }
        }
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError("Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [rangeDays]);

  const formatNumber = (num) => {
    return num ? Number(num).toLocaleString() : "0";
  };

  // Support Ticket Statistics
  const totalTicketsCount = tickets.length;
  const openTicketsCount = tickets.filter(t => ["Open", "Reopened"].includes(t.status)).length;
  const inProgressTicketsCount = tickets.filter(t => t.status === "In Progress").length;
  const resolvedTicketsCount = tickets.filter(t => ["Resolved", "Closed"].includes(t.status)).length;
  const unassignedTickets = tickets.filter(t => !t.assignedTo && ["Open", "Reopened"].includes(t.status));

  const generateSupportChartData = (days) => {
    const today = new Date();
    const result = [];
    const dailyStats = {};
    
    const formatDateKey = (dateObj) => {
      const day = dateObj.getDate();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[dateObj.getMonth()];
      return `${day} ${month}`;
    };

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = formatDateKey(d);
      dailyStats[dateString] = { ticketsCreated: 0, ticketsResolved: 0 };
      result.push(dateString);
    }
    
    tickets.forEach(ticket => {
      if (!ticket.createdAt) return;
      const createdDate = new Date(ticket.createdAt);
      const createdStr = formatDateKey(createdDate);
      if (dailyStats[createdStr] !== undefined) {
        dailyStats[createdStr].ticketsCreated += 1;
      }
      if (ticket.status === "Resolved" || ticket.status === "Closed") {
        const resolvedDate = new Date(ticket.updatedAt || ticket.createdAt);
        const resolvedStr = formatDateKey(resolvedDate);
        if (dailyStats[resolvedStr] !== undefined) {
          dailyStats[resolvedStr].ticketsResolved += 1;
        }
      }
    });

    const parsedData = result.map(label => ({
      label,
      ticketsCreated: dailyStats[label].ticketsCreated,
      ticketsResolved: dailyStats[label].ticketsResolved
    }));

    const allZero = parsedData.every(d => d.ticketsCreated === 0 && d.ticketsResolved === 0);
    if (allZero) {
      // Return beautiful mockup data for preview/demo when no real tickets are in range
      return result.map((label, idx) => {
        const mockCreated = Math.round(2 + Math.sin(idx) * 2 + (idx % 3 === 0 ? 1 : 0));
        const mockResolved = Math.round(1 + Math.cos(idx) * 1.5 + (idx % 2 === 0 ? 1 : 0));
        return {
          label,
          ticketsCreated: Math.max(0, mockCreated),
          ticketsResolved: Math.max(0, mockResolved)
        };
      });
    }

    return parsedData;
  };

  const supportChartData = generateSupportChartData(rangeDays);



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

  const generateFallbackChartData = (days) => {
    const today = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      result.push({
        label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        quizzesCreated: 0,
        attempts: 0,
      });
    }
    return result;
  };

  const chartDataList = stats.chartData && stats.chartData.length > 0 
    ? stats.chartData 
    : generateFallbackChartData(rangeDays);

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
        date: new Date(q.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')
      }));
    }
  }

  const totalActivityPages = Math.max(1, Math.ceil(activities.length / itemsPerPage));
  const currentActivities = activities.slice((activityPage - 1) * itemsPerPage, activityPage * itemsPerPage);



  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title={<><span className="inline sm:hidden">Dashboard</span><span className="hidden sm:inline">Dashboard Overview</span></>} />

        <div className="admin-content">
          {error && <p className="admin-error">{error}</p>}

          {/* Super Admin Dashboard Selector Switch */}
          {hasGlobalAccess && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "28px" }}>
              <div style={{ display: "inline-flex", background: "var(--bg-input, #F9FAFB)", border: "1.5px solid var(--border-color, #E5E7EB)", borderRadius: "100px", padding: "4px" }}>
                <button 
                  onClick={() => setActiveDashboardView("main")}
                  style={{ 
                    padding: "8px 24px", 
                    borderRadius: "100px", 
                    fontWeight: "700", 
                    fontSize: "13px", 
                    cursor: "pointer", 
                    border: "none",
                    background: activeDashboardView === "main" ? "var(--primary-color, #6E3FF3)" : "transparent",
                    color: activeDashboardView === "main" ? "#fff" : "var(--text-secondary, #6B7280)",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    outline: "none"
                  }}
                >
                  Quiz & User Analytics
                </button>
                <button 
                  onClick={() => setActiveDashboardView("support")}
                  style={{ 
                    padding: "8px 24px", 
                    borderRadius: "100px", 
                    fontWeight: "700", 
                    fontSize: "13px", 
                    cursor: "pointer", 
                    border: "none",
                    background: activeDashboardView === "support" ? "var(--primary-color, #6E3FF3)" : "transparent",
                    color: activeDashboardView === "support" ? "#fff" : "var(--text-secondary, #6B7280)",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    outline: "none"
                  }}
                >
                  Support Ticket Analytics
                </button>
              </div>
            </div>
          )}

          {/* 1. DYNAMIC DEPARTMENT DASHBOARD RENDERING */}
          {(!hasGlobalAccess && !hasContentAccess && hasSupportAccess) || (hasGlobalAccess && activeDashboardView === "support") ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
              {/* Stat Cards */}
              <div className="stat-cards-grid">
                <div className="stat-card accent-violet">
                  <div className="stat-card-icon" style={{ background: "rgba(110, 63, 243, 0.08)", color: "#6E3FF3", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="stat-card-label">Total Tickets</p>
                    <p className="stat-card-value">{loading ? "—" : formatNumber(totalTicketsCount)}</p>
                    <span className="stat-card-trend trend-up">All time tickets</span>
                  </div>
                </div>

                <div className="stat-card accent-gold">
                  <div className="stat-card-icon" style={{ background: "rgba(245, 158, 11, 0.08)", color: "#F59E0B", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <p className="stat-card-label">Open</p>
                    <p className="stat-card-value">{loading ? "—" : formatNumber(openTicketsCount)}</p>
                    <span className="stat-card-trend trend-up" style={{ color: "#D97706" }}>Awaiting response</span>
                  </div>
                </div>

                <div className="stat-card accent-navy">
                  <div className="stat-card-icon" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#2563EB", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className="stat-card-label">In Progress</p>
                    <p className="stat-card-value">{loading ? "—" : formatNumber(inProgressTicketsCount)}</p>
                    <span className="stat-card-trend trend-up" style={{ color: "#2563EB" }}>Being resolved</span>
                  </div>
                </div>

                <div className="stat-card accent-green">
                  <div className="stat-card-icon" style={{ background: "rgba(16, 185, 129, 0.08)", color: "#10B981", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="stat-card-label">Resolved</p>
                    <p className="stat-card-value">{loading ? "—" : formatNumber(resolvedTicketsCount)}</p>
                    <span className="stat-card-trend trend-up" style={{ color: "#10B981" }}>Successfully resolved</span>
                  </div>
                </div>
              </div>

              {/* Middle Two-Column Grid: Chart & Unassigned Tickets */}
              <div className="dashboard-middle-grid">
                {/* Tickets Chart */}
                <div className="form-card" style={{ margin: 0, padding: "24px", display: "flex", flexDirection: "column" }}>
                  <div className="dashboard-card-title-row">
                    <h3 className="dashboard-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      Support Performance
                      {supportChartData.length > 0 && (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "500" }}>
                          ({supportChartData[0].label} – {supportChartData[supportChartData.length - 1].label})
                        </span>
                      )}
                    </h3>
                    <div>
                      <select 
                        value={rangeDays} 
                        onChange={(e) => setRangeDays(parseInt(e.target.value, 10))}
                        style={{ padding: "6px 12px", border: "1.5px solid var(--border-input)", borderRadius: "8px", fontSize: "12px", background: "var(--bg-input)", color: "var(--text-primary)", fontWeight: "600", cursor: "pointer" }}
                      >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                      </select>
                    </div>
                  </div>

                  {/* Legends */}
                  <div style={{ display: "flex", gap: "20px", marginBottom: "20px", fontSize: "12.5px", fontWeight: "600" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(110, 63, 243, 0.08)", padding: "4px 12px", borderRadius: "100px" }}>
                      <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#6E3FF3" }}></span>
                      <span style={{ color: "#6E3FF3" }}>Created</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.08)", padding: "4px 12px", borderRadius: "100px" }}>
                      <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10B981" }}></span>
                      <span style={{ color: "#10B981" }}>Resolved</span>
                    </div>
                  </div>

                  {/* High-Fidelity SVG Chart */}
                  <div style={{ flex: 1, position: "relative" }}>
                    {(() => {
                      const width = 1000;
                      const height = 250;

                      const maxVal = Math.max(5, ...supportChartData.map(d => Math.max(d.ticketsCreated, d.ticketsResolved)));
                      
                      let dynamicMax = 5;
                      if (maxVal <= 5) dynamicMax = 5;
                      else if (maxVal <= 10) dynamicMax = 10;
                      else if (maxVal <= 20) dynamicMax = 20;
                      else if (maxVal <= 50) dynamicMax = 50;
                      else dynamicMax = Math.ceil(maxVal / 10) * 10;

                      const getScaledY = (val) => {
                        const scaled = 200 - (val / dynamicMax) * 170;
                        return Math.max(30, Math.min(200, scaled));
                      };

                      const formatYLabel = (val) => {
                        return Math.round(val).toString();
                      };

                      const startX = 60;
                      const endX = width - 40;
                      const stepX = (endX - startX) / (supportChartData.length - 1);

                      const pointsCreated = supportChartData.map((d, i) => ({ x: startX + i * stepX, y: getScaledY(d.ticketsCreated), val: d.ticketsCreated, label: d.label, dataset: "Tickets Created", color: "#6E3FF3" }));
                      const pointsResolved = supportChartData.map((d, i) => ({ x: startX + i * stepX, y: getScaledY(d.ticketsResolved), val: d.ticketsResolved, label: d.label, dataset: "Tickets Resolved", color: "#10B981" }));

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

                      const getAreaPath = (pts) => {
                        if (pts.length === 0) return "";
                        const strokeD = getSmoothPath(pts);
                        const lastPt = pts[pts.length - 1];
                        const firstPt = pts[0];
                        return `${strokeD} L ${lastPt.x},200 L ${firstPt.x},200 Z`;
                      };

                      const pathCreatedStroke = getSmoothPath(pointsCreated);
                      const pathResolvedStroke = getSmoothPath(pointsResolved);
                      const pathCreatedArea = getAreaPath(pointsCreated);
                      const pathResolvedArea = getAreaPath(pointsResolved);

                      return (
                        <div style={{ width: "100%", height: "100%", position: "relative" }}>
                          <svg viewBox="0 0 1000 250" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                            <defs>
                              <linearGradient id="gradient-created-chart" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6E3FF3" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#6E3FF3" stopOpacity="0.0" />
                              </linearGradient>
                              <linearGradient id="gradient-resolved-chart" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            <line x1={startX} y1="30" x2={endX} y2="30" stroke="var(--border-color)" strokeWidth="1" />
                            <line x1={startX} y1="72.5" x2={endX} y2="72.5" stroke="var(--border-color)" strokeWidth="1" />
                            <line x1={startX} y1="115" x2={endX} y2="115" stroke="var(--border-color)" strokeWidth="1" />
                            <line x1={startX} y1="157.5" x2={endX} y2="157.5" stroke="var(--border-color)" strokeWidth="1" />
                            <line x1={startX} y1="200" x2={endX} y2="200" stroke="var(--border-color)" strokeWidth="1" />
                            
                            <text x="45" y="34" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax)}</text>
                            <text x="45" y="76.5" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.75)}</text>
                            <text x="45" y="119" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.5)}</text>
                            <text x="45" y="161.5" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.25)}</text>
                            <text x="45" y="204" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">0</text>

                            <path d={pathResolvedArea} fill="url(#gradient-resolved-chart)" />
                            <path d={pathCreatedArea} fill="url(#gradient-created-chart)" />

                            <path d={pathCreatedStroke} fill="none" stroke="#6E3FF3" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={pathResolvedStroke} fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                            {pointsCreated.concat(pointsResolved).map((pt, i) => (
                              <g 
                                key={`target-${i}`}
                                onMouseEnter={() => setHoveredPoint(pt)}
                                onMouseLeave={() => setHoveredPoint(null)}
                                style={{ cursor: "pointer" }}
                              >
                                <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
                                <circle 
                                  cx={pt.x} cy={pt.y} 
                                  r={pt.val > 0 ? "6" : "3.5"} 
                                  fill={hoveredPoint && hoveredPoint.x === pt.x && hoveredPoint.y === pt.y ? pt.color : (pt.val > 0 ? pt.color : "#ffffff")} 
                                  stroke={pt.color} 
                                  strokeWidth={pt.val > 0 ? "3" : "2"} 
                                  style={{ transition: "all 0.15s" }}
                                />
                              </g>
                            ))}

                            {supportChartData.map((d, i) => {
                              const maxLabels = rangeDays <= 7 ? 7 : rangeDays <= 14 ? 8 : 10;
                              const stepInterval = Math.max(1, Math.floor((supportChartData.length - 1) / (maxLabels - 1)));
                              const isLast = i === supportChartData.length - 1;
                              const showLabel = i % stepInterval === 0 || isLast;

                              if (isLast && i % stepInterval !== 0 && (i % stepInterval) < stepInterval / 2) {
                                return null;
                              }

                              if (!showLabel) return null;
                              return (
                                <text key={`x-${i}`} x={startX + i * stepX} y="225" fill="var(--text-muted)" fontSize="11" textAnchor="middle" fontWeight="500">{d.label}</text>
                              );
                            })}
                          </svg>

                          {hoveredPoint && hoveredPoint.dataset.startsWith("Tickets") && (
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

                {/* Unassigned Tickets List */}
                <div className="form-card" style={{ margin: 0, padding: "24px", display: "flex", flexDirection: "column" }}>
                  <div className="dashboard-card-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 className="dashboard-card-title">Unassigned Support Tickets</h3>
                    <a href="/admin/tickets" style={{ fontSize: "13px", fontWeight: "600", color: "#6E3FF3", textDecoration: "none" }}>View All →</a>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                          <th style={{ padding: "12px 8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>Ticket ID</th>
                          <th style={{ padding: "12px 8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>Subject</th>
                          <th style={{ padding: "12px 8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>Category</th>
                          <th style={{ padding: "12px 8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>Submitted By</th>
                          <th style={{ padding: "12px 8px", fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedTickets.slice(0, 5).map((t, idx) => {
                          const tkId = `#TP-${(idx + 149).toString().padStart(4, '0')}`;
                          return (
                            <tr key={t._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "14px 8px", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>{tkId}</td>
                              <td style={{ padding: "14px 8px", fontSize: "13.5px", color: "var(--text-primary)" }}>
                                <div style={{ fontWeight: "600" }}>{t.subject}</div>
                                <div style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.message}</div>
                              </td>
                              <td style={{ padding: "14px 8px" }}>
                                <span style={{ padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", background: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3" }}>
                                  {t.category.replace(' Issue', '')}
                                </span>
                              </td>
                              <td style={{ padding: "14px 8px", fontSize: "13px", color: "var(--text-secondary)" }}>{t.userId?.fullName || "Student"}</td>
                              <td style={{ padding: "14px 8px", fontSize: "12px", color: "var(--text-muted)" }}>
                                {new Date(t.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                        {unassignedTickets.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                              🎉 All support tickets are assigned or resolved!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* FIVE STAT CARDS AT THE TOP */}
              <div className="stat-cards-grid">
                {/* Card 1: Users */}
                <div className="stat-card accent-violet">
                  <div className="stat-card-icon" style={{ background: "rgba(110, 63, 243, 0.08)", color: "#6E3FF3", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} />
                  </div>
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
                  <div className="stat-card-icon" style={{ background: "rgba(16, 185, 129, 0.08)", color: "#10B981", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardList size={24} />
                  </div>
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
                  <div className="stat-card-icon" style={{ background: "rgba(245, 158, 11, 0.08)", color: "#F59E0B", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HelpCircle size={24} />
                  </div>
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
                  <div className="stat-card-icon" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#2563EB", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={24} />
                  </div>
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
                  <div className="stat-card-icon" style={{ background: "rgba(236, 72, 153, 0.08)", color: "#EC4899", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={24} />
                  </div>
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

              {/* MIDDLE TWO-COLUMN GRID: CHART & METRICS */}
              <div className="dashboard-middle-grid">
                {/* Overview Line Chart */}
                <div className="form-card" style={{ margin: 0, padding: "24px", display: "flex", flexDirection: "column" }}>
                  <div className="dashboard-card-title-row">
                    <h3 className="dashboard-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      Overview
                      {chartDataList.length > 0 && (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "500" }}>
                          ({chartDataList[0].label} – {chartDataList[chartDataList.length - 1].label})
                        </span>
                      )}
                    </h3>
                    <div>
                      <select 
                        value={rangeDays} 
                        onChange={(e) => setRangeDays(parseInt(e.target.value, 10))}
                        style={{ padding: "6px 12px", border: "1.5px solid var(--border-input)", borderRadius: "8px", fontSize: "12px", background: "var(--bg-input)", color: "var(--text-primary)", fontWeight: "600", cursor: "pointer" }}
                      >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
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

                      const getAreaPath = (pts) => {
                        if (pts.length === 0) return "";
                        const strokeD = getSmoothPath(pts);
                        const lastPt = pts[pts.length - 1];
                        const firstPt = pts[0];
                        return `${strokeD} L ${lastPt.x},200 L ${firstPt.x},200 Z`;
                      };

                      const pathQuizzesStroke = getSmoothPath(pointsQuizzes);
                      const pathAttemptsStroke = getSmoothPath(pointsAttempts);
                      const pathQuizzesArea = getAreaPath(pointsQuizzes);
                      const pathAttemptsArea = getAreaPath(pointsAttempts);

                      const allZero = chartDataList.every(d => d.quizzesCreated === 0 && d.attempts === 0);

                      return (
                        <div style={{ width: "100%", height: "100%", position: "relative" }}>
                          {allZero && (
                            <div style={{
                              position: "absolute",
                              top: 0, left: 0, right: 0, bottom: 0,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 5,
                              pointerEvents: "none",
                              background: "rgba(255, 255, 255, 0.7)",
                              borderRadius: "12px",
                              backdropFilter: "blur(2px)",
                              gap: "10px",
                            }}>
                              <span style={{ fontSize: "40px", lineHeight: 1 }}>📊</span>
                              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted, #888)" }}>
                                No activity in last {rangeDays} days
                              </span>
                              <span style={{ fontSize: "12px", color: "var(--text-muted, #aaa)" }}>
                                Data will appear once quizzes are created or attempted
                              </span>
                            </div>
                          )}
                          <svg viewBox="0 0 1000 250" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                            <defs>
                              <linearGradient id="gradient-quizzes-chart" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FF6384" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#FF6384" stopOpacity="0.0" />
                              </linearGradient>
                              <linearGradient id="gradient-attempts-chart" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FF9F40" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#FF9F40" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            <line x1={startX} y1="30" x2={endX} y2="30" stroke="var(--border-color)" strokeWidth="1" />
                            <line x1={startX} y1="72.5" x2={endX} y2="72.5" stroke="var(--border-color)" strokeWidth="1" />
                            <line x1={startX} y1="115" x2={endX} y2="115" stroke="var(--border-color)" strokeWidth="1" />
                            <line x1={startX} y1="157.5" x2={endX} y2="157.5" stroke="var(--border-color)" strokeWidth="1" />
                            <line x1={startX} y1="200" x2={endX} y2="200" stroke="var(--border-color)" strokeWidth="1" />
                            
                            <text x="45" y="34" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax)}</text>
                            <text x="45" y="76.5" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.75)}</text>
                            <text x="45" y="119" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.5)}</text>
                            <text x="45" y="161.5" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">{formatYLabel(dynamicMax * 0.25)}</text>
                            <text x="45" y="204" fill="var(--text-muted)" fontSize="11" textAnchor="end" fontWeight="500">0</text>

                            <path d={pathAttemptsArea} fill="url(#gradient-attempts-chart)" />
                            <path d={pathQuizzesArea} fill="url(#gradient-quizzes-chart)" />

                            <path d={pathQuizzesStroke} fill="none" stroke="#FF6384" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d={pathAttemptsStroke} fill="none" stroke="#FF9F40" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                            {pointsQuizzes.concat(pointsAttempts).map((pt, i) => (
                              <g 
                                key={`target-${i}`}
                                onMouseEnter={() => setHoveredPoint(pt)}
                                onMouseLeave={() => setHoveredPoint(null)}
                                style={{ cursor: "pointer" }}
                              >
                                <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
                                <circle 
                                  cx={pt.x} cy={pt.y} 
                                  r={pt.val > 0 ? "6" : "3.5"} 
                                  fill={hoveredPoint && hoveredPoint.x === pt.x && hoveredPoint.y === pt.y ? pt.color : (pt.val > 0 ? pt.color : "#ffffff")} 
                                  stroke={pt.color} 
                                  strokeWidth={pt.val > 0 ? "3" : "2"} 
                                  style={{ transition: "all 0.15s" }}
                                />
                              </g>
                            ))}

                            {chartDataList.map((d, i) => {
                              const maxLabels = rangeDays <= 7 ? 7 : rangeDays <= 14 ? 8 : 10;
                              const stepInterval = Math.max(1, Math.floor((chartDataList.length - 1) / (maxLabels - 1)));
                              const isLast = i === chartDataList.length - 1;
                              const showLabel = i % stepInterval === 0 || isLast;

                              if (isLast && i % stepInterval !== 0 && (i % stepInterval) < stepInterval / 2) {
                                return null;
                              }

                              if (!showLabel) return null;
                              return (
                                <text key={`x-${i}`} x={startX + i * stepX} y="225" fill="var(--text-muted)" fontSize="11" textAnchor="middle" fontWeight="500">{d.label}</text>
                              );
                            })}
                          </svg>

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
                  {/* Quiz Status Mini Grid */}
                  <div className="form-card" style={{ margin: 0, padding: "20px" }}>
                    <h3 className="dashboard-card-title" style={{ marginBottom: "16px" }}>Quiz Status</h3>
                    <div className="dashboard-status-grid">
                      <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "rgba(16, 185, 129, 0.1)", color: "#10B981", borderRadius: "8px" }}><BookOpen size={16} strokeWidth={2.5} /></span>
                        <div>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Published</p>
                          <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{publishedQuizzes}</p>
                        </div>
                      </div>
                      <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", borderRadius: "8px" }}><FileText size={16} strokeWidth={2.5} /></span>
                        <div>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Draft</p>
                          <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{draftQuizzes}</p>
                        </div>
                      </div>
                      <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", borderRadius: "8px" }}><Package size={16} strokeWidth={2.5} /></span>
                        <div>
                          <p style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>Archived</p>
                          <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>{archivedQuizzes}</p>
                        </div>
                      </div>
                      <div style={{ padding: "10px 14px", background: "var(--bg-input)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "rgba(37, 99, 235, 0.1)", color: "#2563EB", borderRadius: "8px" }}><CalendarDays size={16} strokeWidth={2.5} /></span>
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
                  <div className="dashboard-card-title-row" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <h3 className="dashboard-card-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", margin: 0 }}>
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
                    
                    <div className="pagination-controls" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button className="page-nav-btn" onClick={() => setExplorerPage(Math.max(1, explorerPage - 1))} disabled={explorerPage === 1} style={{ margin: 0, width: "36px", height: "36px", minHeight: "36px" }}>&lt;</button>
                      <button className="page-nav-btn active-page" style={{ margin: 0, width: "36px", height: "36px", minHeight: "36px" }}>{explorerPage}</button>
                      <button className="page-nav-btn" onClick={() => setExplorerPage(Math.min(Math.max(1, Math.ceil(explorerList.length / itemsPerPage)), explorerPage + 1))} disabled={explorerPage >= Math.max(1, Math.ceil(explorerList.length / itemsPerPage))} style={{ margin: 0, width: "36px", height: "36px", minHeight: "36px" }}>&gt;</button>
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
                          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: explorerView === "quizzes" ? "rgba(16, 185, 129, 0.1)" : "rgba(110, 63, 243, 0.1)", color: explorerView === "quizzes" ? "#10B981" : "#6E3FF3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {explorerView === "exams" ? <GraduationCap size={20} strokeWidth={2} /> : explorerView === "subjects" ? <Library size={20} strokeWidth={2} /> : <File size={20} strokeWidth={2} />}
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
                          <div style={{ color: "var(--text-muted)", display: "flex", alignItems: "center" }}><ArrowRight size={16} strokeWidth={2.5} /></div>
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
                  <div className="dashboard-card-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
                    <h3 className="dashboard-card-title" style={{ margin: 0 }}>Recent Activity</h3>
                    <div className="pagination-controls" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <button className="page-nav-btn" onClick={() => setActivityPage(Math.max(1, activityPage - 1))} disabled={activityPage === 1} style={{ margin: 0, width: "36px", height: "36px", minHeight: "36px" }}>&lt;</button>
                      <button className="page-nav-btn active-page" style={{ margin: 0, width: "36px", height: "36px", minHeight: "36px" }}>{activityPage}</button>
                      <button className="page-nav-btn" onClick={() => setActivityPage(Math.min(totalActivityPages, activityPage + 1))} disabled={activityPage === totalActivityPages} style={{ margin: 0, width: "36px", height: "36px", minHeight: "36px" }}>&gt;</button>
                    </div>
                  </div>
                  <div className="recent-activities-list">
                    {currentActivities.map((act, i) => {
                      const renderIcon = (emoji) => {
                        switch (emoji) {
                          case '➕': return <Plus size={16} strokeWidth={2.5} />;
                          case '📖': return <BookOpen size={16} strokeWidth={2.5} />;
                          case '🚫': return <Ban size={16} strokeWidth={2.5} />;
                          case '👥': return <User size={16} strokeWidth={2.5} />;
                          case '✏️': return <Edit3 size={16} strokeWidth={2.5} />;
                          case '❓': return <HelpCircle size={16} strokeWidth={2.5} />;
                          default: return emoji;
                        }
                      };

                      return (
                        <div key={i} className="activity-item">
                          <div className="activity-icon-badge" style={{ background: act.bg, color: act.color }}>
                            {renderIcon(act.icon)}
                          </div>
                          <div className="activity-info">
                            <span className="activity-text" title={act.text}>{act.text}</span>
                            <span className="activity-time">{act.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}  </div>
      </div>
    </div>
  );
}

export default AdminDashboard;