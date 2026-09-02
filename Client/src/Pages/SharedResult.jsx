import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Trophy, CalendarDays, HelpCircle, Target, XCircle, Timer, TrendingUp, Medal, ShieldAlert } from "lucide-react";
import "../css/Result.css";

function SharedResult() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSharedResult = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/share/${shareId}`);
        setData(res.data);
      } catch (err) {
        if (err.response && err.response.status === 403) {
          setError("This result is marked as private by the student.");
        } else if (err.response && err.response.status === 404) {
          setError("Result not found. The link might be invalid or expired.");
        } else {
          setError("Failed to load the result. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSharedResult();
  }, [shareId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
        <div className="sd-spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(110, 63, 243, 0.2)', borderTopColor: 'var(--violet)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Loading result...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-page)', padding: '20px' }}>
        <ShieldAlert size={64} color="#EF4444" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>{error}</p>
        <button 
          onClick={() => navigate("/")}
          style={{ marginTop: '24px', padding: '12px 24px', backgroundColor: 'var(--violet)', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { quizTitle, score, percentage, correct, incorrect, timeTaken, createdAt, studentName } = data;

  const formatTime = (seconds) => {
    if (!seconds) return "0m 0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formattedDate = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="result-page-new" style={{ minHeight: "100vh", padding: "40px 20px" }}>
      <div className="result-modal-overlay" style={{ position: "relative", backgroundColor: "transparent" }}>
        <div className="result-modal-card">
          
          <div style={{ textAlign: "center", marginBottom: "16px", color: "var(--violet)", fontWeight: "800", letterSpacing: "2px", fontSize: "18px" }}>
            MOCKTESTPLATFORM
          </div>
          
          <div className="rm-header">
            <div className="rm-trophy" style={{ display: "flex", justifyContent: "center", marginBottom: "12px", color: "#F59E0B" }}>
              <Trophy size={56} strokeWidth={1.5} />
            </div>
            {data.isVerified && (
              <h2 style={{ color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "22px", marginBottom: "12px" }}>
                ✓ VERIFIED RESULT
              </h2>
            )}
            <p style={{ fontSize: "16px" }}>Candidate Name: <strong>{studentName}</strong></p>
          </div>

          <div className="rm-info-card">
            <div className="rm-icon-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#6E3FF3", backgroundColor: "rgba(110,63,243,0.1)", borderRadius: "12px", width: "48px", height: "48px" }}>
              <Medal size={24} />
            </div>
            <div className="rm-info-content">
              <p className="rm-info-label">Quiz Title</p>
              <h3 className="rm-info-title">{quizTitle}</h3>
              <div className="rm-info-meta" style={{ flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}><CalendarDays size={14} /> {formattedDate}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}><HelpCircle size={14} /> Attempted</span>
              </div>
            </div>
          </div>

          <div className="rm-score-section">
            <div className="rm-score-circle-wrapper">
              <div className="rm-score-circle" style={{ background: `conic-gradient(#6E3FF3 ${percentage}%, #F3F4F6 ${percentage}%)` }}>
                <div className="rm-score-inner">
                  <span className="rm-pct">{percentage}%</span>
                  <span className="rm-pct-label">Score</span>
                </div>
              </div>
            </div>
            
            <div className="rm-score-middle">
              <p className="rm-score-label">Total Score</p>
              <h2 className="rm-score-fraction" style={{ fontSize: '32px' }}>
                <span className="rm-score-num">{score}</span>
              </h2>
              <div className={`rm-badge ${percentage >= (data.passPercentage ?? 50) ? "badge-pass" : "badge-fail"}`}>
                {percentage >= (data.passPercentage ?? 50) ? "Passed 🎉" : "Failed 😢"}
              </div>
            </div>

            <div className="rm-score-right" style={{ justifyContent: 'center', textAlign: 'center', padding: '0 16px' }}>
               <p className="rm-feedback-text" style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                 Result ID / Verification ID
               </p>
               <p style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                 {data.resultId}
               </p>
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
            <p style={{ color: '#10B981', fontWeight: '600', fontSize: '14px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ShieldAlert size={18} /> This result was verified from the platform's records.
            </p>
          </div>

          <div className="rm-metrics-grid">
            <div className="rm-metric">
              <div className="rm-metric-icon icon-green" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Target size={24} /></div>
              <div className="rm-metric-data">
                <h4>{correct}</h4>
                <p>Correct Answers</p>
              </div>
            </div>
            <div className="rm-metric">
              <div className="rm-metric-icon icon-red" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><XCircle size={24} /></div>
              <div className="rm-metric-data">
                <h4>{incorrect}</h4>
                <p>Incorrect Answers</p>
              </div>
            </div>
            <div className="rm-metric">
              <div className="rm-metric-icon icon-orange" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><Timer size={24} /></div>
              <div className="rm-metric-data">
                <h4>{formatTime(timeTaken)}</h4>
                <p>Time Taken</p>
              </div>
            </div>
            <div className="rm-metric">
              <div className="rm-metric-icon icon-blue" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={24} /></div>
              <div className="rm-metric-data">
                <h4>{percentage}%</h4>
                <p>Accuracy</p>
              </div>
            </div>
          </div>

          <div className="rm-actions" style={{ marginTop: '24px', justifyContent: 'center' }}>
            <button className="rm-btn-solid" onClick={() => navigate("/")}>
              Create your own account →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SharedResult;
