import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { FileText, ChevronRight, ArrowLeft, Calendar } from "lucide-react";
import axios from "axios";
import "../css/StudentDashboard.css";
import "../css/StudentResults.css";
import "../css/Practice.css";
import MuiDatePicker from "../components/MuiDatePicker";

function SubjectResults() {
  const { subject } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const decodedSubjectRaw = decodeURIComponent(subject);
  const decodedSubject = decodedSubjectRaw.includes(" - ") && (decodedSubjectRaw.split(" - ")[0].trim() === decodedSubjectRaw.split(" - ")[1].trim())
    ? decodedSubjectRaw.split(" - ")[0].trim()
    : decodedSubjectRaw;

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

          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id || user._id}`);
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

  const filteredGroup = selectedDate
    ? group.filter((result) => {
        if (!result.createdAt) return false;
        const resultDate = new Date(result.createdAt).toISOString().split("T")[0];
        return resultDate === selectedDate;
      })
    : group;

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Results" />

        <div className="sd-content" style={{ paddingTop: '20px' }}>
          <div className="practice-header-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "32px" }}>
            
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
                <h1 className="practice-title" style={{ margin: "0 0 4px 0" }}>
                  {decodedSubject} Attempts
                </h1>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
                  Review all your test attempts for this subject.
                </p>
              </div>
            </div>

            {/* Calendar Widget on Right */}
            <div style={{ width: "180px" }}>
              <MuiDatePicker value={selectedDate} onChange={setSelectedDate} label="mm-dd-yyyy" />
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
                    <button 
                      className="sr-view-details-btn" 
                      style={{ padding: "8px 12px", fontSize: "12px", cursor: "pointer" }}
                      onClick={() => navigate(`/student/result/${result.shareId}`, { state: result })}
                    >
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
