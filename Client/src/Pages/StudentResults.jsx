import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, ChevronDown, ChevronRight, CheckCircle, Target, Award, Trophy } from "lucide-react";
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
                        className={`me-exam-card`}
                        onClick={() => navigate(`/dashboard/results/${encodeURIComponent(examName)}`, { state: { group } })}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="me-card-top">
                          <div className="me-card-left">
                            <div className="me-icon-wrapper" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                              <Trophy size={20} />
                            </div>
                            <div className="me-exam-name">{examName}</div>
                          </div>
                          <div className="me-chevron">
                            <ChevronRight size={20} />
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

