import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, ChevronDown, ChevronRight, CheckCircle, Target, Award, Trophy } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css"; 
import "../css/Practice.css";

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


              <div className="practice-grid">
                {examNames.map((examName, index) => {
                  const group = examGroups[examName];
                  const count = group.length;
                  
                  // Compute some stats for the card
                  const avgScore = group.reduce((sum, r) => sum + (r.percentage || ((r.score / (r.total || 1)) * 100)), 0) / count;
                  const avgAccuracy = group.reduce((sum, r) => sum + (r.total > 0 ? ((r.correct || 0) / ((r.correct || 0) + (r.incorrect || 0) || 1)) * 100 : 0), 0) / count;
                  
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
                    <div key={examName} className="practice-card">
                      <div className="practice-card-header">
                        <div className="practice-subject-badge" style={{ backgroundColor: color.bg, color: color.text }}>
                          <span className="dot" style={{ backgroundColor: color.dot }}></span>
                          Performance History
                        </div>
                      </div>
                      
                      <h3 className="practice-quiz-title">{examName}</h3>
                      <p className="practice-quiz-desc">
                        Review your historical performance and analytics for this test.
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

                      <button 
                        className="practice-start-btn"
                        onClick={() => navigate(`/dashboard/results/${encodeURIComponent(examName)}`, { state: { group } })}
                      >
                        <FileText size={16} />
                        View Details
                      </button>
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

