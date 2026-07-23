import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Play, CheckCircle2, Search, Filter, ChevronRight, FileText, ChevronDown } from "lucide-react";
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

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getFilterLabel = () => {
    if (selectedFilter === "all") return "Filter By: All";
    if (selectedFilter === "exam:all") return "All Exams";
    if (selectedFilter === "subject:all") return "All Subjects";
    if (selectedFilter.startsWith("exam:")) {
      return selectedFilter.replace("exam:", "");
    }
    if (selectedFilter.startsWith("subject:")) {
      return selectedFilter.replace("subject:", "");
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
    if (selectedFilter === "exam:all") {
      // Show all series (no filter) — same as "All"
      // displayedSeries stays as is
    } else if (selectedFilter.startsWith("exam:")) {
      const examTitle = selectedFilter.replace("exam:", "");
      displayedSeries = displayedSeries.filter(series => series.title === examTitle);
    } else if (selectedFilter === "subject:all") {
      // Show only series that have at least one subject tagged
      displayedSeries = displayedSeries.filter(series => series.subjects && series.subjects.length > 0);
    } else if (selectedFilter.startsWith("subject:")) {
      const subjectName = selectedFilter.replace("subject:", "");
      displayedSeries = displayedSeries.filter(series =>
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
        <StudentNavbar title="My Exams" />
        
        <div className="me-premium-layout">
          {loading ? (
            <div className="me-shimmer" style={{ height: '400px', borderRadius: '20px' }}></div>
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
                        <span style={{ fontSize: "13.5px", fontWeight: "600" }}>{getFilterLabel()}</span>
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
                          width: "240px",
                          maxHeight: "320px",
                          overflowY: "auto",
                          padding: "6px",
                          zIndex: 1000
                        }}>
                          {/* Option: Filter By: All */}
                          <div 
                            onClick={() => { setSelectedFilter("all"); setIsDropdownOpen(false); }}
                            style={{
                              padding: "8px 12px",
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
                            Filter By: All
                          </div>

                          {/* EXAMS GROUP */}
                          <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--violet)", padding: "8px 12px 6px 12px", letterSpacing: "0.08em", textAlign: "left", opacity: 0.8 }}>
                            Exams
                          </div>
                          <div 
                            onClick={() => { setSelectedFilter("exam:all"); setIsDropdownOpen(false); }}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              fontSize: "13.5px",
                              fontWeight: selectedFilter === "exam:all" ? "600" : "500",
                              color: selectedFilter === "exam:all" ? "#FFFFFF" : "#6E3FF3",
                              backgroundColor: selectedFilter === "exam:all" ? "var(--violet)" : "transparent",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              marginBottom: "2px",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => { if (selectedFilter !== "exam:all") e.target.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                            onMouseLeave={(e) => { if (selectedFilter !== "exam:all") e.target.style.backgroundColor = "transparent"; }}
                          >
                            All Exams
                          </div>
                          {categories.map(cat => (
                            <div 
                              key={`exam:${cat}`}
                              onClick={() => { setSelectedFilter(`exam:${cat}`); setIsDropdownOpen(false); }}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                fontSize: "13.5px",
                                fontWeight: selectedFilter === `exam:${cat}` ? "600" : "500",
                                color: selectedFilter === `exam:${cat}` ? "#FFFFFF" : "var(--text-primary)",
                                backgroundColor: selectedFilter === `exam:${cat}` ? "var(--violet)" : "transparent",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                marginBottom: "2px",
                                textAlign: "left"
                              }}
                              onMouseEnter={(e) => { if (selectedFilter !== `exam:${cat}`) e.target.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                              onMouseLeave={(e) => { if (selectedFilter !== `exam:${cat}`) e.target.style.backgroundColor = "transparent"; }}
                            >
                              {cat}
                            </div>
                          ))}

                          {/* SUBJECTS GROUP */}
                          <div style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--violet)", padding: "12px 12px 6px 12px", letterSpacing: "0.08em", textAlign: "left", opacity: 0.8 }}>
                            Subjects
                          </div>
                          <div 
                            onClick={() => { setSelectedFilter("subject:all"); setIsDropdownOpen(false); }}
                            style={{
                              padding: "8px 12px",
                              borderRadius: "8px",
                              fontSize: "13.5px",
                              fontWeight: selectedFilter === "subject:all" ? "600" : "500",
                              color: selectedFilter === "subject:all" ? "#FFFFFF" : "#6E3FF3",
                              backgroundColor: selectedFilter === "subject:all" ? "var(--violet)" : "transparent",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              marginBottom: "2px",
                              textAlign: "left"
                            }}
                            onMouseEnter={(e) => { if (selectedFilter !== "subject:all") e.target.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                            onMouseLeave={(e) => { if (selectedFilter !== "subject:all") e.target.style.backgroundColor = "transparent"; }}
                          >
                            All Subjects
                          </div>
                          {subjectsList.map(sub => (
                            <div 
                              key={`subject:${sub}`}
                              onClick={() => { setSelectedFilter(`subject:${sub}`); setIsDropdownOpen(false); }}
                              style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                fontSize: "13.5px",
                                fontWeight: selectedFilter === `subject:${sub}` ? "600" : "500",
                                color: selectedFilter === `subject:${sub}` ? "#FFFFFF" : "var(--text-primary)",
                                backgroundColor: selectedFilter === `subject:${sub}` ? "var(--violet)" : "transparent",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                marginBottom: "2px",
                                textAlign: "left"
                              }}
                              onMouseEnter={(e) => { if (selectedFilter !== `subject:${sub}`) e.target.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                              onMouseLeave={(e) => { if (selectedFilter !== `subject:${sub}`) e.target.style.backgroundColor = "transparent"; }}
                            >
                              {sub}
                            </div>
                          ))}
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
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              {series.subjects && series.subjects.length > 0 ? (
                                <span style={{
                                  background: "rgba(110, 63, 243, 0.15)",
                                  color: "#A78BFA",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "4px 10px",
                                  borderRadius: "100px",
                                  letterSpacing: "0.3px",
                                  maxWidth: "60%",
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
                                  Mock Series
                                </span>
                              )}
                              {isCompleted && (
                                <span style={{ color: "#10B981", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
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
