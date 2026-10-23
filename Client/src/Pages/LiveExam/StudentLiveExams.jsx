import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  Radio,
  Zap,
  Clock,
  Calendar,
  Award,
  CheckCircle2,
  Video,
  ArrowRight,
  Search,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Play,
  HelpCircle,
  Layers,
  Hourglass,
  ChevronRight,
  X,
  ShieldAlert,
} from "lucide-react";
import StudentSidebar from "../../components/StudentSidebar";
import StudentNavbar from "../../components/StudentNavbar";
import "../../css/LiveExam.css";
import "../../css/StudentDashboard.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

function StudentLiveExams() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [exams, setExams] = useState([]);
  const [counts, setCounts] = useState({ all: 0, live: 0, upcoming: 0, completed: 0, myAttempts: 0 });

  // Filtering & Tab state
  const [activeTab, setActiveTab] = useState("all"); // "all" | "live" | "upcoming" | "completed" | "myAttempts"
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExamCategory, setSelectedExamCategory] = useState("all");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchLiveExamsFeed = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const res = await axios.get(`${API_BASE}/api/live-exams/student-feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setExams(res.data?.exams || []);
      if (res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch (err) {
      console.error("Failed to load student live exams feed:", err);
      setError(err.response?.data?.message || "Failed to load live examinations. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLiveExamsFeed();
  }, [fetchLiveExamsFeed]);

  // Extract unique categories (e.g., BPSC, CTET, UPTET)
  const categories = ["all", ...new Set(exams.map((e) => e.examName).filter(Boolean))];

  // Filter exams based on active tab, search, and category
  const filteredExams = exams.filter((exam) => {
    // 1. Tab filter
    if (activeTab === "live" && exam.status !== "live" && exam.status !== "lobby") return false;
    if (activeTab === "upcoming" && exam.status !== "scheduled") return false;
    if (activeTab === "completed" && exam.status !== "completed") return false;
    if (activeTab === "myAttempts" && !exam.myAttempt) return false;

    // 2. Category filter
    if (selectedExamCategory !== "all" && exam.examName !== selectedExamCategory) return false;

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = (exam.title || "").toLowerCase().includes(q);
      const matchSubject = (exam.subject || "").toLowerCase().includes(q);
      const matchExamName = (exam.examName || "").toLowerCase().includes(q);
      return matchTitle || matchSubject || matchExamName;
    }

    return true;
  });

  const formatScheduleRange = (startStr, endStr) => {
    if (!startStr) return "Schedule not available";
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : null;

    const dateFormatted = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const startTime = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endTime = end ? end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

    return `${dateFormatted} • ${startTime}${endTime ? ` – ${endTime}` : ""}`;
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />

      <div className="sd-main-content">
        <StudentNavbar title="Live Examinations" />

        <div 
          className="sd-content" 
          style={{ 
            padding: isMobile ? "16px 14px 60px" : "24px 32px 80px", 
            maxWidth: "100%", 
            margin: "0", 
            width: "100%", 
            boxSizing: "border-box" 
          }}
        >
          
          {/* Hero Banner Card */}
          <div
            className="live-card"
            style={{
              padding: isMobile ? "20px 16px" : "28px 24px",
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.16) 0%, rgba(30, 27, 75, 0.35) 100%)",
              border: "1.5px solid rgba(139, 92, 246, 0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "rgba(124, 58, 237, 0.25)",
                    border: "1px solid var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary)",
                  }}
                >
                  <Radio size={24} />
                </div>
                <div>
                  <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0, color: "var(--text-primary)" }}>
                    Live Examinations
                  </h1>
                  <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                    Compete in real-time with candidates. Synchronized timers, webcam proctoring, and rank analytics.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchLiveExamsFeed(true)}
                disabled={refreshing}
                className="live-btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", fontSize: "13px" }}
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                <span>{refreshing ? "Refreshing..." : "Refresh Feed"}</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: counts.live > 0 ? "#ef4444" : "var(--text-secondary)", boxShadow: counts.live > 0 ? "0 0 8px #ef4444" : "none" }} />
                <span style={{ color: "var(--text-secondary)" }}>Active Live:</span>
                <strong style={{ color: counts.live > 0 ? "#ef4444" : "var(--text-primary)" }}>{counts.live} Ongoing</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <Calendar size={14} color="#3b82f6" />
                <span style={{ color: "var(--text-secondary)" }}>Upcoming:</span>
                <strong style={{ color: "var(--text-primary)" }}>{counts.upcoming} Scheduled</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <Award size={14} color="#10b981" />
                <span style={{ color: "var(--text-secondary)" }}>My Attempts:</span>
                <strong style={{ color: "var(--text-primary)" }}>{counts.myAttempts} Exams</strong>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
              marginBottom: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`live-tab-btn ${activeTab === "all" ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                border: activeTab === "all" ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
                backgroundColor: activeTab === "all" ? "rgba(124, 58, 237, 0.15)" : "var(--bg-card)",
                color: activeTab === "all" ? "var(--primary)" : "var(--text-secondary)",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Layers size={16} />
              <span>All Exams</span>
              <span style={{ fontSize: "11px", opacity: 0.8, background: "rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: "10px" }}>{counts.all}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("live")}
              className={`live-tab-btn ${activeTab === "live" ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                border: activeTab === "live" ? "1.5px solid #ef4444" : "1px solid var(--border-color)",
                backgroundColor: activeTab === "live" ? "rgba(239, 68, 68, 0.15)" : "var(--bg-card)",
                color: activeTab === "live" ? "#ef4444" : "var(--text-secondary)",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Zap size={16} color={counts.live > 0 ? "#ef4444" : "currentColor"} />
              <span>Live Now</span>
              <span style={{ fontSize: "11px", opacity: 0.9, background: counts.live > 0 ? "rgba(239, 68, 68, 0.25)" : "rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: "10px" }}>{counts.live}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("upcoming")}
              className={`live-tab-btn ${activeTab === "upcoming" ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                border: activeTab === "upcoming" ? "1.5px solid #3b82f6" : "1px solid var(--border-color)",
                backgroundColor: activeTab === "upcoming" ? "rgba(59, 130, 246, 0.15)" : "var(--bg-card)",
                color: activeTab === "upcoming" ? "#3b82f6" : "var(--text-secondary)",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Calendar size={16} />
              <span>Upcoming</span>
              <span style={{ fontSize: "11px", opacity: 0.8, background: "rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: "10px" }}>{counts.upcoming}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`live-tab-btn ${activeTab === "completed" ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                border: activeTab === "completed" ? "1.5px solid #10b981" : "1px solid var(--border-color)",
                backgroundColor: activeTab === "completed" ? "rgba(16, 185, 129, 0.15)" : "var(--bg-card)",
                color: activeTab === "completed" ? "#10b981" : "var(--text-secondary)",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <CheckCircle2 size={16} />
              <span>Concluded</span>
              <span style={{ fontSize: "11px", opacity: 0.8, background: "rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: "10px" }}>{counts.completed}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("myAttempts")}
              className={`live-tab-btn ${activeTab === "myAttempts" ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: "600",
                cursor: "pointer",
                border: activeTab === "myAttempts" ? "1.5px solid #f59e0b" : "1px solid var(--border-color)",
                backgroundColor: activeTab === "myAttempts" ? "rgba(245, 158, 11, 0.15)" : "var(--bg-card)",
                color: activeTab === "myAttempts" ? "#d97706" : "var(--text-secondary)",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <Award size={16} />
              <span>My Attempts</span>
              <span style={{ fontSize: "11px", opacity: 0.8, background: "rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: "10px" }}>{counts.myAttempts}</span>
            </button>
          </div>

          {/* Search & Category Filter Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
              <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search live exams by title, exam, or subject..."
                style={{
                  width: "100%",
                  padding: "10px 38px 10px 40px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Exam Categories Filter Pills */}
            {categories.length > 2 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto" }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedExamCategory(cat)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      border: selectedExamCategory === cat ? "1.5px solid var(--primary)" : "1px solid var(--border-color)",
                      backgroundColor: selectedExamCategory === cat ? "rgba(124, 58, 237, 0.15)" : "transparent",
                      color: selectedExamCategory === cat ? "var(--primary)" : "var(--text-secondary)",
                      textTransform: cat === "all" ? "capitalize" : "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cat === "all" ? "All Targets" : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div className="loader" style={{ width: "42px", height: "42px", border: "4px solid var(--primary)", borderBottomColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "rotation 1s linear infinite" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading live examinations...</p>
            </div>
          ) : error ? (
            <div className="live-card" style={{ textAlign: "center", padding: "40px 20px", borderColor: "rgba(239, 68, 68, 0.3)" }}>
              <AlertCircle size={40} color="#ef4444" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>Failed to Load Live Exams</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "18px" }}>{error}</p>
              <button type="button" onClick={() => fetchLiveExamsFeed()} className="live-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <RefreshCw size={15} /> Try Again
              </button>
            </div>
          ) : filteredExams.length === 0 ? (
            /* Empty State */
            <div className="live-card" style={{ textAlign: "center", padding: "50px 24px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(124, 58, 237, 0.1)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                {activeTab === "live" ? <Zap size={28} /> : activeTab === "upcoming" ? <Calendar size={28} /> : activeTab === "myAttempts" ? <Award size={28} /> : <Layers size={28} />}
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px" }}>
                {activeTab === "live"
                  ? "No Live Examinations Currently Active"
                  : activeTab === "upcoming"
                  ? "No Upcoming Live Examinations Scheduled"
                  : activeTab === "myAttempts"
                  ? "You Haven't Attempted Any Live Exams Yet"
                  : "No Live Examinations Found"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", maxWidth: "420px", margin: "0 auto 20px", lineHeight: "1.6" }}>
                {searchQuery
                  ? `No exams matched "${searchQuery}". Try a different keyword.`
                  : activeTab === "live"
                  ? "There are no exams running right now. Check out the upcoming schedule to prepare!"
                  : activeTab === "myAttempts"
                  ? "Browse upcoming live exams and join them to benchmark your performance on the leaderboard."
                  : "Check back soon for new live examination schedules."}
              </p>
              {activeTab !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    setSearchQuery("");
                    setSelectedExamCategory("all");
                  }}
                  className="live-btn-secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <Layers size={15} /> View All Examinations
                </button>
              )}
            </div>
          ) : (
            /* Live Exam Cards Grid */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "280px" : "330px"}, 1fr))`,
                gap: isMobile ? "14px" : "20px",
              }}
            >
              {filteredExams.map((exam) => {
                const isLive = exam.status === "live";
                const isLobby = exam.status === "lobby";
                const isCompleted = exam.status === "completed";
                const isScheduled = exam.status === "scheduled";

                const hasAttempt = Boolean(exam.myAttempt);
                const attemptStatus = exam.myAttempt?.status;
                const isInProgress = !isCompleted && attemptStatus === "in_progress";
                const isSubmitted =
                  attemptStatus === "submitted" ||
                  attemptStatus === "auto_submitted" ||
                  (isCompleted && hasAttempt && Boolean(exam.myAttempt?.resultId));

                return (
                  <div
                    key={exam._id}
                    className="live-card"
                    style={{
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      border: isLive
                        ? "1.5px solid rgba(239, 68, 68, 0.5)"
                        : isLobby
                        ? "1.5px solid rgba(245, 158, 11, 0.5)"
                        : "1px solid var(--border-color)",
                      boxShadow: isLive ? "0 8px 30px rgba(239, 68, 68, 0.15)" : "var(--shadow)",
                      transition: "all 0.2s ease",
                      position: "relative",
                    }}
                  >
                    <div>
                      {/* Card Header Badge & Target */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                        {isLive ? (
                          <span className="live-badge live-badge-live" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Radio size={14} /> LIVE NOW
                          </span>
                        ) : isLobby ? (
                          <span className="live-badge live-badge-lobby" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Hourglass size={14} /> LOBBY OPEN
                          </span>
                        ) : isCompleted ? (
                          <span className="live-badge live-badge-completed" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle2 size={14} /> CONCLUDED
                          </span>
                        ) : (
                          <span className="live-badge live-badge-scheduled" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={14} /> UPCOMING
                          </span>
                        )}

                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
                          {exam.examName} · {exam.subject}
                        </span>
                      </div>

                      {/* Exam Title */}
                      <h3
                        style={{
                          fontSize: "17px",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          lineHeight: "1.4",
                          marginBottom: "10px",
                        }}
                      >
                        {exam.title}
                      </h3>

                      {/* Schedule Range */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          marginBottom: "16px",
                        }}
                      >
                        <Calendar size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                        <span>{formatScheduleRange(exam.scheduledStartTime, exam.scheduledEndTime)}</span>
                      </div>

                      {/* Meta Chips */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                          marginBottom: "18px",
                          padding: "12px 14px",
                          borderRadius: "12px",
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px" }}>
                          <Clock size={15} color="var(--primary)" />
                          <span><strong>{exam.duration}</strong> Mins</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px" }}>
                          <HelpCircle size={15} color="#3b82f6" />
                          <span><strong>{exam.totalQuestions || "—"}</strong> Questions</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px" }}>
                          <Award size={15} color="#10b981" />
                          <span>+{exam.marksPerQuestion} / -{exam.negativeMarking}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px" }}>
                          <Video size={15} color={exam.webcamRule === "mandatory" ? "#ef4444" : "var(--text-secondary)"} />
                          <span style={{ textTransform: "capitalize" }}>{exam.webcamRule === "mandatory" ? "Camera Req." : "Camera Off"}</span>
                        </div>
                      </div>

                      {/* Personal Attempt Banner (if participated) */}
                      {hasAttempt && (
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            marginBottom: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: isInProgress
                              ? "rgba(16, 185, 129, 0.12)"
                              : isSubmitted
                              ? "rgba(59, 130, 246, 0.12)"
                              : "rgba(255, 255, 255, 0.05)",
                            color: isInProgress ? "#10b981" : isSubmitted ? "#3b82f6" : "var(--text-secondary)",
                            border: `1px solid ${isInProgress ? "rgba(16, 185, 129, 0.3)" : isSubmitted ? "rgba(59, 130, 246, 0.3)" : "var(--border-color)"}`,
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            {isInProgress ? <Play size={13} /> : <CheckCircle2 size={13} />}
                            {isInProgress
                              ? "Attempt In Progress"
                              : isSubmitted
                              ? "Submitted Successfully"
                              : isCompleted
                              ? "Examination Concluded"
                              : "Registered"}
                          </span>
                          {isSubmitted && exam.myAttempt?.resultId && (
                            <span style={{ fontSize: "11px", textDecoration: "underline" }}>Results Available</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Action CTA */}
                    <div style={{ marginTop: "12px" }}>
                      {isInProgress ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/live-exam/play/${exam.myAttempt.attemptId}`)}
                          className="live-btn-primary"
                          style={{
                            width: "100%",
                            background: "#10b981",
                            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                          }}
                        >
                          <Play size={16} /> Resume Examination <ArrowRight size={16} />
                        </button>
                      ) : isSubmitted ? (
                        exam.myAttempt?.resultId ? (
                          <Link
                            to={`/result/${exam.myAttempt.resultId}`}
                            className="live-btn-primary"
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              textDecoration: "none",
                              boxSizing: "border-box",
                            }}
                          >
                            <Award size={16} /> View Result & Analysis <ArrowRight size={16} />
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="live-btn-secondary"
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "8px",
                              opacity: 0.85,
                            }}
                          >
                            <CheckCircle2 size={16} color="#10b981" /> Submitted (Results Scheduled)
                          </button>
                        )
                      ) : isLive ? (
                        <Link
                          to={`/live-exam/${exam.shareSlug || exam.shareToken}`}
                          className="live-btn-primary"
                          style={{
                            width: "100%",
                            background: "#ef4444",
                            boxShadow: "0 4px 16px rgba(239, 68, 68, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            textDecoration: "none",
                            boxSizing: "border-box",
                          }}
                        >
                          <Zap size={16} /> Join Examination Now <ArrowRight size={16} />
                        </Link>
                      ) : isLobby ? (
                        <Link
                          to={`/live-exam/${exam.shareSlug || exam.shareToken}`}
                          className="live-btn-primary"
                          style={{
                            width: "100%",
                            background: "#d97706",
                            boxShadow: "0 4px 14px rgba(217, 119, 6, 0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            textDecoration: "none",
                            boxSizing: "border-box",
                          }}
                        >
                          <Hourglass size={16} /> Enter Lobby Readiness <ArrowRight size={16} />
                        </Link>
                      ) : isScheduled ? (
                        <Link
                          to={`/live-exam/${exam.shareSlug || exam.shareToken}`}
                          className="live-btn-secondary"
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            textDecoration: "none",
                            boxSizing: "border-box",
                          }}
                        >
                          <Calendar size={16} /> View Lobby & Syllabus <ChevronRight size={16} />
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="live-btn-secondary"
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            opacity: 0.6,
                            cursor: "not-allowed",
                          }}
                        >
                          <CheckCircle2 size={16} /> Examination Concluded
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentLiveExams;
