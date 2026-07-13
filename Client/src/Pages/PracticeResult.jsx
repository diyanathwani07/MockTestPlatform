import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { Trophy, Clock, Target, AlertTriangle, ArrowRight, RotateCcw, CheckCircle, Percent } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/Practice.css";

function PracticeResult() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { quizId, title, stats } = location.state || {};

  if (!stats) {
    return (
      <div className="sd-layout">
        <StudentSidebar />
        <div className="sd-main-content">
          <StudentNavbar title="Practice Complete" />
          <div className="sd-empty" style={{ marginTop: "100px" }}>
            <h3>No result data found.</h3>
            <button className="practice-btn-primary" onClick={() => navigate("/dashboard/practice")}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const { totalQuestions, firstTryCorrect, multipleTries, totalWrongAttempts, timeSpent } = stats;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const accuracy = totalQuestions > 0 ? Math.round((firstTryCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Practice Complete" />
        <div className="practice-result-container">
          
          <div className="pr-header">
            <div className="pr-icon-wrapper">
              <Trophy size={48} className="pr-trophy" />
            </div>
            <h2>Practice Session Completed!</h2>
            <p>You have successfully finished the practice module for <strong>{title || "this subject"}</strong>.</p>
          </div>

          <div className="pr-stats-grid">
            <div className="pr-stat-card">
              <div className="pr-stat-icon" style={{ color: "#8B5CF6", backgroundColor: "rgba(139, 92, 246, 0.1)" }}>
                <Target size={24} />
              </div>
              <div className="pr-stat-info">
                <h3>{totalQuestions}</h3>
                <p>Total Questions</p>
              </div>
            </div>

            <div className="pr-stat-card">
              <div className="pr-stat-icon" style={{ color: "#10B981", backgroundColor: "rgba(16, 185, 129, 0.1)" }}>
                <CheckCircle size={24} />
              </div>
              <div className="pr-stat-info">
                <h3>{firstTryCorrect}</h3>
                <p>Correct on First Attempt</p>
              </div>
            </div>

            <div className="pr-stat-card">
              <div className="pr-stat-icon" style={{ color: "#F59E0B", backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                <RotateCcw size={24} />
              </div>
              <div className="pr-stat-info">
                <h3>{multipleTries}</h3>
                <p>Required Multiple Tries</p>
              </div>
            </div>

            <div className="pr-stat-card">
              <div className="pr-stat-icon" style={{ color: "#EF4444", backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <AlertTriangle size={24} />
              </div>
              <div className="pr-stat-info">
                <h3>{totalWrongAttempts}</h3>
                <p>Total Wrong Attempts</p>
              </div>
            </div>

            <div className="pr-stat-card">
              <div className="pr-stat-icon" style={{ color: "#3B82F6", backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
                <Percent size={24} />
              </div>
              <div className="pr-stat-info">
                <h3>{accuracy}%</h3>
                <p>First-Try Accuracy</p>
              </div>
            </div>

            <div className="pr-stat-card">
              <div className="pr-stat-icon" style={{ color: "#6366F1", backgroundColor: "rgba(99, 102, 241, 0.1)" }}>
                <Clock size={24} />
              </div>
              <div className="pr-stat-info">
                <h3>{formatTime(timeSpent)}</h3>
                <p>Total Time Spent</p>
              </div>
            </div>
          </div>

          <div className="pr-actions">
            <button className="pr-btn-secondary" onClick={() => navigate(`/practice/${quizId}?restart=true`)}>
              <RotateCcw size={18} />
              Practice Again
            </button>
            <button className="pr-btn-primary" onClick={() => navigate("/dashboard/practice")}>
              Back to Dashboard
              <ArrowRight size={18} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PracticeResult;
