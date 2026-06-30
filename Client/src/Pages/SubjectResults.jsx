import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { FileText, ChevronRight, ArrowLeft, Calendar } from "lucide-react";
import axios from "axios";
import "../css/StudentDashboard.css";

function SubjectResults() {
  const { subject } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const decodedSubject = decodeURIComponent(subject);

  const [group, setGroup] = useState(location.state?.group || []);
  const [loading, setLoading] = useState(!location.state?.group);
  const [selectedDate, setSelectedDate] = useState("");
  const dateInputRef = useRef(null);

  useEffect(() => {
    if (group.length === 0) {
      const fetchResults = async () => {
        try {
          const userStr = localStorage.getItem("user");
          if (!userStr) return navigate("/login");
          const user = JSON.parse(userStr);

          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id}`);
          const subjectGroup = res.data.filter(
            (r) => (r.subject || r.quizTitle || r.examName || "Mock Test") === decodedSubject
          );
          setGroup(subjectGroup);
        } catch (error) {
          console.error("Error fetching subject results:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchResults();
    }
  }, [decodedSubject, group.length, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredGroup = selectedDate
    ? group.filter((result) => {
        if (!result.createdAt) return false;
        const resultDate = new Date(result.createdAt).toISOString().split("T")[0];
        return resultDate === selectedDate;
      })
    : group;

  return (
    <div className="admin-layout" style={{ display: "flex", width: "100%", height: "100vh", backgroundColor: "var(--bg-page)" }}>
      <StudentSidebar />
      <div className="admin-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-page)" }}>
        <StudentNavbar title={`${decodedSubject} Results`} />

        <div className="admin-content" style={{ flex: 1, overflowY: "auto", padding: "24px", position: "relative" }}>
          <div className="manage-command-bar-card" style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button 
                onClick={() => navigate("/dashboard/results")}
                style={{
                  background: "transparent", border: "1px solid var(--border-color)", borderRadius: "8px",
                  width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--text-primary)"
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", fontFamily: "'Fraunces', serif", margin: "0 0 4px 0" }}>
                  {decodedSubject} Attempts
                </h2>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                  Review all your test attempts for this subject.
                </p>
              </div>
            </div>

            {/* Calendar Widget on Right */}
            <div 
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "rgba(110, 63, 243, 0.08)",
                border: "1px solid rgba(110, 63, 243, 0.2)",
                padding: "10px 16px",
                borderRadius: "12px",
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                position: "relative",
                cursor: "pointer"
              }}
              onClick={() => dateInputRef.current?.showPicker()}
            >
              <style>
                {`
                  .custom-date-picker::-webkit-calendar-picker-indicator {
                    display: none;
                    -webkit-appearance: none;
                  }
                  .custom-date-picker {
                    color-scheme: dark;
                  }
                `}
              </style>
              <Calendar size={18} style={{ color: "var(--violet)", pointerEvents: "none" }} />
              <input
                ref={dateInputRef}
                type="date"
                className="custom-date-picker"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "14px",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  style={{
                    background: "rgba(110, 63, 243, 0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--violet)",
                    marginLeft: "4px"
                  }}
                  title="Clear Date Filter"
                >
                  &times;
                </button>
              )}
            </div>

          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <div className="sd-spinner"></div>
            </div>
          ) : filteredGroup.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              {selectedDate ? "No attempts found for the selected date." : "No results found for this subject."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start" }}>
              {filteredGroup.map((result) => (
                <div className="sr-result-card" key={result._id} style={{ width: "100%", maxWidth: "750px", padding: "12px 16px", gap: "12px" }}>
                  <div className="sr-card-left" style={{ gap: "12px", flex: 1 }}>
                    <div className="sr-icon-box" style={{ width: "40px", height: "40px", borderRadius: "10px" }}>
                      <FileText size={18} className="sr-file-icon" />
                    </div>
                    <div className="sr-info">
                      <h2 style={{ fontSize: "15px", marginBottom: "4px" }}>{result.quizTitle || result.subject || result.examName || "Mock Test"}</h2>
                      <p style={{ fontSize: "12px", marginBottom: "6px" }}>Attempted on {formatDate(result.createdAt)}</p>
                      <span className="sr-badge-completed" style={{ fontSize: "10px", padding: "2px 8px" }}>Completed</span>
                    </div>
                  </div>
                  <div className="sr-card-stats" style={{ gap: "16px", flex: 1.5 }}>
                    <div className="sr-stat-group">
                      <span className="sr-stat-label" style={{ fontSize: "11px" }}>Score</span>
                      <span className="sr-stat-value sr-val-score" style={{ fontSize: "15px" }}>{result.score} / {result.total}</span>
                      <span className="sr-stat-sub" style={{ fontSize: "10px" }}>{result.percentage ? result.percentage : ((result.score / (result.total || 1)) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="sr-stat-divider" style={{ height: "28px" }}></div>
                    <div className="sr-stat-group">
                      <span className="sr-stat-label" style={{ fontSize: "11px" }}>Accuracy</span>
                      <span className="sr-stat-value sr-val-accuracy" style={{ fontSize: "15px", marginBottom: "10px" }}>
                        {result.total > 0 ? Math.round((result.correct / ((result.correct + result.incorrect) || 1)) * 100) || 0 : 0}%
                      </span>
                    </div>
                    <div className="sr-stat-divider" style={{ height: "28px" }}></div>
                    <div className="sr-stat-group">
                      <span className="sr-stat-label" style={{ fontSize: "11px" }}>Rank</span>
                      <span className="sr-stat-value sr-val-rank" style={{ fontSize: "15px", marginBottom: "10px" }}>#{Math.floor(Math.random() * 50) + 1}</span>
                    </div>
                  </div>
                  <div className="sr-card-right" style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 0.6 }}>
                    <button className="sr-view-details-btn" style={{ padding: "8px 12px", fontSize: "12px" }}>
                      View Details <ChevronRight size={14} />
                    </button>
                    {result.quizId && (
                      <button 
                        className="sr-view-details-btn" 
                        style={{ backgroundColor: "#F3F4F6", color: "#6E3FF3", border: "1px solid #E2E8F0", padding: "8px 12px", fontSize: "12px", justifyContent: "center" }}
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
                      >
                        Reattempt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubjectResults;
