import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import QuizDetailsModal from "../components/QuizDetailsModal";
import { useExam } from "../context/ExamContext";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, BookOpen, AlertCircle, FileText, CheckCircle } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/MyExams.css";

function ExamSeriesDetails() {
  const { examSeriesId } = useParams();
  const navigate = useNavigate();
  const { selectedStructure, selectedSubject } = useExam();
  const [series, setSeries] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All"); // All, Single Subject, Full Length Mock, Practice, Flashcards
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuizForDetails, setSelectedQuizForDetails] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // Build query params for structure/subject filtering
        const params = new URLSearchParams();
        if (selectedStructure && selectedStructure._id) {
          params.set("examStructureId", selectedStructure._id);
        }
        if (selectedSubject) {
          params.set("subjectName", selectedSubject);
        }
        const qs = params.toString();

        // Fetch Exam Series details & associated quizzes
        const detailsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-series/${examSeriesId}${qs ? `?${qs}` : ""}`, { headers });
        setSeries(detailsRes.data.series);
        setQuizzes(detailsRes.data.quizzes || []);

        // Fetch Flashcards
        try {
          const fcParams = new URLSearchParams(qs);
          fcParams.set("examSeriesId", examSeriesId);
          const fcRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/sets?${fcParams.toString()}`, { headers });
          setFlashcardSets(fcRes.data || []);
        } catch (e) {
          console.error("Flashcards fetch error", e);
        }

        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const resultsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id || user._id}`, { headers });
          setResults(resultsRes.data);
        }
      } catch (err) {
        console.error("Error loading Exam Series Details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examSeriesId, selectedStructure, selectedSubject]);

  const attemptedQuizIds = results.map(r => r.quizId).filter(Boolean);

  const [selectedPyqYear, setSelectedPyqYear] = useState("All");

  // Extract list of unique PYQ years available in these quizzes
  const pyqYears = [...new Set(quizzes.map((q) => q.pyqYear).filter(Boolean))].sort((a, b) => b - a);

  // Filter paper list
  let filteredQuizzes = quizzes;

  if (activeFilter !== "All") {
    filteredQuizzes = quizzes.filter(q => {
      const type = q.testType || (q.publishAs === "pyq" ? "PYQ" : (q.quizType === "practice" ? "Practice Test" : "Mock Test"));
      return type === activeFilter;
    });
  }

  if (selectedPyqYear !== "All") {
    filteredQuizzes = filteredQuizzes.filter((q) => Number(q.pyqYear) === Number(selectedPyqYear));
  }

  // Filter search matches
  if (searchQuery) {
    filteredQuizzes = filteredQuizzes.filter(q => 
      q.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  let filteredFlashcards = flashcardSets;
  if (searchQuery) {
    filteredFlashcards = filteredFlashcards.filter(f => 
      f.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.subjectName?.toLowerCase().includes(searchQuery.toLowerCase())
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
        fromSeriesId: examSeriesId
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
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexWrap: "nowrap" }}>
                  <div className="me-exam-icon-wrapper" style={{ width: "64px", height: "64px", flexShrink: 0, borderRadius: "16px", background: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BookOpen size={32} />
                  </div>
                  <div style={{ flex: 1, minWidth: "0", textAlign: "left" }}>
                    <h2 style={{ fontSize: "24px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 8px 0", textAlign: "left" }}>{series.title}</h2>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "var(--text-muted)", textAlign: "left" }}>
                      <span><strong>Category:</strong> {series.category || "General"}</span>
                      <span>•</span>
                      <span><strong>Total Items:</strong> {quizzes.length + flashcardSets.length}</span>
                      <span>•</span>
                      <span><strong>Attempted:</strong> {quizzes.filter(q => attemptedQuizIds.includes(q._id)).length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs and Filters */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
                <div className="me-tabs" style={{ margin: 0 }}>
                  {["All", ...new Set(quizzes.map(q => q.testType || (q.publishAs === "pyq" ? "PYQ" : (q.quizType === "practice" ? "Practice Test" : "Mock Test")))), ...(flashcardSets.length > 0 ? ["Flashcards"] : [])].map(filter => (
                    <button 
                      key={filter} 
                      className={`me-tab-btn ${activeFilter === filter ? "active" : ""}`}
                      onClick={() => setActiveFilter(filter)}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {pyqYears.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>PYQ Year:</span>
                    <select
                      value={selectedPyqYear}
                      onChange={(e) => setSelectedPyqYear(e.target.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                        background: "var(--bg-input, rgba(255, 255, 255, 0.05))",
                        color: "var(--text-primary, #ffffff)",
                        fontSize: "13px",
                        fontWeight: "600",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      <option value="All">All Years</option>
                      {pyqYears.map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="me-search-wrapper" style={{ maxWidth: "320px", width: "100%", margin: 0 }}>
                  <Search className="me-search-icon" size={18} />
                  <input 
                    type="text" 
                    className="me-search-input" 
                    placeholder={`Search papers inside ${series?.title || "Exam"}...`} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Papers List */}
              {(filteredQuizzes.length === 0 && (activeFilter !== "Flashcards" && activeFilter !== "All" || filteredFlashcards.length === 0)) ? (
                <div className="me-empty-state" style={{ padding: "48px 0" }}>
                  <FileText size={40} color="var(--text-muted)" />
                  <h4 style={{ color: "var(--text-primary)", marginTop: "12px" }}>No papers found</h4>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Try tweaking your filters or search keywords.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  
                  {/* Render Flashcards */}
                  {(activeFilter === "Flashcards" || activeFilter === "All") && filteredFlashcards.map(fc => (
                    <div key={fc._id} className="me-paper-card" style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "16px" }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0", lineHeight: 1.4 }}>
                          {fc.title}
                        </h4>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                          <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(110, 63, 243, 0.15)", color: "#6E3FF3", borderRadius: "4px", fontWeight: "600" }}>Flashcards</span>
                          {fc.chapter && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(99, 102, 241, 0.15)", color: "#6366F1", borderRadius: "4px", fontWeight: "600" }}>{fc.chapter}</span>}
                          {fc.topic && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(236, 72, 153, 0.15)", color: "#EC4899", borderRadius: "4px", fontWeight: "600" }}>{fc.topic}</span>}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                          <span><strong>Subject:</strong> {fc.subjectName || "General"}</span>
                          <span><strong>Cards:</strong> {fc.totalCards}</span>
                        </div>
                        {/* Pricing Badge */}
                        <div style={{ marginTop: "8px" }}>
                          {fc.isPaid ? (
                            <span style={{ 
                              backgroundColor: "rgba(239, 68, 68, 0.12)", 
                              color: "#EF4444", 
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                              padding: "3px 8px", 
                              borderRadius: "6px", 
                              fontSize: "11px", 
                              fontWeight: "700" 
                            }}>
                              {fc.isPurchased ? "✓ Purchased" : `Paid (₹${fc.price || 0})`}
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
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "16px", width: "100%" }}>
                        {fc.isPaid && !fc.isPurchased ? (
                          <button 
                            className="me-btn-primary" 
                            style={{ width: "100%", padding: "8px 16px", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #6E3FF3, #3B82F6)" }}
                            onClick={() => setSelectedQuizForDetails({ ...fc, _type: "flashcard" })}
                          >
                            🔒 Buy Now — ₹{fc.price || 0}
                          </button>
                        ) : (
                          <button 
                            className="me-btn-primary" 
                            style={{ width: "100%", padding: "8px 16px", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center", background: "#6E3FF3" }}
                            onClick={() => navigate(`/dashboard/flashcards/${fc._id}`)}
                          >
                            Start Learning
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Render Quizzes */}
                  {activeFilter !== "Flashcards" && filteredQuizzes.map(quiz => {
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
                          
                          {/* Taxonomy Badges */}
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                            {quiz.pyqYear && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(245, 158, 11, 0.15)", color: "#F59E0B", borderRadius: "4px", fontWeight: "600" }}>{quiz.pyqYear}</span>}
                            {quiz.shift && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(16, 185, 129, 0.15)", color: "#10B981", borderRadius: "4px", fontWeight: "600" }}>{quiz.shift}</span>}
                            {quiz.testFormat && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(99, 102, 241, 0.15)", color: "#6366F1", borderRadius: "4px", fontWeight: "600" }}>{quiz.testFormat}</span>}
                            {quiz.topicName && <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(236, 72, 153, 0.15)", color: "#EC4899", borderRadius: "4px", fontWeight: "600" }}>{quiz.topicName}</span>}
                            {quiz.contentType === "pdf" ? (
                              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(239, 68, 68, 0.15)", color: "#EF4444", borderRadius: "4px", fontWeight: "600" }}>PDF</span>
                            ) : (
                              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(59, 130, 246, 0.15)", color: "#3B82F6", borderRadius: "4px", fontWeight: "600" }}>Interactive</span>
                            )}
                          </div>

                          {/* Subject & Stats inline */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                            <span><strong>Subject:</strong> {quiz.subject}</span>
                            {quiz.contentType !== "pdf" && <span><strong>Qs:</strong> {qCount}</span>}
                            {quiz.contentType !== "pdf" && <span><strong>Time:</strong> {durMin}m</span>}
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
                                {quiz.isPurchased ? "✓ Purchased" : "Paid"}
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
                          {isMulti && quiz.sections && quiz.sections.length > 0 && quiz.contentType !== "pdf" && (
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
                              onClick={() => setSelectedQuizForDetails(quiz)}
                            >
                              🔒 Buy Now — ₹{quiz.price || 0}
                            </button>
                          ) : quiz.contentType === "pdf" ? (
                            <button 
                              className="me-btn-primary" 
                              style={{ width: "100%", padding: "8px 16px", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center", background: "#EF4444" }}
                              onClick={() => window.open(quiz.pdfUrl, "_blank")}
                            >
                              View PDF
                            </button>
                          ) : attemptedQuizIds.includes(quiz._id) ? (
                            <>
                              <button 
                                className="me-action-btn" 
                                style={{ flex: 1, padding: "8px", background: "rgba(16, 185, 129, 0.1)", color: "#10B981", border: "1px solid #10B981", fontSize: "12px", textAlign: "center" }}
                                onClick={() => {
                                  const r = results.find(res => res.quizId === quiz._id || (res.quizId && res.quizId._id === quiz._id));
                                  if (r) {
                                    const targetId = r._id || r.shareId;
                                    navigate(targetId ? `/result/${targetId}` : "/result", { state: { ...r, fromAttempts: true } });
                                  } else {
                                    alert("Could not find the attempt results.");
                                  }
                                }}
                              >
                                Result
                              </button>
                              {(quiz.quizType === "practice" || quiz.allowReattempt !== false) && (
                                <button 
                                  className="me-btn-primary" 
                                  style={{ flex: 1, padding: "8px", background: "transparent", color: "var(--text-primary)", border: "1.5px solid var(--border-color)", fontSize: "12px", display: "flex", justifyContent: "center", alignItems: "center" }}
                                  onClick={() => handleStartExam(quiz)}
                                >
                                  Reattempt
                                </button>
                              )}
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
      {selectedQuizForDetails && (
        <QuizDetailsModal 
          quiz={selectedQuizForDetails} 
          onClose={() => setSelectedQuizForDetails(null)} 
        />
      )}
    </div>
  );
}

// Simple embedded Search Icon since we aren't loading complete Search icon locally
const Search = ({ className, size }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

export default ExamSeriesDetails;
