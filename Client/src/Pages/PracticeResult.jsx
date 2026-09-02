import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { Trophy, Clock, Target, AlertTriangle, ArrowRight, RotateCcw, CheckCircle, Percent } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/Practice.css";

function PracticeResult() {
  const { resultId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(!!resultId);
  const [error, setError] = useState("");
  const [resultData, setResultData] = useState(null);

  const activeData = resultData || location.state || {};
  const { quizId, title, stats, showResultAfterSubmission = true } = activeData;

  useEffect(() => {
    if (!resultId) {
      setLoading(false);
      return;
    }

    const fetchResult = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/practice/result/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = res.data;
        setResultData({
          quizId: data.practiceQuizId,
          title: data.title,
          stats: {
            totalQuestions: data.stats.totalQuestions,
            firstTryCorrect: data.stats.firstTryCorrect,
            multipleTries: data.stats.multipleTries,
            totalWrongAttempts: data.stats.totalWrongAttempts,
            timeSpent: data.stats.timeSpent
          },
          showResultAfterSubmission: true
        });
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch practice result:", err);
        if (err.response?.status === 403) {
           setError("You do not have permission to view this result.");
        } else if (err.response?.status === 404) {
           setError("Practice result not found.");
        } else {
           setError("An error occurred while fetching the result.");
        }
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId]);

  if (loading) {
    return (
      <div className="sd-layout">
        <StudentSidebar />
        <div className="sd-main-content">
          <StudentNavbar title="Practice Complete" />
          <div className="sd-empty" style={{ marginTop: "100px" }}>
             <p style={{ color: "#a78bfa" }}>Loading your result...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sd-layout">
        <StudentSidebar />
        <div className="sd-main-content">
          <StudentNavbar title="Practice Complete" />
          <div className="sd-empty" style={{ marginTop: "100px" }}>
            <h3 style={{ color: "#EF4444", marginBottom: "16px" }}>{error}</h3>
            <button className="practice-btn-primary" onClick={() => navigate("/dashboard/practice")}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="sd-layout">
        <StudentSidebar />
        <div className="sd-main-content">
          <StudentNavbar title="Practice Complete" />
          <div className="sd-empty" style={{ marginTop: "100px" }}>
            <h3 style={{ marginBottom: "16px" }}>No result data found.</h3>
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
        <div className="practice-result-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", maxWidth: "680px", margin: "0 auto", animation: "fadeIn 0.5s ease" }}>
          
          {/* Confetti & Trophy wrapper */}
          <div style={{ position: "relative", marginBottom: "32px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            {/* Dots / Confetti background decorator */}
            <div style={{ position: "absolute", width: "160px", height: "160px", pointerEvents: "none", opacity: 0.8, background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)" }} />
            <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 25px rgba(124, 58, 237, 0.3)" }}>
              <Trophy size={48} color="#ffffff" />
            </div>
          </div>

          <div className="pr-header" style={{ marginBottom: "32px", textAlign: "center" }}>
            <h2 style={{ fontSize: "32px", fontWeight: "800", color: "#ffffff", marginBottom: "16px", letterSpacing: "-0.5px" }}>
              Practice Session <span style={{ color: "#a78bfa" }}>Completed!</span>
            </h2>
            <p style={{ fontSize: "16px", color: "#94a3b8", lineHeight: "1.6", margin: 0, maxWidth: "540px" }}>
              You have successfully finished the practice module for{" "}
              <strong style={{ color: "#a78bfa", fontWeight: "700" }}>{title || "this subject"}</strong>.
            </p>
          </div>

          {/* Success card block */}
          <div style={{ background: "rgba(30, 27, 75, 0.3)", border: "1.5px solid rgba(139, 92, 246, 0.2)", borderRadius: "20px", padding: "28px 24px", display: "flex", alignItems: "center", gap: "20px", width: "100%", boxSizing: "border-box", marginBottom: "40px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "rgba(139, 92, 246, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CheckCircle size={24} color="#8b5cf6" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>Well done!</h4>
              <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8", lineHeight: "1.5" }}>Keep practicing to strengthen your understanding and improve your performance.</p>
            </div>
          </div>

          {/* Buttons block */}
          <div className="pr-actions" style={{ display: "flex", gap: "20px", width: "100%", justifyContent: "center", marginBottom: "40px" }}>
            <button 
              className="pr-btn-secondary" 
              onClick={() => navigate(`/dashboard/practice/test/${quizId}?restart=true`)}
              style={{ flex: 1, maxWidth: "240px", border: "1.5px solid rgba(255, 255, 255, 0.15)", color: "#ffffff", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "14px 28px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s" }}
            >
              <RotateCcw size={18} />
              Practice Again
            </button>
            <button 
              className="pr-btn-primary" 
              onClick={() => navigate("/dashboard/practice")}
              style={{ flex: 1, maxWidth: "240px", background: "#7c3aed", border: "none", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "14px 28px", borderRadius: "14px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)" }}
            >
              Back to Dashboard
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Quote footer */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderTop: "1.5px solid rgba(255,255,255,0.06)", paddingTop: "24px", width: "100%", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>Every practice brings you one step closer to your goal.</p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PracticeResult;
