import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Play, CheckCircle2, Search, Filter, ChevronRight, FileText, ChevronDown, Loader2 } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/MyExams.css";

function MyExams() {
  const navigate = useNavigate();
  const [seriesList, setSeriesList] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All Exams");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch ALL series + their published quizzes in ONE request
        const seriesRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/exam-series/with-quizzes`,
          { headers }
        );

        const rawSeries = Array.isArray(seriesRes.data) ? seriesRes.data : [];
        console.log("[MyExams] Got", rawSeries.length, "series from API");

        // Add subjects and lastUpdated metadata
        const hydratedSeries = rawSeries.map((series) => {
          const quizzes = Array.isArray(series.quizzes) ? series.quizzes : [];
          const subjects = [...new Set(quizzes.map((q) => q.subject).filter(Boolean))];
          const lastUpdated =
            quizzes.length > 0
              ? new Date(Math.max(...quizzes.map((q) => new Date(q.updatedAt || q.createdAt))))
              : new Date(series.updatedAt || series.createdAt);
          return { ...series, subjects, lastUpdated };
        });

        console.log("[MyExams] Series:", hydratedSeries.map((s) => `${s.title} (${s.paperCount} papers)`));
        setSeriesList(hydratedSeries);
      } catch (err) {
        console.error("[MyExams] Failed to fetch exam series:", err?.response?.status, err?.message);
      }

      // Fetch user results separately so a failure here never hides the exams
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const userId = user.id || user._id;
          if (userId) {
            const resultsRes = await axios.get(
              `${import.meta.env.VITE_API_URL}/api/results/${userId}`,
              { headers }
            );
            setResults(Array.isArray(resultsRes.data) ? resultsRes.data : []);
          }
        }
      } catch (resErr) {
        console.warn("[MyExams] Could not load results:", resErr?.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  const [filterMenuLevel, setFilterMenuLevel] = useState(1);
  const [activeFilterExam, setActiveFilterExam] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        // Reset navigation level when closed
        setFilterMenuLevel(1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getFilterLabel = () => {
    if (selectedFilter === "all") return "Filter By: All";
    if (selectedFilter.startsWith("exam:")) {
      const examTitle = selectedFilter.replace("exam:", "");
      return `Filter By: ${examTitle}`;
    }
    if (selectedFilter.startsWith("exam_subject:")) {
      const [examTitle, subjectName] = selectedFilter.replace("exam_subject:", "").split("|");
      return `Filter By: ${examTitle} • ${subjectName}`;
    }
    return "Filter By: All";
  };

  // Attempt status lookup
  const attemptedQuizIds = results.map(r => r.quizId).filter(Boolean);

  // Stats calculation - only show series that have at least 1 paper
  const validSeriesList = seriesList.filter(s => (s.paperCount || 0) > 0);
  const totalSeriesCount = validSeriesList.length;
  
  // A series is completed if all its child quizzes have been attempted (and it has quizzes)
  const completedSeries = validSeriesList.filter(series => 
    series.quizzes.every(q => attemptedQuizIds.includes(q._id))
  );

  // A series is upcoming if none of its child quizzes have been attempted yet
  const upcomingSeries = validSeriesList.filter(series => 
    series.quizzes.every(q => !attemptedQuizIds.includes(q._id))
  );

  // Ongoing series: some quizzes attempted, some not
  const ongoingSeries = validSeriesList.filter(series => 
    series.quizzes.some(q => attemptedQuizIds.includes(q._id)) && 
    series.quizzes.some(q => !attemptedQuizIds.includes(q._id))
  );

  const tabs = ["All Exams", "Upcoming", "Ongoing", "Completed"];

  // Filter list based on active tab
  let displayedSeries = validSeriesList;
  if (activeTab === "Upcoming") displayedSeries = upcomingSeries;
  if (activeTab === "Ongoing") displayedSeries = ongoingSeries;
  if (activeTab === "Completed") displayedSeries = completedSeries;

  // Search filtering (title / subjects match)
  if (searchQuery) {
    displayedSeries = displayedSeries.filter(series => 
      series.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      series.subjects?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  // Unified Filter check
  if (selectedFilter !== "all") {
    if (selectedFilter.startsWith("exam:")) {
      const examTitle = selectedFilter.replace("exam:", "");
      displayedSeries = displayedSeries.filter(series => series.title === examTitle);
    } else if (selectedFilter.startsWith("exam_subject:")) {
      const [examTitle, subjectName] = selectedFilter.replace("exam_subject:", "").split("|");
      displayedSeries = displayedSeries.filter(series => 
        series.title === examTitle &&
        series.subjects?.some(s => s.toLowerCase() === subjectName.toLowerCase())
      );
    }
  }

  // Categories list (Exam Titles)
  const categories = [...new Set(validSeriesList.map(s => s.title).filter(Boolean))];

  // Subjects list
  const subjectsList = [...new Set(validSeriesList.flatMap(s => s.subjects || []).filter(Boolean))];

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Exams" />
        
        <div className="me-premium-layout">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '400px', gap: '16px', color: 'var(--text-secondary)' }}>
              <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--violet)' }} />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: '15px', fontWeight: '500' }}>Loading exams...</p>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              
              {/* STATISTICS ROW */}
              <div className="me-stats-grid">
                <motion.div variants={itemVariants} className="me-stat-card">
                  <div className="me-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                    <Calendar size={24} />
                  </div>
                  <div className="me-stat-content">
                    <span className="me-stat-value">{totalSeriesCount}</span>
                    <span className="me-stat-label">Exam Series</span>
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="me-stat-card">
                  <div className="me-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                    <Clock size={24} />
                  </div>
                  <div className="me-stat-content">
                    <span className="me-stat-value">{upcomingSeries.length}</span>
                    <span className="me-stat-label">Upcoming</span>
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="me-stat-card">
                  <div className="me-stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                    <Play size={24} />
                  </div>
                  <div className="me-stat-content">
                    <span className="me-stat-value">{ongoingSeries.length}</span>
                    <span className="me-stat-label">Ongoing</span>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="me-stat-card">
                  <div className="me-stat-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="me-stat-content">
                    <span className="me-stat-value">{completedSeries.length}</span>
                    <span className="me-stat-label">Completed</span>
                  </div>
                </motion.div>
              </div>

              {/* SEARCH & FILTERS ROW */}
              <motion.div variants={itemVariants} className="me-filters-section">
                <div className="me-tabs">
                  {tabs.map(tab => (
                    <button 
                      key={tab} 
                      className={`me-tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                <div className="me-search-filter">
                  <div className="me-search-wrapper">
                    <Search className="me-search-icon" size={18} />
                    <input 
                      type="text" 
                      className="me-search-input" 
                      placeholder="Search series or subjects..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {/* Single Filter Dropdown */}
                    <div ref={dropdownRef} style={{ position: "relative", zIndex: 999 }}>
                      <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="me-filter-btn"
                        style={{ 
                          paddingLeft: "42px", 
                          paddingRight: "16px",
                          cursor: "pointer", 
                          minWidth: "220px", 
                          background: "var(--bg-card)", 
                          color: "var(--text-primary)",
                          border: "1.5px solid var(--border-color)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          height: "42px"
                        }}
                      >
                        <div style={{ position: "absolute", left: "16px", pointerEvents: "none", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                          <Filter size={18} />
                        </div>
                        <span style={{ 
                          fontSize: "13.5px", 
                          fontWeight: "600", 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          maxWidth: "180px"
                        }}>
                          {getFilterLabel()}
                        </span>
                        <ChevronDown size={16} style={{ color: "var(--text-secondary)", transition: "transform 0.2s", transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                      </button>

                      {isDropdownOpen && (
                        <div style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          right: 0,
                          backgroundColor: "var(--bg-card, #1E1B2E)",
                          border: "1.5px solid var(--border-color)",
                          borderRadius: "12px",
                          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                          display: "flex",
                          flexDirection: "row",
                          width: (!isMobile && filterMenuLevel === 2) ? "480px" : "240px",
                          overflow: "hidden",
                          zIndex: 1000,
                          transition: "width 0.2s ease"
                        }}>
                          {/* COLUMN 1: EXAMS LIST (Level 1) */}
                          {((isMobile && filterMenuLevel === 1) || !isMobile) && (
                            <div style={{
                              width: "240px",
                              padding: "6px",
                              maxHeight: "320px",
                              overflowY: "auto",
                              borderRight: (!isMobile && filterMenuLevel === 2) ? "1.5px solid var(--border-color)" : "none"
                            }}>
                              <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--violet)", padding: "8px 12px 6px 12px", letterSpacing: "0.08em", textAlign: "left", opacity: 0.8 }}>
                                FILTER BY
                              </div>
                              <div 
                                onClick={() => { setSelectedFilter("all"); setIsDropdownOpen(false); setFilterMenuLevel(1); }}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: "8px",
                                  fontSize: "13.5px",
                                  fontWeight: selectedFilter === "all" ? "600" : "500",
                                  color: selectedFilter === "all" ? "#FFFFFF" : "var(--text-primary)",
                                  backgroundColor: selectedFilter === "all" ? "var(--violet)" : "transparent",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  marginBottom: "4px",
                                  textAlign: "left"
                                }}
                                onMouseEnter={(e) => { if (selectedFilter !== "all") e.target.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={(e) => { if (selectedFilter !== "all") e.target.style.backgroundColor = "transparent"; }}
                              >
                                All Exams
                              </div>

                              <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--violet)", padding: "8px 12px 6px 12px", letterSpacing: "0.08em", textAlign: "left", opacity: 0.8 }}>
                                Exams
                              </div>

                              {validSeriesList.map(series => {
                                const isSelected = selectedFilter.startsWith("exam:") && selectedFilter.replace("exam:", "") === series.title;
                                const isMenuSelected = activeFilterExam?.title === series.title;
                                return (
                                  <div 
                                    key={series._id}
                                    onClick={() => {
                                      setActiveFilterExam(series);
                                      setFilterMenuLevel(2);
                                    }}
                                    style={{
                                      padding: "10px 12px",
                                      borderRadius: "8px",
                                      fontSize: "13.5px",
                                      fontWeight: (isSelected || isMenuSelected) ? "600" : "500",
                                      color: (isSelected || isMenuSelected) ? "#FFFFFF" : "var(--text-primary)",
                                      backgroundColor: (isSelected || isMenuSelected) ? "var(--violet)" : "transparent",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      transition: "all 0.15s ease",
                                      marginBottom: "2px",
                                      textAlign: "left"
                                    }}
                                    onMouseEnter={(e) => { 
                                      if (!isSelected && !isMenuSelected) e.target.style.backgroundColor = "rgba(255,255,255,0.06)"; 
                                      if (!isMobile) setActiveFilterExam(series);
                                    }}
                                    onMouseLeave={(e) => { 
                                      if (!isSelected && !isMenuSelected) e.target.style.backgroundColor = "transparent"; 
                                    }}
                                  >
                                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginRight: "8px" }}>
                                      {series.title}
                                    </span>
                                    <ChevronRight size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* COLUMN 2: SUBJECTS LIST (Level 2) */}
                          {((isMobile && filterMenuLevel === 2) || (!isMobile && filterMenuLevel === 2)) && activeFilterExam && (
                            <div style={{
                              width: "240px",
                              padding: "6px",
                              maxHeight: "320px",
                              overflowY: "auto"
                            }}>
                              <div 
                                onClick={() => {
                                  if (isMobile) {
                                    setFilterMenuLevel(1);
                                  }
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  textTransform: "uppercase",
                                  color: "var(--violet)",
                                  padding: "8px 12px 6px 12px",
                                  letterSpacing: "0.08em",
                                  textAlign: "left",
                                  cursor: isMobile ? "pointer" : "default"
                                }}
                              >
                                {isMobile ? "← " : ""}{activeFilterExam.title}
                              </div>

                              <div 
                                onClick={() => {
                                  setSelectedFilter(`exam:${activeFilterExam.title}`);
                                  setIsDropdownOpen(false);
                                }}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: "8px",
                                  fontSize: "13.5px",
                                  fontWeight: selectedFilter === `exam:${activeFilterExam.title}` ? "600" : "500",
                                  color: selectedFilter === `exam:${activeFilterExam.title}` ? "#FFFFFF" : "var(--text-primary)",
                                  backgroundColor: selectedFilter === `exam:${activeFilterExam.title}` ? "var(--violet)" : "transparent",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  marginBottom: "4px",
                                  textAlign: "left"
                                }}
                                onMouseEnter={(e) => { if (selectedFilter !== `exam:${activeFilterExam.title}`) e.target.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                                onMouseLeave={(e) => { if (selectedFilter !== `exam:${activeFilterExam.title}`) e.target.style.backgroundColor = "transparent"; }}
                              >
                                All Subjects
                              </div>

                              {activeFilterExam.subjects?.map(subject => {
                                const filterKey = `exam_subject:${activeFilterExam.title}|${subject}`;
                                const isSelected = selectedFilter === filterKey;
                                return (
                                  <div 
                                    key={subject}
                                    onClick={() => {
                                      setSelectedFilter(filterKey);
                                      setIsDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: "10px 12px",
                                      borderRadius: "8px",
                                      fontSize: "13.5px",
                                      fontWeight: isSelected ? "600" : "500",
                                      color: isSelected ? "#FFFFFF" : "var(--text-primary)",
                                      backgroundColor: isSelected ? "var(--violet)" : "transparent",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      marginBottom: "2px",
                                      textAlign: "left"
                                    }}
                                    onMouseEnter={(e) => { if (!isSelected) e.target.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                                    onMouseLeave={(e) => { if (!isSelected) e.target.style.backgroundColor = "transparent"; }}
                                  >
                                    {subject}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* EMPTY STATE */}
              {displayedSeries.length === 0 && (
                <motion.div variants={itemVariants} className="me-empty-state">
                  <div className="me-empty-icon">
                    <FileText size={40} />
                  </div>
                  <h3 className="me-empty-title">No Exam Series Available</h3>
                  <p className="me-empty-desc">There are currently no mock series published matching your criteria.</p>
                </motion.div>
              )}

              {/* EXAM SERIES GRID */}
              {displayedSeries.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="me-exams-grid">
                    <AnimatePresence>
                      {displayedSeries.map(series => {
                        const attemptedCount = series.quizzes.filter(q => attemptedQuizIds.includes(q._id)).length;
                        const isCompleted = attemptedCount === series.paperCount && series.paperCount > 0;
                        return (
                          <motion.div
                            key={series._id}
                            className="me-exam-card"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => navigate(`/student/exams/${series._id}`)}
                            style={{ cursor: "pointer" }}
                          >
                            {/* Top row: subject badge + completion status */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                              {series.subjects && series.subjects.length > 0 ? (
                                <span style={{
                                  background: "rgba(110, 63, 243, 0.15)",
                                  color: "#A78BFA",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "4px 10px",
                                  borderRadius: "100px",
                                  letterSpacing: "0.3px",
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}>
                                  {series.subjects[0]}
                                </span>
                              ) : (
                                <span style={{
                                  background: "rgba(59, 130, 246, 0.1)",
                                  color: "#3B82F6",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "4px 10px",
                                  borderRadius: "100px"
                                }}>
                                  {series.title}
                                </span>
                              )}
                              {isCompleted && (
                                <span style={{ color: "#10B981", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                                  <CheckCircle2 size={13} /> Completed
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <div>
                              <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px 0", lineHeight: 1.4 }}>
                                {series.title}
                              </h4>
                              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                                Practice mock exams for your preparation.
                              </p>
                            </div>

                            {/* Stats row */}
                            <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-secondary)" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <FileText size={13} /> {series.paperCount} Papers
                              </span>
                              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <CheckCircle2 size={13} /> {attemptedCount} Attempted
                              </span>
                            </div>

                            {/* Button */}
                            <button
                              className="me-btn-primary"
                              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                            >
                              View Papers <ChevronRight size={14} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyExams;
