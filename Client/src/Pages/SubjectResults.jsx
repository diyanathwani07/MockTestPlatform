import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { FileText, ChevronRight, ArrowLeft, CheckCircle, Target } from "lucide-react";
import axios from "axios";
import "../css/StudentDashboard.css";
import "../css/StudentResults.css";
import "../css/Practice.css";
import MuiDatePicker from "../components/MuiDatePicker";

function SubjectResults() {
  const { subject } = useParams();
  const navigate = useNavigate();
  const decodedExamName = decodeURIComponent(subject);

  const [group, setGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSubjectTab, setSelectedSubjectTab] = useState("");

  const subjects = Array.from(new Set(group.map((r) => r.subject || "General")));

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return navigate("/login");
        const user = JSON.parse(userStr);

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id || user._id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const examResults = res.data.filter(
          (r) => (r.examName || "General Mock Tests").trim() === decodedExamName.trim()
        );
        setGroup(examResults);
      } catch (error) {
        console.error("Error fetching subject results:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [decodedExamName, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    return `${datePart} | Time: ${timePart}`;
  };

  const tabFilteredGroup = group.filter(
    (r) => (r.subject || "General") === selectedSubjectTab
  );

  const filteredGroup = selectedDate
    ? tabFilteredGroup.filter((result) => {
        if (!result.createdAt) return false;
        const resultDate = new Date(result.createdAt).toISOString().split("T")[0];
        return resultDate === selectedDate;
      })
    : tabFilteredGroup;

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Results" />

        <div className="sd-content" style={{ paddingTop: '20px' }}>
          <div className="practice-header-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "32px" }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button 
                onClick={() => {
                  if (selectedSubjectTab) {
                    setSelectedSubjectTab("");
                  } else {
                    navigate("/dashboard/results");
                  }
                }}
                style={{
                  background: "transparent", border: "1px solid var(--border-color)", borderRadius: "8px",
                  width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--text-primary)"
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="practice-title" style={{ margin: "0 0 4px 0" }}>
                  {decodedExamName} {selectedSubjectTab ? `- ${selectedSubjectTab}` : ""} Results
                </h1>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                  {selectedSubjectTab ? `Review all your test attempts for ${selectedSubjectTab}.` : "Select a subject to view your attempts."}
                </p>
              </div>
            </div>

            {/* Calendar Widget on Right */}
            {selectedSubjectTab && (
              <div style={{ width: "180px" }}>
                <MuiDatePicker value={selectedDate} onChange={setSelectedDate} label="mm-dd-yyyy" />
              </div>
            )}

          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <div className="sd-spinner"></div>
            </div>
          ) : !selectedSubjectTab ? (
            /* Subject Containers/Cards Grid */
            <div className="practice-grid">
              {subjects.map((sub, index) => {
                const subGroup = group.filter((r) => (r.subject || "General") === sub);
                const count = subGroup.length;
                const avgScore = subGroup.reduce((sum, r) => sum + (r.percentage || ((r.score / (r.total || 1)) * 100)), 0) / count;

                const subjectColors = [
                  { bg: "#EDE9FE", text: "#5B21B6", dot: "#7C3AED" },
                  { bg: "#DCFCE7", text: "#166534", dot: "#16A34A" },
                  { bg: "#FEF9C3", text: "#854D0E", dot: "#D97706" },
                  { bg: "#FFE4E6", text: "#9F1239", dot: "#E11D48" },
                  { bg: "#DBEAFE", text: "#1E40AF", dot: "#2563EB" },
                  { bg: "#FCE7F3", text: "#9D174D", dot: "#DB2777" },
                  { bg: "#F0FDF4", text: "#14532D", dot: "#15803D" },
                ];
                const color = subjectColors[index % subjectColors.length];

                return (
                  <div 
                    key={sub} 
                    className="practice-card"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedSubjectTab(sub)}
                  >
                    <div className="practice-card-header">
                      <div className="practice-subject-badge" style={{ backgroundColor: color.bg, color: color.text }}>
                        <span className="dot" style={{ backgroundColor: color.dot }}></span>
                        Subject Results
                      </div>
                    </div>
                    
                    <h3 className="practice-quiz-title">{sub}</h3>
                    <p className="practice-quiz-desc">
                      Review your attempts and performance analytics for this subject.
                    </p>

                    <div className="practice-meta-grid">
                      <div className="meta-item">
                        <CheckCircle size={14} />
                        <span>{count} Attempt{count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="meta-item">
                        <Target size={14} />
                        <span>Avg Score: {avgScore.toFixed(0)}%</span>
                      </div>
                    </div>

                    <button className="practice-start-btn">
                      <FileText size={16} />
                      View Attempts &gt;
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Selected Subject Attempts List */
            <>
              {/* Quick Navigation Tabs on Top */}
              {subjects.length > 1 && (
                <div className="me-tabs" style={{ marginBottom: "24px", marginLeft: "4px" }}>
                  {subjects.map((sub) => (
                    <button 
                      key={sub} 
                      className={`me-tab-btn ${selectedSubjectTab === sub ? "active" : ""}`}
                      onClick={() => {
                        setSelectedSubjectTab(sub);
                        setSelectedDate(""); // Clear date filter when switching tabs
                      }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {filteredGroup.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", width: "100%" }}>
                  {selectedDate ? "No attempts found for the selected date." : "No results found for this subject."}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", width: "100%" }}>
                  {filteredGroup.map((result) => {
                    const totalQuestions = result.total || 0;
                    const formattedTime = result.duration ? `${result.duration}m` : "N/A";
                    
                    return (
                      <div 
                        key={result._id} 
                        className="me-exam-card" 
                        style={{ 
                          cursor: "default", 
                          padding: "20px", 
                          display: "flex", 
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "14px",
                          minHeight: "230px",
                          boxSizing: "border-box"
                        }}
                      >
                        <div>
                          {/* Top row: Mock badge + Status */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", padding: "4px 8px", borderRadius: "6px", backgroundColor: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3", letterSpacing: "0.5px" }}>
                              {result.quizType === "practice" ? "Practice" : "Mock"}
                            </span>
                            <span style={{ color: "#10B981", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                              <CheckCircle size={14} /> Attempted
                            </span>
                          </div>

                          {/* Title */}
                          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px 0", lineHeight: "1.4", textAlign: "left" }}>
                            {result.quizTitle || result.subject || result.examName || "Mock Test"}
                          </h3>

                          {/* Meta info */}
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                            <span><strong>Subject:</strong> {result.subject || "General"}</span>
                            <span>•</span>
                            <span><strong>Qs:</strong> {totalQuestions}</span>
                            <span>•</span>
                            <span><strong>Time:</strong> {formattedTime}</span>
                          </div>

                          {/* Score / Status */}
                          {result.showResultAfterSubmission !== false ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", backgroundColor: "rgba(110, 63, 243, 0.03)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Score:</span>
                                <span style={{ color: "#10B981" }}>{result.score}/{result.total} ({result.percentage || 0}%)</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Accuracy:</span>
                                <span style={{ color: "#3B82F6" }}>{result.total > 0 ? Math.round((result.correct / ((result.correct + result.incorrect) || 1)) * 100) || 0 : 0}%</span>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: "12px", fontStyle: "italic", color: "var(--text-muted)", marginBottom: "12px" }}>
                              Evaluation completed. Result release pending.
                            </div>
                          )}
                        </div>

                        {/* Bottom Action buttons */}
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button 
                            onClick={() => navigate(`/student/result/${result.shareId}`, { state: { ...result, fromAttempts: true } })}
                            style={{ flex: 1, padding: "10px", background: "transparent", color: "#6E3FF3", border: "1.5px solid #6E3FF3", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
                          >
                            Result
                          </button>
                          {result.quizId && (result.quizType === "practice" || result.allowReattempt !== false) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate("/start-test", {
                                  state: {
                                    preSelectedQuizId: result.quizId,
                                    subject: result.subject || result.quizTitle || result.examName,
                                    quizId: result.quizId,
                                    quizTitle: result.quizTitle,
                                    duration: 30,
                                  },
                                });
                              }}
                              style={{ flex: 1, padding: "10px", background: "#1F1D2B", color: "#ffffff", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
                            >
                              Reattempt
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubjectResults;
