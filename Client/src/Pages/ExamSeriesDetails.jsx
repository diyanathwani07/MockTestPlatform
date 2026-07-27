import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, BookOpen, AlertCircle, FileText, CheckCircle } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/MyExams.css";

function ExamSeriesDetails() {
  const { examSeriesId } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All"); // All, Single Subject, Full Length Mock, Practice
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch Exam Series details & associated quizzes
        const detailsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-series/${examSeriesId}`, { headers });
        setSeries(detailsRes.data.series);
        setQuizzes(detailsRes.data.quizzes || []);

        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const resultsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id}`, { headers });
          setResults(resultsRes.data);
        }
      } catch (err) {
        console.error("Error loading Exam Series Details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examSeriesId]);

  const attemptedQuizIds = results.map(r => r.quizId).filter(Boolean);

  // Filter paper list
  let filteredQuizzes = quizzes;

  if (activeFilter === "Single Subject") {
    filteredQuizzes = quizzes.filter(q => q.quizType !== "practice" && (!q.isModular && (!q.sections || q.sections.length <= 1)));
  } else if (activeFilter === "Full Length Mock") {
    filteredQuizzes = quizzes.filter(q => q.isModular || (q.sections && q.sections.length > 1));
  } else if (activeFilter === "Practice") {
    filteredQuizzes = quizzes.filter(q => q.quizType === "practice");
  }

  // Filter search matches
  if (searchQuery) {
    filteredQuizzes = filteredQuizzes.filter(q => 
      q.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

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

  const getAttemptStatusLabel = (quizId) => {
    const attempted = attemptedQuizIds.includes(quizId);
    if (attempted) {
      return (
        <span style={{ color: "#10B981", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
          <CheckCircle size={14} /> Attempted
        </span>
      );
    }
    return (
      <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "500" }}>
        Not Attempted
      </span>
    );
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title={series ? series.title : "Exam Details"} />

        <div className="me-premium-layout">
          
          {/* Back Action Bar */}
          <div style={{ marginBottom: "20px" }}>
            <button 
              onClick={() => navigate("/dashboard/exams")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              <ArrowLeft size={18} /> Back to Exams
            </button>
          </div>

          {loading ? (
            <div className="me-shimmer" style={{ height: "300px", borderRadius: "20px" }}></div>
          ) : !series ? (
            <div className="me-empty-state">
              <AlertCircle size={40} color="red" />
              <h3>Series Not Found</h3>
            </div>
          ) : (
            <div>
              {/* Header Card */}
              <div className="me-exam-card" style={{ width: "100%", cursor: "default", marginBottom: "32px", background: "linear-gradient(135deg, rgba(110, 63, 243, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)" }}>
                <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div className="me-exam-icon-wrapper" style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3" }}>
                    <BookOpen size={32} />
                  </div>
                  <div style={{ flex: 1, minWidth: "260px", textAlign: "left" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 8px 0", textAlign: "left" }}>{series.title}</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "0 0 16px 0", lineHeight: "1.5", textAlign: "left" }}>{series.description || "Access all topic tests and full length mocks structured for this exam."}</p>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "var(--text-muted)", textAlign: "left" }}>
                      <span><strong>Category:</strong> {series.category || "General"}</span>
                      <span>•</span>
                      <span><strong>Total Papers:</strong> {quizzes.length}</span>
                      <span>•</span>
                      <span><strong>Attempted:</strong> {quizzes.filter(q => attemptedQuizIds.includes(q._id)).length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs and Filters */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
                <div className="me-tabs" style={{ margin: 0 }}>
                  {["All", "Single Subject", "Full Length Mock", "Practice"].map(filter => (
                    <button 
                      key={filter} 
                      className={`me-tab-btn ${activeFilter === filter ? "active" : ""}`}
                      onClick={() => setActiveFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="me-search-wrapper" style={{ maxWidth: "320px", width: "100%", margin: 0 }}>
                  <Search className="me-search-icon" size={18} />
                  <input 
                    type="text" 
                    className="me-search-input" 
                    placeholder="Search papers inside UPTET..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Papers List */}
              {filteredQuizzes.length === 0 ? (
                <div className="me-empty-state" style={{ padding: "48px 0" }}>
                  <FileText size={40} color="var(--text-muted)" />
                  <h4 style={{ color: "var(--text-primary)", marginTop: "12px" }}>No papers found</h4>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Try tweaking your filters or search keywords.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {filteredQuizzes.map(quiz => {
                    const isMulti = quiz.isModular || (quiz.sections && quiz.sections.length > 1);
                    const durMin = quiz.duration >= 600 ? Math.round(quiz.duration / 60) : quiz.duration;
                    
                    // Question Count computation
                    let qCount = quiz.questions?.length || 0;
                    if (quiz.sections && quiz.sections.length > 0) {
                      qCount = quiz.sections.reduce((sum, sec) => {
                        const sData = sec.sectionId || sec;
                        return sum + (sData.questions?.length || 0);
                      }, 0);
                    }

                    return (
                      <div 
                        key={quiz._id} 
                        className="me-exam-card" 
                        style={{ 
                          cursor: "default", 
                          padding: "20px", 
                          display: "flex", 
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "14px",
                          minHeight: "220px"
                        }}
                      >
                        <div>
                          {/* Top row: Subject Badge + Status */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px", background: isMulti ? "rgba(167, 139, 250, 0.15)" : "rgba(59, 130, 246, 0.15)", color: isMulti ? "#A78BFA" : "#3B82F6" }}>
                              {isMulti ? "Mock" : "Practice"}
                            </span>
                            {getAttemptStatusLabel(quiz._id)}
                          </div>

                          {/* Title */}
                          <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0", lineHeight: 1.4 }}>
                            {quiz.title}
                          </h4>
                          
                          {/* Subject & Stats inline */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                            <span><strong>Subject:</strong> {quiz.subject}</span>
                            <span><strong>Qs:</strong> {qCount}</span>
                            <span><strong>Time:</strong> {durMin}m</span>
                          </div>

                          {/* Pricing Badge */}
                          <div style={{ marginTop: "8px" }}>
                            {quiz.isPaid ? (
                              <span style={{ 
                                backgroundColor: "rgba(239, 68, 68, 0.12)", 
                                color: "#EF4444", 
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                padding: "3px 8px", 
                                borderRadius: "6px", 
                                fontSize: "11px", 
                                fontWeight: "700" 
                              }}>
                                {quiz.isPurchased ? "✓ Purchased" : `₹${quiz.price || 0}`}
                              </span>
                            ) : (
                              <span style={{ 
                                backgroundColor: "rgba(16, 185, 129, 0.12)", 
                                color: "#10B981", 
                                border: "1px solid rgba(16, 185, 129, 0.2)",
                                padding: "3px 8px", 
                                borderRadius: "6px", 
                                fontSize: "11px", 
                                fontWeight: "700" 
                              }}>
                                Free
                              </span>
                            )}
                          </div>

                          {/* Sections list in smaller text */}
                          {isMulti && quiz.sections && quiz.sections.length > 0 && (
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <strong>Sections:</strong> {quiz.sections.map(s => s.sectionId?.title || s.title || "Section").join(", ")}
                            </div>
                          )}
                        </div>

                        {/* Actions at bottom */}
                        <div style={{ display: "flex", gap: "8px", marginTop: "auto", width: "100%" }}>
                          {quiz.isPaid && !quiz.isPurchased ? (
                            <button 
                              className="me-btn-primary" 
                              style={{ width: "100%", padding: "8px 16px", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #6E3FF3, #3B82F6)" }}
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem("token");
                                  await axios.post(`${import.meta.env.VITE_API_URL}/api/purchase/exam`, { examId: quiz._id }, { headers: { Authorization: `Bearer ${token}` } });
                                  alert("✅ Purchase Successful! You can now attempt this exam.");
                                  window.location.reload();
                                } catch (err) {
                                  alert("Purchase failed. Please try again.");
                                }
                              }}
                            >
                              🔒 Buy Now — ₹{quiz.price || 0}
                            </button>
                          ) : attemptedQuizIds.includes(quiz._id) ? (
                            <>
                              <button 
                                className="me-action-btn" 
                                style={{ flex: 1, padding: "8px", background: "rgba(16, 185, 129, 0.1)", color: "#10B981", border: "1px solid #10B981", fontSize: "12px", textAlign: "center" }}
                                onClick={() => navigate(`/student-results/${quiz._id}`)}
                              >
                                Result
                              </button>
                              <button 
                                className="me-btn-primary" 
                                style={{ flex: 1, padding: "8px", background: "transparent", color: "var(--text-primary)", border: "1.5px solid var(--border-color)", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center" }}
                                onClick={() => handleStartExam(quiz)}
                              >
                                Reattempt
                              </button>
                            </>
                          ) : (
                            <button 
                              className="me-btn-primary" 
                              style={{ width: "100%", padding: "8px 16px", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center" }}
                              onClick={() => handleStartExam(quiz)}
                            >
                              Start Test
                            </button>
                          )}
                        </div>
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
  );
}

// Simple embedded Search Icon since we aren't loading complete Search icon locally
const Search = ({ className, size }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

export default ExamSeriesDetails;
