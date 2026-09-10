import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { 
  Info, FileText, Calendar, Search, ChevronDown, ChevronRight, ChevronUp,
  Trophy, Users, CheckCircle, Percent, User, Crown, Sparkles, ArrowRight, X, BookOpen
} from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/Leaderboard.css";

function Leaderboard() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState("All Exams");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("All Time"); // "Weekly" | "All Time"
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllMobile, setShowAllMobile] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [examSearchQuery, setExamSearchQuery] = useState("");
  const [selectedStudentModal, setSelectedStudentModal] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentUserStr = localStorage.getItem("user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/results/leaderboard`);
        setResults(res.data);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const uniqueExams = Array.from(new Set(results.map(r => r.examName || r.quizTitle || r.subject || "Mock Test")));

  // Filter logic
  const filteredResults = results.filter(r => {
    const examMatch = selectedExam === "All Exams" || (r.examName || r.quizTitle || r.subject || "Mock Test") === selectedExam;
    const nameMatch = (r.userId?.fullName || r.userId?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    let timeMatch = true;
    if (timeFilter === "Weekly" && r.createdAt) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      timeMatch = new Date(r.createdAt) >= oneWeekAgo;
    }
    
    return examMatch && nameMatch && timeMatch;
  });

  // Fallback for Weekly tab if results are sparse
  const displayResults = (timeFilter === "Weekly" && filteredResults.length < 3) 
    ? results.filter(r => {
        const examMatch = selectedExam === "All Exams" || (r.examName || r.quizTitle || r.subject || "Mock Test") === selectedExam;
        const nameMatch = (r.userId?.fullName || r.userId?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
        return examMatch && nameMatch;
      })
    : filteredResults;

  // Rank & Percentile for current logged in user
  const userRankIndex = displayResults.findIndex(r => 
    r.userId && (r.userId._id === currentUser?.id || r.userId._id === currentUser?._id || r.userId === currentUser?.id || r.userId === currentUser?._id)
  );
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;
  const userStat = userRankIndex >= 0 ? displayResults[userRankIndex] : null;

  const totalPlayersCount = displayResults.length;
  let performancePercentile = 0;
  if (userRank && totalPlayersCount > 0) {
    if (totalPlayersCount === 1) {
      performancePercentile = 100;
    } else {
      performancePercentile = Math.round(((totalPlayersCount - userRank) / (totalPlayersCount - 1 || 1)) * 100);
      if (performancePercentile < 15) performancePercentile = 20;
    }
  }

  // Format percentage decimals cleanly (e.g. 6.7% instead of 6.666666666666667%)
  const formatPercent = (val) => {
    if (val === undefined || val === null || isNaN(val)) return "0%";
    const num = Number(val);
    return `${Number.isInteger(num) ? num : num.toFixed(1)}%`;
  };

  // Helper to format item date
  const formatDateStr = (dateVal) => {
    if (!dateVal) return "Recent";
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? "Recent" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Top 3 Podium spots
  const podiumRaw = displayResults.slice(0, 3);
  const getPodiumSpot = (index, rankNum) => {
    const item = podiumRaw[index];
    if (!item) return null;
    const name = item.userId?.fullName || item.userId?.name || "User";
    const scoreVal = `${item.score} / ${item.total}`;
    const ptsVal = `${item.score} / ${item.total}`;
    const accuracy = item.correct !== undefined 
      ? `${Math.round((item.correct / (item.correct + item.incorrect || 1)) * 100)}%` 
      : formatPercent(item.percentage);
    const avatar = item.userId?.avatar || null;
    const isYou = item.userId && (item.userId._id === currentUser?.id || item.userId === currentUser?.id || item.userId._id === currentUser?._id);
    const quizTitle = item.quizTitle || item.examName || "Mock Test";
    const examName = item.examName || item.quizTitle || "Exam Series";
    const subject = item.subject || "General";
    const date = formatDateStr(item.createdAt);

    return { 
      rank: rankNum, name, score: scoreVal, pts: ptsVal, accuracy, percentile: formatPercent(item.percentage), 
      avatar, isYou, quizTitle, examName, subject, date, rawResult: item 
    };
  };

  const spot1 = getPodiumSpot(0, 1);
  const spot2 = getPodiumSpot(1, 2);
  const spot3 = getPodiumSpot(2, 3);

  // Desktop Table Sizing & Expandability (Top 10 default, expanded to full list)
  const DESKTOP_ITEMS_PER_PAGE = isDesktopExpanded ? 15 : 7; // 7 rows + 3 podium = 10 total users visible by default!
  const studentsForTable = isDesktopExpanded ? displayResults.slice(3) : displayResults.slice(3, 10);
  const totalPages = isDesktopExpanded ? Math.ceil(studentsForTable.length / DESKTOP_ITEMS_PER_PAGE) : 1;
  const startIndex = (currentPage - 1) * DESKTOP_ITEMS_PER_PAGE;

  const desktopTableData = studentsForTable.slice(startIndex, startIndex + DESKTOP_ITEMS_PER_PAGE).map((r, idx) => ({
    rank: (isDesktopExpanded ? startIndex : 0) + idx + 4,
    name: r.userId?.fullName || r.userId?.name || "User",
    isYou: r.userId && (r.userId._id === currentUser?.id || r.userId === currentUser?.id || r.userId._id === currentUser?._id),
    score: `${r.score} / ${r.total}`,
    accuracy: `${Math.round((r.correct / (r.correct + r.incorrect || 1)) * 100) || 0}%`,
    percentile: formatPercent(r.percentage !== undefined ? r.percentage : (r.score / r.total) * 100),
    avatar: r.userId?.avatar || null,
    quizTitle: r.quizTitle || r.examName || "Mock Test",
    examName: r.examName || r.quizTitle || "Exam Series",
    subject: r.subject || "General",
    date: formatDateStr(r.createdAt),
    rawResult: r
  }));

  // Mobile Top Players List (Top 4 to 10 or all if expanded)
  const mobileListResults = showAllMobile ? displayResults.slice(3) : displayResults.slice(3, 10);

  const isUserInTop3 = userRankIndex >= 0 && userRankIndex < 3;
  const isUserInVisibleList = userRankIndex >= 3 && (showAllMobile || userRankIndex < 10);
  const showUserStickyBar = userRank && !isUserInTop3 && !isUserInVisibleList;

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Leaderboard" />
        <div className="lb-container">

          {/* ═════════════════════════════════════════════════════════════
              📱 MOBILE-FIRST REDESIGNED VIEW (Max-Width 767px)
             ═════════════════════════════════════════════════════════════ */}
          <div className="lb-mobile-view">
            
            {/* Search & Exam Dropdown Filters Header Row */}
            <div className="lb-mobile-filter-bar">
              {/* Exam Selector Dropdown */}
              <div className="lb-dropdown-container" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="lb-filter-select-mob"
                >
                  <span className="lb-dropdown-label-text">{selectedExam}</span>
                  <ChevronDown size={15} style={{ flexShrink: 0, transition: "transform 0.2s", transform: isDropdownOpen ? "rotate(180deg)" : "none" }} />
                </button>

                {isDropdownOpen && (
                  <div className="lb-dropdown-popover">
                    <div className="lb-dropdown-search-wrap">
                      <Search size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="Search exams..."
                        value={examSearchQuery}
                        onChange={(e) => setExamSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="lb-dropdown-scroll-list">
                      <button
                        type="button"
                        className={`lb-dropdown-opt ${selectedExam === "All Exams" ? "active" : ""}`}
                        onClick={() => {
                          setSelectedExam("All Exams");
                          setIsDropdownOpen(false);
                          setExamSearchQuery("");
                          setCurrentPage(1);
                        }}
                      >
                        All Exams
                      </button>
                      {uniqueExams
                        .filter(exam => String(exam || "").toLowerCase().includes(examSearchQuery.toLowerCase()))
                        .map((exam, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`lb-dropdown-opt ${selectedExam === exam ? "active" : ""}`}
                            onClick={() => {
                              setSelectedExam(exam);
                              setIsDropdownOpen(false);
                              setExamSearchQuery("");
                              setCurrentPage(1);
                            }}
                          >
                            {exam}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Student Search Bar */}
              <div className="lb-search-mob">
                <Search size={15} className="lb-search-icon-mob" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            {/* HERO CARD */}
            <div className="lb-mobile-hero-card">
              <div className="lb-hero-top-row">
                <div>
                  <span className="lb-hero-tag">TOP PERFORMERS</span>
                  <h2 className="lb-hero-title">Compete. Improve. Grow.</h2>
                </div>
                <div className="lb-hero-trophy-badge">
                  <Trophy size={28} className="lb-hero-trophy-icon" />
                </div>
              </div>

              {/* User Performance Motivational Banner */}
              <div className="lb-perf-banner">
                <div className="lb-perf-crown-box">🏆</div>
                <div className="lb-perf-text">
                  {userRank ? (
                    <>You are doing better than <strong>{performancePercentile}%</strong> of other players!</>
                  ) : (
                    <>Attempt tests to see your global performance ranking!</>
                  )}
                </div>
              </div>

              {/* STEPPED TOP 3 PODIUM */}
              <div className="lb-mobile-podium-container">
                {/* Spot #2 (Left) */}
                <div className="lb-pod-column spot-2" onClick={() => spot2 && setSelectedStudentModal(spot2)} style={{ cursor: spot2 ? "pointer" : "default" }}>
                  {spot2 ? (
                    <>
                      <div className="lb-pod-avatar-ring silver-ring">
                        {spot2.avatar ? (
                          <img src={spot2.avatar} alt={spot2.name} />
                        ) : (
                          <User size={20} color="var(--text-muted)" />
                        )}
                        <span className="lb-pod-badge silver">2</span>
                      </div>
                      <span className="lb-pod-name">{spot2.name}</span>
                      <span className="lb-pod-score">{spot2.pts}</span>
                      <div className="lb-pod-step step-2">
                        <span className="lb-pod-step-num">2</span>
                      </div>
                    </>
                  ) : (
                    <div className="lb-pod-empty">
                      <User size={20} color="var(--text-muted)" />
                      <div className="lb-pod-step step-2"><span>2</span></div>
                    </div>
                  )}
                </div>

                {/* Spot #1 (Center) */}
                <div className="lb-pod-column spot-1" onClick={() => spot1 && setSelectedStudentModal(spot1)} style={{ cursor: spot1 ? "pointer" : "default" }}>
                  {spot1 ? (
                    <>
                      <div className="lb-crown-floating">
                        <Crown size={22} fill="#FBBF24" color="#D97706" />
                      </div>
                      <div className="lb-pod-avatar-ring gold-ring">
                        {spot1.avatar ? (
                          <img src={spot1.avatar} alt={spot1.name} />
                        ) : (
                          <User size={24} color="var(--text-muted)" />
                        )}
                        <span className="lb-pod-badge gold">1</span>
                      </div>
                      <span className="lb-pod-name main-winner">{spot1.name}</span>
                      <span className="lb-pod-score main-pts">{spot1.pts}</span>
                      <div className="lb-pod-step step-1">
                        <span className="lb-pod-step-num">1</span>
                      </div>
                    </>
                  ) : (
                    <div className="lb-pod-empty">
                      <User size={24} color="var(--text-muted)" />
                      <div className="lb-pod-step step-1"><span>1</span></div>
                    </div>
                  )}
                </div>

                {/* Spot #3 (Right) */}
                <div className="lb-pod-column spot-3" onClick={() => spot3 && setSelectedStudentModal(spot3)} style={{ cursor: spot3 ? "pointer" : "default" }}>
                  {spot3 ? (
                    <>
                      <div className="lb-pod-avatar-ring bronze-ring">
                        {spot3.avatar ? (
                          <img src={spot3.avatar} alt={spot3.name} />
                        ) : (
                          <User size={20} color="var(--text-muted)" />
                        )}
                        <span className="lb-pod-badge bronze">3</span>
                      </div>
                      <span className="lb-pod-name">{spot3.name}</span>
                      <span className="lb-pod-score">{spot3.pts}</span>
                      <div className="lb-pod-step step-3">
                        <span className="lb-pod-step-num">3</span>
                      </div>
                    </>
                  ) : (
                    <div className="lb-pod-empty">
                      <User size={20} color="var(--text-muted)" />
                      <div className="lb-pod-step step-3"><span>3</span></div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* TOP PLAYERS COMPACT LIST */}
            <div className="lb-mobile-players-card">
              <div className="lb-players-card-header">
                <div className="lb-players-card-title">
                  <Crown size={18} className="lb-crown-accent-icon" />
                  <h3>Top Players</h3>
                </div>
                {displayResults.length > 10 && (
                  <button
                    type="button"
                    className="lb-view-toggle-btn"
                    onClick={() => setShowAllMobile(!showAllMobile)}
                  >
                    {showAllMobile ? "Show Top 10" : "View All →"}
                  </button>
                )}
              </div>

              <div className="lb-players-compact-list">
                {mobileListResults.length > 0 ? (
                  mobileListResults.map((r, idx) => {
                    const rankNum = 4 + idx;
                    const name = r.userId?.fullName || r.userId?.name || "User";
                    const isYou = r.userId && (r.userId._id === currentUser?.id || r.userId._id === currentUser?._id || r.userId === currentUser?.id || r.userId === currentUser?._id);
                    const pctVal = formatPercent(r.percentage !== undefined ? r.percentage : (r.score / r.total) * 100);
                    const ptsVal = `${r.score} / ${r.total}`;
                    const avatarUrl = r.userId?.avatar;

                    const itemDetails = {
                      rank: rankNum,
                      name,
                      isYou,
                      score: ptsVal,
                      accuracy: `${Math.round((r.correct / (r.correct + r.incorrect || 1)) * 100) || 0}%`,
                      percentile: pctVal,
                      avatar: avatarUrl,
                      quizTitle: r.quizTitle || r.examName || "Mock Test",
                      examName: r.examName || r.quizTitle || "Exam Series",
                      subject: r.subject || "General",
                      date: formatDateStr(r.createdAt),
                      rawResult: r
                    };

                    return (
                      <div 
                        key={r._id || idx} 
                        className={`lb-player-compact-row ${isYou ? "highlight-you" : ""}`}
                        onClick={() => setSelectedStudentModal(itemDetails)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="lb-row-rank-badge">{rankNum}</div>
                        <div className="lb-row-avatar-box">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={name} />
                          ) : (
                            <User size={16} color="var(--text-muted)" />
                          )}
                        </div>
                        <div className="lb-row-center-info">
                          <span className="lb-row-student-name">
                            {name} {isYou && <span className="lb-you-chip">(You)</span>}
                          </span>
                          <span className="lb-row-qp-points">
                            {ptsVal} • {itemDetails.quizTitle}
                          </span>
                        </div>
                        <div className="lb-row-pct-pill">{pctVal}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className="lb-empty-players-msg">No other top players yet</div>
                )}
              </div>
            </div>

            {/* YOUR RANK CARD (MOBILE) */}
            <div className="lb-card lb-rank-card lb-mobile-card">
              <div className="lb-card-header">
                <div className="lb-icon-box"><Trophy size={20} /></div>
                <h3>Your Rank</h3>
              </div>
              <h2 className="lb-rank-huge">#{userRank || "-"}</h2>
              <p className="lb-rank-msg">Great job! Keep improving. ✨</p>
              
              <div className="lb-stat-row">
                <div className="lb-stat-label"><FileText size={14} className="lb-icon" /> Score</div>
                <div className="lb-stat-value purple">{userStat ? `${userStat.score} / ${userStat.total}` : "-"}</div>
              </div>
              <div className="lb-stat-row">
                <div className="lb-stat-label"><Percent size={14} className="lb-icon" /> Percentile</div>
                <div className="lb-stat-value purple">{userStat ? formatPercent(userStat.percentage !== undefined ? userStat.percentage : (userStat.score / userStat.total) * 100) : "-"}</div>
              </div>
              <div className="lb-stat-row">
                <div className="lb-stat-label"><CheckCircle size={14} className="lb-icon" /> Accuracy</div>
                <div className="lb-stat-value purple">{userStat ? `${Math.round((userStat.correct / (userStat.correct + userStat.incorrect || 1)) * 100) || 0}%` : "-"}</div>
              </div>
              <div className="lb-stat-row">
                <div className="lb-stat-label"><Users size={14} className="lb-icon" /> Students</div>
                <div className="lb-stat-value purple">{displayResults.length}</div>
              </div>

              <button 
                className="lb-btn-primary"
                onClick={() => {
                  if (userStat) {
                    const targetId = userStat._id || userStat.shareId;
                    navigate(targetId ? `/result/${targetId}` : "/result", { state: userStat });
                  }
                }}
                disabled={!userStat}
              >
                View My Result <ChevronRight size={16} />
              </button>
            </div>

            {/* ABOUT THIS TEST CARD (MOBILE) */}
            <div className="lb-card lb-about-card lb-mobile-card">
              <div className="lb-card-header">
                <div className="lb-icon-box"><FileText size={20} /></div>
                <h3>About This Test</h3>
              </div>
              <div className="lb-stat-row">
                <div className="lb-stat-label"><Info size={14} className="lb-icon" /> Total Questions</div>
                <div className="lb-stat-value">150</div>
              </div>
              <div className="lb-stat-row">
                <div className="lb-stat-label"><Trophy size={14} className="lb-icon" /> Total Marks</div>
                <div className="lb-stat-value">150</div>
              </div>
              <div className="lb-stat-row">
                <div className="lb-stat-label"><Percent size={14} className="lb-icon" /> Negative Marking</div>
                <div className="lb-stat-value">No</div>
              </div>
              <div className="lb-stat-row">
                <div className="lb-stat-label"><Calendar size={14} className="lb-icon" /> Duration</div>
                <div className="lb-stat-value">150 Min</div>
              </div>
              <div className="lb-stat-row">
                <div className="lb-stat-label"><Calendar size={14} className="lb-icon" /> Completed On</div>
                <div className="lb-stat-value">12 May 2025</div>
              </div>
            </div>

            {/* STICKY / HIGHLIGHTED CURRENT USER RANK BAR (IF OUTSIDE VISIBLE LIST) */}
            {showUserStickyBar && userStat && (
              <div className="lb-user-sticky-rank-bar">
                <div className="lb-user-rank-number">#{userRank}</div>
                <div className="lb-user-avatar-small">
                  {userStat.userId?.avatar ? (
                    <img src={userStat.userId.avatar} alt="You" />
                  ) : (
                    <User size={16} color="var(--text-muted)" />
                  )}
                </div>
                <div className="lb-user-meta">
                  <span className="lb-user-label">Your Rank — #{userRank}</span>
                  <span className="lb-user-score-sub">{userStat.score} / {userStat.total} ({formatPercent(userStat.percentage)})</span>
                </div>
                <button
                  type="button"
                  className="lb-user-view-btn"
                  onClick={() => {
                    const targetId = userStat._id || userStat.shareId;
                    navigate(targetId ? `/result/${targetId}` : "/result", { state: userStat });
                  }}
                >
                  My Result <ChevronRight size={14} />
                </button>
              </div>
            )}

          </div>


          {/* ═════════════════════════════════════════════════════════════
              💻 DESKTOP-ONLY VIEW (Min-Width 768px)
             ═════════════════════════════════════════════════════════════ */}
          <div className="lb-desktop-view">
            
            {/* Desktop Header & Filters Combined */}
            <div className="lb-header" style={{ marginBottom: "20px", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginLeft: "auto" }}>
                <div className="lb-info-pill" style={{ margin: 0 }}>
                  <Info className="lb-info-icon" size={16} />
                  Updates every 10 mins.
                </div>
                
                {/* Desktop Searchable Custom Dropdown */}
                <div className="lb-dropdown-container" ref={dropdownRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="lb-filter-select"
                    style={{
                      margin: 0,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      minWidth: "180px",
                      height: "42px",
                      textAlign: "left",
                      background: "var(--bg-input, #ffffff)",
                      border: "1px solid var(--border-color, #E4E4E7)",
                      color: "var(--text-primary, #3F3F46)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                      {selectedExam}
                    </span>
                    <ChevronDown size={16} style={{ flexShrink: 0, transition: "transform 0.2s", transform: isDropdownOpen ? "rotate(180deg)" : "none" }} />
                  </button>

                  {isDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "46px",
                        right: 0,
                        background: "var(--bg-card, #ffffff)",
                        border: "1px solid var(--border-color, #E4E4E7)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
                        width: "250px",
                        padding: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        zIndex: 1000
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 10px",
                          border: "1px solid var(--border-color, #E4E4E7)",
                          borderRadius: "8px",
                          background: "var(--bg-input, #fafafa)"
                        }}
                      >
                        <Search size={14} style={{ color: "var(--text-muted, #71717a)", flexShrink: 0 }} />
                        <input
                          type="text"
                          placeholder="Search exams..."
                          value={examSearchQuery}
                          onChange={(e) => setExamSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            width: "100%",
                            fontSize: "13px",
                            color: "var(--text-primary, #1e1b4b)",
                            padding: 0
                          }}
                        />
                      </div>

                      <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExam("All Exams");
                            setIsDropdownOpen(false);
                            setExamSearchQuery("");
                            setCurrentPage(1);
                          }}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            border: "none",
                            borderRadius: "6px",
                            background: selectedExam === "All Exams" ? "var(--option-hover)" : "transparent",
                            color: selectedExam === "All Exams" ? "var(--violet, #6E3FF3)" : "var(--text-primary, #1e1b4b)",
                            fontSize: "13px",
                            fontWeight: selectedExam === "All Exams" ? "600" : "500",
                            cursor: "pointer"
                          }}
                        >
                          All Exams
                        </button>

                        {uniqueExams
                          .filter(exam => String(exam || "").toLowerCase().includes(examSearchQuery.toLowerCase()))
                          .map((exam, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setSelectedExam(exam);
                                setIsDropdownOpen(false);
                                setExamSearchQuery("");
                                setCurrentPage(1);
                              }}
                              style={{
                                padding: "8px 12px",
                                textAlign: "left",
                                border: "none",
                                borderRadius: "6px",
                                background: selectedExam === exam ? "var(--option-hover)" : "transparent",
                                color: selectedExam === exam ? "var(--violet, #6E3FF3)" : "var(--text-primary, #1e1b4b)",
                                fontSize: "13px",
                                fontWeight: selectedExam === exam ? "600" : "500",
                                cursor: "pointer"
                              }}
                            >
                              {exam}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="lb-search" style={{ margin: 0 }}>
                  <Search className="lb-icon" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search students" 
                    value={searchTerm} 
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  />
                </div>
              </div>
            </div>

            {/* Body Grid */}
            <div className="lb-body-grid">
              
              {/* Left Column */}
              <div className="lb-left-col">
                
                {/* Rank Card */}
                <div className="lb-card lb-rank-card">
                  <div className="lb-card-header">
                    <div className="lb-icon-box"><Trophy size={20} /></div>
                    <h3>Your Rank</h3>
                  </div>
                  <h2 className="lb-rank-huge">#{userRank || "-"}</h2>
                  <p className="lb-rank-msg">Great job! Keep improving. ✨</p>
                  
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><FileText size={14} className="lb-icon" /> Score</div>
                    <div className="lb-stat-value purple">{userStat ? `${userStat.score} / ${userStat.total}` : "-"}</div>
                  </div>
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><Percent size={14} className="lb-icon" /> Percentile</div>
                    <div className="lb-stat-value purple">{userStat ? formatPercent(userStat.percentage !== undefined ? userStat.percentage : (userStat.score / userStat.total) * 100) : "-"}</div>
                  </div>
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><CheckCircle size={14} className="lb-icon" /> Accuracy</div>
                    <div className="lb-stat-value purple">{userStat ? `${Math.round((userStat.correct / (userStat.correct + userStat.incorrect || 1)) * 100) || 0}%` : "-"}</div>
                  </div>
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><Users size={14} className="lb-icon" /> Students</div>
                    <div className="lb-stat-value purple">{displayResults.length}</div>
                  </div>

                  <button 
                    className="lb-btn-primary"
                    onClick={() => {
                      if (userStat) {
                        const targetId = userStat._id || userStat.shareId;
                        navigate(targetId ? `/result/${targetId}` : "/result", { state: userStat });
                      }
                    }}
                    disabled={!userStat}
                  >
                    View My Result <ChevronRight size={16} />
                  </button>
                </div>

                {/* About This Test Card */}
                <div className="lb-card lb-about-card">
                  <div className="lb-card-header">
                    <div className="lb-icon-box"><FileText size={20} /></div>
                    <h3>About This Test</h3>
                  </div>
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><Info size={14} className="lb-icon" /> Total Questions</div>
                    <div className="lb-stat-value">150</div>
                  </div>
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><Trophy size={14} className="lb-icon" /> Total Marks</div>
                    <div className="lb-stat-value">150</div>
                  </div>
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><Percent size={14} className="lb-icon" /> Negative Marking</div>
                    <div className="lb-stat-value">No</div>
                  </div>
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><Calendar size={14} className="lb-icon" /> Duration</div>
                    <div className="lb-stat-value">150 Min</div>
                  </div>
                  <div className="lb-stat-row">
                    <div className="lb-stat-label"><Calendar size={14} className="lb-icon" /> Completed On</div>
                    <div className="lb-stat-value">12 May 2025</div>
                  </div>
                </div>

              </div>

              {/* Right Column */}
              <div className="lb-right-col">
                
                {/* Desktop Top Performers Hero Card & Stepped Podium */}
                <div className="lb-mobile-hero-card" style={{ marginBottom: "30px", background: "var(--bg-input, rgba(255,255,255,0.02))" }}>
                  <div className="lb-hero-top-row">
                    <div>
                      <span className="lb-hero-tag">TOP PERFORMERS</span>
                      <h2 className="lb-hero-title">Compete. Improve. Grow.</h2>
                    </div>
                    <div className="lb-hero-trophy-badge">
                      <Trophy size={28} className="lb-hero-trophy-icon" />
                    </div>
                  </div>

                  {/* User Performance Motivational Banner */}
                  <div className="lb-perf-banner">
                    <div className="lb-perf-crown-box">🏆</div>
                    <div className="lb-perf-text">
                      {userRank ? (
                        <>You are doing better than <strong>{performancePercentile}%</strong> of other players!</>
                      ) : (
                        <>Attempt tests to see your global performance ranking!</>
                      )}
                    </div>
                  </div>

                  {/* STEPPED TOP 3 PODIUM */}
                  <div className="lb-mobile-podium-container">
                    {/* Spot #2 (Left) */}
                    <div className="lb-pod-column spot-2" onClick={() => spot2 && setSelectedStudentModal(spot2)} style={{ cursor: spot2 ? "pointer" : "default" }}>
                      {spot2 ? (
                        <>
                          <div className="lb-pod-avatar-ring silver-ring">
                            {spot2.avatar ? (
                              <img src={spot2.avatar} alt={spot2.name} />
                            ) : (
                              <User size={20} color="var(--text-muted)" />
                            )}
                            <span className="lb-pod-badge silver">2</span>
                          </div>
                          <span className="lb-pod-name">{spot2.name}</span>
                          <span className="lb-pod-score">{spot2.pts}</span>
                          <div className="lb-pod-step step-2">
                            <span className="lb-pod-step-num">2</span>
                          </div>
                        </>
                      ) : (
                        <div className="lb-pod-empty">
                          <User size={20} color="var(--text-muted)" />
                          <div className="lb-pod-step step-2"><span>2</span></div>
                        </div>
                      )}
                    </div>

                    {/* Spot #1 (Center) */}
                    <div className="lb-pod-column spot-1" onClick={() => spot1 && setSelectedStudentModal(spot1)} style={{ cursor: spot1 ? "pointer" : "default" }}>
                      {spot1 ? (
                        <>
                          <div className="lb-crown-floating">
                            <Crown size={22} fill="#FBBF24" color="#D97706" />
                          </div>
                          <div className="lb-pod-avatar-ring gold-ring">
                            {spot1.avatar ? (
                              <img src={spot1.avatar} alt={spot1.name} />
                            ) : (
                              <User size={24} color="var(--text-muted)" />
                            )}
                            <span className="lb-pod-badge gold">1</span>
                          </div>
                          <span className="lb-pod-name main-winner">{spot1.name}</span>
                          <span className="lb-pod-score main-pts">{spot1.pts}</span>
                          <div className="lb-pod-step step-1">
                            <span className="lb-pod-step-num">1</span>
                          </div>
                        </>
                      ) : (
                        <div className="lb-pod-empty">
                          <User size={24} color="var(--text-muted)" />
                          <div className="lb-pod-step step-1"><span>1</span></div>
                        </div>
                      )}
                    </div>

                    {/* Spot #3 (Right) */}
                    <div className="lb-pod-column spot-3" onClick={() => spot3 && setSelectedStudentModal(spot3)} style={{ cursor: spot3 ? "pointer" : "default" }}>
                      {spot3 ? (
                        <>
                          <div className="lb-pod-avatar-ring bronze-ring">
                            {spot3.avatar ? (
                              <img src={spot3.avatar} alt={spot3.name} />
                            ) : (
                              <User size={20} color="var(--text-muted)" />
                            )}
                            <span className="lb-pod-badge bronze">3</span>
                          </div>
                          <span className="lb-pod-name">{spot3.name}</span>
                          <span className="lb-pod-score">{spot3.pts}</span>
                          <div className="lb-pod-step step-3">
                            <span className="lb-pod-step-num">3</span>
                          </div>
                        </>
                      ) : (
                        <div className="lb-pod-empty">
                          <User size={20} color="var(--text-muted)" />
                          <div className="lb-pod-step step-3"><span>3</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                    Top Players
                  </h3>
                  {displayResults.length > 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDesktopExpanded(!isDesktopExpanded);
                        setCurrentPage(1);
                      }}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        padding: "6px 14px",
                        color: "var(--violet, #6E3FF3)",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      {isDesktopExpanded ? (
                        <>Show Top 10 Only <ChevronUp size={14} /></>
                      ) : (
                        <>View All Players ({displayResults.length}) <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </div>

                {/* Table */}
                <div className="lb-table-wrapper">
                  <table className="lb-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student & Exam</th>
                      <th>Score</th>
                      <th>Accuracy</th>
                      <th>Percentile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desktopTableData.map((row) => (
                      <tr 
                        key={row.rank} 
                        onClick={() => setSelectedStudentModal(row)}
                        style={{ cursor: "pointer" }}
                        className="lb-desktop-table-row"
                      >
                        <td className="rank">{row.rank}</td>
                        <td className="student">
                          <div className="lb-student-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                            {row.avatar ? (
                              <img src={row.avatar} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <User size={18} color="var(--text-muted)" />
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className={row.isYou ? 'you' : ''} style={{ fontWeight: "700" }}>
                              {row.name} {row.isYou && "(You)"}
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>
                              {row.quizTitle} {row.subject && row.subject !== "General" ? `• ${row.subject}` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="score">{row.score}</td>
                        <td className="accuracy">{row.accuracy}</td>
                        <td className="percentile">{row.percentile}</td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>

                {/* Expand / Collapse Action Bar */}
                {displayResults.length > 10 && !isDesktopExpanded && (
                  <div style={{ textAlign: "center", marginTop: "20px" }}>
                    <button
                      type="button"
                      onClick={() => setIsDesktopExpanded(true)}
                      style={{
                        padding: "10px 24px",
                        borderRadius: "30px",
                        border: "1.5px solid var(--violet, #6E3FF3)",
                        background: "rgba(110, 63, 243, 0.08)",
                        color: "var(--violet, #6E3FF3)",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s"
                      }}
                    >
                      Show All {displayResults.length} Players <ChevronDown size={16} />
                    </button>
                  </div>
                )}

                {isDesktopExpanded && totalPages > 1 && (
                  <div className="lb-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                     <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      style={{ 
                        padding: "8px 16px", 
                        borderRadius: "8px", 
                        border: "1px solid var(--border-color)", 
                        background: currentPage === 1 ? "var(--bg-input)" : "var(--bg-card)", 
                        color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)", 
                        cursor: currentPage === 1 ? "not-allowed" : "pointer" 
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>Page {currentPage} of {totalPages}</span>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      style={{ 
                        padding: "8px 16px", 
                        borderRadius: "8px", 
                        border: "1px solid var(--border-color)", 
                        background: currentPage === totalPages ? "var(--bg-input)" : "var(--bg-card)", 
                        color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-primary)", 
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer" 
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* ═════════════════════════════════════════════════════════════
              🔍 STUDENT ATTEMPT DETAILS MODAL (CLICK ON STUDENT ROW/NAME)
             ═════════════════════════════════════════════════════════════ */}
          {selectedStudentModal && (
            <div 
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.65)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999,
                padding: "16px"
              }}
              onClick={() => setSelectedStudentModal(null)}
            >
              <div 
                style={{
                  background: "var(--bg-card, #131428)",
                  border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
                  borderRadius: "20px",
                  maxWidth: "440px",
                  width: "100%",
                  padding: "24px",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                  position: "relative",
                  animation: "modalFadeIn 0.2s ease-out"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "var(--bg-input)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid var(--violet)" }}>
                      {selectedStudentModal.avatar ? (
                        <img src={selectedStudentModal.avatar} alt={selectedStudentModal.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <User size={24} color="var(--text-muted)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                        {selectedStudentModal.name} {selectedStudentModal.isYou && <span style={{ color: "var(--violet)", fontSize: "12px", fontWeight: "800" }}>(You)</span>}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
                        Rank #{selectedStudentModal.rank} on Leaderboard
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedStudentModal(null)}
                    style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ height: "1px", background: "var(--border-color)" }} />

                {/* Attempt Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", background: "var(--bg-input)" }}>
                    <BookOpen size={20} style={{ color: "var(--violet)", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>Test / Exam Title</div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{selectedStudentModal.quizTitle || selectedStudentModal.examName || "Mock Test"}</div>
                    </div>
                  </div>

                  {selectedStudentModal.subject && (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", background: "var(--bg-input)" }}>
                      <FileText size={20} style={{ color: "var(--violet)", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>Subject / Module</div>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{selectedStudentModal.subject}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ padding: "12px 14px", borderRadius: "12px", background: "var(--bg-input)" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Score Secured</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--violet)", marginTop: "2px" }}>{selectedStudentModal.score}</div>
                    </div>
                    <div style={{ padding: "12px 14px", borderRadius: "12px", background: "var(--bg-input)" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>Accuracy / Percentile</div>
                      <div style={{ fontSize: "16px", fontWeight: "800", color: "#16A34A", marginTop: "2px" }}>{selectedStudentModal.accuracy} ({selectedStudentModal.percentile})</div>
                    </div>
                  </div>

                  {selectedStudentModal.date && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      <Calendar size={14} /> Completed on {selectedStudentModal.date}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    onClick={() => setSelectedStudentModal(null)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Close
                  </button>
                  {selectedStudentModal.isYou && selectedStudentModal.rawResult && (
                    <button
                      onClick={() => {
                        const targetId = selectedStudentModal.rawResult._id || selectedStudentModal.rawResult.shareId;
                        navigate(targetId ? `/result/${targetId}` : "/result", { state: selectedStudentModal.rawResult });
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "10px",
                        border: "none",
                        background: "var(--violet, #6E3FF3)",
                        color: "#ffffff",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px"
                      }}
                    >
                      View Full Result <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
