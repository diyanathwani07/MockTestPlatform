import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, ChevronDown, ChevronRight, CheckCircle, Target, Award } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css"; 
import "../css/MyExams.css";
import "../css/StudentResults.css";

function StudentResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          setLoading(false);
          return;
        }
        const user = JSON.parse(userStr);
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id}`);
        setResults(res.data);
      } catch (error) {
        console.error("Error fetching results", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";
    return new Date(dateString).toLocaleDateString('en-GB').replace(/\//g, '-');
  };

  // Group by Exam Name or Subject
  const examGroups = results.reduce((acc, result) => {
    const groupKey = result.examName && result.subject 
      ? `${result.examName} - ${result.subject}` 
      : (result.examName || result.subject || result.quizTitle || "Mock Tests");
      
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(result);
    return acc;
  }, {});

  const examNames = Object.keys(examGroups);

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Results" />
        <div className="sd-content" style={{ paddingTop: '20px' }}>
          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner"></div>
              <p>Loading results...</p>
            </div>
          ) : examNames.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-icon">📭</div>
              <h3>No Results Found</h3>
              <p>You haven't attempted any exams yet.</p>
            </div>
          ) : (
            <>
              <div className="me-page-header">
                <h1 className="me-page-title">Results</h1>
                <p className="me-page-subtitle">Track your performance and improvement over time.</p>
              </div>

              <div className="me-section-title">ATTEMPTED EXAMS</div>
              <div className={`me-exam-container ${selectedExam ? "me-has-selection" : ""}`}>
                {examNames.map((examName) => {
                  const group = examGroups[examName];
                  const count = group.length;
                  const isSelected = selectedExam === examName;
                  
                  // Compute some stats for the card
                  const avgScore = group.reduce((sum, r) => sum + (r.percentage || ((r.score / (r.total || 1)) * 100)), 0) / count;
                  const avgAccuracy = group.reduce((sum, r) => sum + (r.total > 0 ? ((r.correct || 0) / ((r.correct || 0) + (r.incorrect || 0) || 1)) * 100 : 0), 0) / count;
                  
                  return (
                    <div className="me-exam-row-wrapper" key={examName}>
                      <div
                        className={`me-exam-card ${isSelected ? "me-exam-active" : ""}`}
                        onClick={() => setSelectedExam(isSelected ? null : examName)}
                      >
                        <div className="me-card-top">
                          <div className="me-card-left">
                            <div className="me-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                              🏆
                            </div>
                            <div className="me-exam-name">{examName}</div>
                          </div>
                          <div className="me-chevron">
                            <ChevronRight size={20} style={{ transform: isSelected ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                          </div>
                        </div>

                        <div className="me-divider"></div>

                        <div className="me-card-middle">
                          <div className="me-stat">
                            <CheckCircle className="me-stat-icon" size={16} />
                            <span>{count} Attempt{count !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="me-stat">
                            <Target className="me-stat-icon" size={16} />
                            <span>Avg {avgScore.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="sd-subjects-panel me-inline-panel" style={{ padding: "0 0 24px 0", background: "transparent", border: "none", boxShadow: "none", display: "flex", flexDirection: "column", gap: "16px", marginTop: 0 }}>
                          {group.map((result) => (
                            <div className="sr-result-card" key={result._id} style={{ margin: 0, width: "100%", maxWidth: "100%" }}>
                              <div className="sr-card-left">
                                <div className="sr-icon-box">
                                  <FileText size={24} className="sr-file-icon" />
                                </div>
                                <div className="sr-info">
                                  <h2>{result.quizTitle || result.subject || result.examName || "Mock Test"}</h2>
                                  <p>Attempted on {formatDate(result.createdAt)}</p>
                                  <span className="sr-badge-completed">Completed</span>
                                </div>
                              </div>
                              <div className="sr-card-stats">
                                <div className="sr-stat-group">
                                  <span className="sr-stat-label">Score</span>
                                  <span className="sr-stat-value sr-val-score">{result.score} / {result.total}</span>
                                  <span className="sr-stat-sub">{result.percentage ? result.percentage : ((result.score / (result.total || 1)) * 100).toFixed(0)}%</span>
                                </div>
                                <div className="sr-stat-divider"></div>
                                <div className="sr-stat-group">
                                  <span className="sr-stat-label">Accuracy</span>
                                  <span className="sr-stat-value sr-val-accuracy">
                                    {result.total > 0 ? Math.round((result.correct / (result.correct + result.incorrect || 1)) * 100) || 0 : 0}%
                                  </span>
                                </div>
                                <div className="sr-stat-divider"></div>
                                <div className="sr-stat-group">
                                  <span className="sr-stat-label">Rank</span>
                                  <span className="sr-stat-value sr-val-rank">#{Math.floor(Math.random() * 50) + 1}</span>
                                </div>
                              </div>
                              <div className="sr-card-right" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                <button className="sr-view-details-btn">
                                  View Details <ChevronRight size={16} />
                                </button>
                                {result.quizId && (
                                  <button 
                                    className="sr-view-details-btn" 
                                    style={{ backgroundColor: "#F3F4F6", color: "#6E3FF3", border: "1px solid #E2E8F0" }}
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
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentResults;

