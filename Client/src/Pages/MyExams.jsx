import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Play, CheckCircle2, Search, Filter, ChevronRight, FileText, BarChart2 } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/MyExams.css";

function MyExams() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All Exams");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes?published=true`);
        const examsOnly = res.data.filter(q => q.quizType !== 'practice');
        setQuizzes(examsOnly);
        
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const resultsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id}`);
          const sortedResults = resultsRes.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
          setResults(sortedResults);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const attemptedQuizzes = results.map(r => r.quizId).filter(Boolean);
  
  const totalExams = quizzes.length;
  const upcomingExams = quizzes.filter(q => !attemptedQuizzes.includes(q._id));
  const completedExams = results;
  const ongoingExamsCount = 0; // Placeholder as per instructions if no ongoing exists

  const handleStartExam = (quiz) => {
    navigate("/start-test", {
      state: {
        preSelectedQuizId: quiz._id,
        subject: quiz.subject || "General",
        quizId: quiz._id,
        quizTitle: quiz.title,
        duration: quiz.duration,
      },
    });
  };

  const tabs = ["All Exams", "Upcoming", "Ongoing", "Completed"];

  let displayedQuizzes = activeTab === "All Exams" ? quizzes : upcomingExams;
  if (searchQuery) {
    displayedQuizzes = displayedQuizzes.filter(q => 
      q.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  if (selectedSubject !== "All") {
    displayedQuizzes = displayedQuizzes.filter(q => q.subject === selectedSubject);
  }

  const subjects = ["All", ...new Set(quizzes.map(q => q.subject).filter(Boolean))];

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ", " + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
              
              {/* SECTION 2 - STATISTICS */}
              <div className="me-stats-grid">
                <motion.div variants={itemVariants} className="me-stat-card">
                  <div className="me-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                    <Calendar size={24} />
                  </div>
                  <div className="me-stat-content">
                    <span className="me-stat-value">{totalExams}</span>
                    <span className="me-stat-label">Total Exams</span>
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="me-stat-card">
                  <div className="me-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                    <Clock size={24} />
                  </div>
                  <div className="me-stat-content">
                    <span className="me-stat-value">{upcomingExams.length}</span>
                    <span className="me-stat-label">Upcoming</span>
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="me-stat-card">
                  <div className="me-stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                    <Play size={24} />
                  </div>
                  <div className="me-stat-content">
                    <span className="me-stat-value">{ongoingExamsCount}</span>
                    <span className="me-stat-label">Ongoing</span>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="me-stat-card">
                  <div className="me-stat-icon-wrapper" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="me-stat-content">
                    <span className="me-stat-value">{completedExams.length}</span>
                    <span className="me-stat-label">Completed</span>
                  </div>
                </motion.div>
              </div>

              {/* SECTION 3 - FILTERS */}
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
                      placeholder="Search quiz or subject..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", left: "16px", pointerEvents: "none", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                      <Filter size={18} />
                    </div>
                    <select 
                      className="me-filter-btn"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      style={{ paddingLeft: "42px", appearance: "none", cursor: "pointer", minWidth: "120px", background: "var(--bg-card)", color: "var(--text-primary)" }}
                    >
                      {subjects.map(sub => (
                        <option key={sub} value={sub} style={{ background: "var(--bg-card)" }}>{sub === "All" ? "Filter: All" : sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>

              {/* EMPTY STATE */}
              {totalExams === 0 && (
                <motion.div variants={itemVariants} className="me-empty-state">
                  <div className="me-empty-icon">
                    <FileText size={40} />
                  </div>
                  <h3 className="me-empty-title">No Exams Available</h3>
                  <p className="me-empty-desc">There are currently no exams published for you. Please check back later.</p>
                  <button className="me-btn-primary" onClick={() => navigate('/student-dashboard')}>Browse Dashboard</button>
                </motion.div>
              )}

              {/* SECTION 4 - UPCOMING EXAMS */}
              {(activeTab === "All Exams" || activeTab === "Upcoming") && displayedQuizzes.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="me-section-header">
                    <h3 className="me-section-title">{activeTab === "All Exams" ? "All Exams" : "Upcoming Exams"}</h3>
                    <a className="me-view-all">View All</a>
                  </div>
                  <div className="me-exams-grid">
                    <AnimatePresence>
                      {displayedQuizzes.map(quiz => {
                        const qCount = quiz.questionCount || (quiz.questions ? quiz.questions.length : 0);
                        const isMulti = quiz.sections && quiz.sections.length > 1;
                        const dur = isMulti ? Math.round((Number(quiz.duration) || 0) / 60) : Math.round(Number(quiz.duration) || 0);
                        return (
                          <motion.div 
                            key={quiz._id} 
                            className="me-exam-card"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="me-exam-top">
                              <div className="me-exam-icon-wrapper">
                                <FileText size={24} />
                              </div>
                              <div className="me-exam-info">
                                <h4>{quiz.title}</h4>
                                <div className="me-exam-datetime">
                                  <span><Calendar size={14} /> Available Now</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="me-exam-tags">
                              {quiz.subject && <span className="me-exam-tag">{quiz.subject}</span>}
                              {quiz.difficulty && <span className="me-exam-tag">{quiz.difficulty}</span>}
                              <span className="me-exam-tag">{qCount} Questions</span>
                            </div>
                            
                            <div className="me-exam-bottom">
                              <div className="me-exam-duration">
                                <Clock size={14} />
                                <span>{dur} min</span>
                              </div>
                              <button className="me-btn-primary" onClick={() => handleStartExam(quiz)}>Start Now</button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* SECTION 6 - COMPLETED EXAMS */}
              {activeTab === "Completed" && completedExams.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="me-section-header">
                    <h3 className="me-section-title">Completed Exams</h3>
                    <a 
                      className="me-view-all" 
                      onClick={() => setShowAllCompleted(!showAllCompleted)}
                      style={{cursor: 'pointer'}}
                    >
                      {showAllCompleted ? "View Less" : "View All"}
                    </a>
                  </div>
                  <div className="me-table-container">
                    <table className="me-table">
                      <thead>
                        <tr>
                          <th>Exam Name</th>
                          <th>Date</th>
                          <th>Score</th>
                          <th>Accuracy</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedExams.slice(0, showAllCompleted ? completedExams.length : 5).map((result, idx) => {
                          const boxColors = ["#6E3FF3", "#F59E0B", "#3B82F6", "#10B981", "#EC4899"];
                          return (
                            <tr key={result._id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div className="me-icon-box" style={{ background: boxColors[idx % boxColors.length] }}>
                                    <FileText size={14} />
                                  </div>
                                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{result.quizTitle || result.examName || "Mock Exam"}</span>
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>{formatDate(result.createdAt)}</td>
                              <td>
                                <span style={{ color: result.percentage >= 75 ? '#10B981' : result.percentage >= 50 ? '#F59E0B' : '#EF4444', fontWeight: '600' }}>
                                  {result.score}
                                </span>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>/{result.total}</span>
                              </td>
                              <td style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                                {result.percentage ? result.percentage.toFixed(0) : "0"}%
                              </td>
                              <td>
                                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>
                                  Completed
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="me-action-btn" onClick={() => navigate(`/student-results/${result.quizId}`)}>View Result</button>
                                  <button className="me-action-btn" onClick={() => navigate("/start-test", {
                                    state: {
                                      preSelectedQuizId: result.quizId,
                                      quizId: result.quizId,
                                      quizTitle: result.quizTitle || result.examName || "Mock Exam",
                                      subject: "Reattempt",
                                    }
                                  })}>Reattempt</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {completedExams.length > 5 && (
                      <div className="me-table-footer-link" onClick={() => {}}>
                        View All Completed Exams 
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    )}
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

