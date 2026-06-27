import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css"; // Reuse layout styles
import "../css/StudentResults.css";

function StudentResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("All Exams");
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
    return new Date(dateString).toLocaleDateString('en-GB').replace(/\//g, '-'); // e.g., 12-05-2025
  };

  const uniqueSubjects = Array.from(new Set(results.map(r => r.subject || r.quizTitle || r.examName || "Mock Test")));
  const filteredResults = selectedSubject === "All Exams" 
    ? results 
    : results.filter(r => (r.subject || r.quizTitle || r.examName || "Mock Test") === selectedSubject);

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Results" />
        <div className="sr-container">
          <div className="sr-header-area">
        <div className="sr-header-text">
          <h1>Results</h1>
          <p>Track your performance and improvement over time.</p>
        </div>
        <div className="sr-header-actions">
          <div className="sr-select-wrapper">
            <select 
              className="sr-select" 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="All Exams">All Exams</option>
              {uniqueSubjects.map((sub, i) => (
                <option key={i} value={sub}>{sub}</option>
              ))}
            </select>
            <ChevronDown className="sr-select-icon" size={16} />
          </div>
          <button className="sr-calendar-btn">
            <Calendar size={18} />
          </button>
        </div>
      </div>

      <div className="sr-results-list">
        {loading ? (
          <div className="sr-loading">Loading results...</div>
        ) : filteredResults.length === 0 ? (
          <div className="sr-empty">No results found for this selection.</div>
        ) : (
          filteredResults.map((result) => (
            <div className="sr-result-card" key={result._id}>
              
              {/* Left Section: Icon & Info */}
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

              {/* Middle Section: Stats */}
              <div className="sr-card-stats">
                <div className="sr-stat-group">
                  <span className="sr-stat-label">Score</span>
                  <span className="sr-stat-value sr-val-score">{result.score} / {result.total}</span>
                  <span className="sr-stat-sub">{result.percentage ? result.percentage : ((result.score / result.total) * 100).toFixed(0)}%</span>
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
                
                {/* Percentile omitted as requested */}
              </div>

              {/* Right Section: Action */}
              <div className="sr-card-right">
                <button className="sr-view-details-btn">
                  View Details <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && results.length > 0 && (
        <div className="sr-info-footer">
          <div className="sr-info-pill">
            <span className="sr-info-icon-small">ℹ️</span>
            Results are updated instantly after you submit the exam.
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default StudentResults;
