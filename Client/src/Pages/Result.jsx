import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuizHeader from "../components/QuizHeader";
import "../css/Result.css";
import axios from "axios";
import { Trophy, FileText, CalendarDays, Clock, HelpCircle, Target, XCircle, Timer, TrendingUp, Medal, ArrowLeft } from "lucide-react";

function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  // data is sent via navigate("/result", { state: data }) from Quiz.jsx
  const [data, setData] = useState(() => {
    let initialData = location.state;
    if (!initialData) {
      const stored = localStorage.getItem("lastQuizResult");
      if (stored && stored !== "undefined") {
        try {
          initialData = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse cached result data", e);
        }
      }
    }
    return initialData;
  });

  let user = { name: "User" };
  try {
    const userString = localStorage.getItem("user");
    if (userString && userString !== "undefined") {
      user = JSON.parse(userString);
    }
  } catch (e) {
    console.error("Failed to parse user from localStorage", e);
  }
  const [loadingLatest, setLoadingLatest] = useState(!data);

  useEffect(() => {
    if (data) {
      localStorage.setItem("lastQuizResult", JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    if (!data && user?.id) {
      const fetchLatest = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id}`);
          if (res.data && res.data.length > 0) {
            setData(res.data[0]);
          }
        } catch (err) {
          console.error("Failed to fetch latest result", err);
        } finally {
          setLoadingLatest(false);
        }
      };
      fetchLatest();
    } else {
      setLoadingLatest(false);
    }
  }, []);

  const score = data?.score ?? 0;
  const total = data?.total ?? 0;
  const correct = data?.correct ?? 0;
  const incorrect = data?.incorrect ?? 0;
  const unanswered = data?.unanswered ?? 0;
  const percentage = data?.percentage;
  const questions = data?.questions ?? [];
  const userAnswers = data?.userAnswers ?? [];
  // Read subject from navigation state (set by Quiz.jsx), then localStorage, then fallback
  const examTitle = data?.subject || data?.title || localStorage.getItem("lastExamTaken") || "Examination";

  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 300) {
        setVisibleCount((prevCount) => Math.min(prevCount + 10, questions.length));
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [questions.length]);

  const computedPercentage =
    percentage !== undefined && percentage !== null
      ? Number(percentage).toFixed(2)
      : total
      ? ((score / total) * 100).toFixed(2)
      : "0.00";

  // Save result to MongoDB whenever this page loads with valid data
  useEffect(() => {
    if (!data) return; // nothing to save if user landed here without quiz data

    console.log("Result Page Loaded");

    if (data?.isPreview) {
      console.log("PREVIEW MODE: Skipping result save.");
      return;
    }

    const saveResult = async () => {
      try {
        console.log("Saving Result...");

        const userString = localStorage.getItem("user");
        console.log("user from localStorage:", userString);

        const user = userString ? JSON.parse(userString) : null;

        if (!user || !user.id) {
          console.log("SAVE SKIPPED: no logged-in user found in localStorage");
          return;
        }

        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/results/save`,
          {
            userId: user.id,
            quizId: data?.quizId || null,
            quizTitle: data?.title || null,
            subject: data?.subject || null,
            score,
            total,
            correct,
            incorrect,
            percentage: Number(computedPercentage),
          }
        );

        console.log("Result Saved");
        console.log(res.data);
      } catch (error) {
        console.log("SAVE ERROR");
        console.log(error);
      }
    };

    saveResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadingLatest) {
    return (
      <div className="result-page">
        <QuizHeader title={examTitle} showInstructions={false} />
        <div className="result-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="sd-spinner"></div>
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>Fetching your latest result...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="result-page">
        <QuizHeader title={examTitle} showInstructions={false} />
        <div className="result-empty">
          <h2>No result data found.</h2>
          <p>Please attempt the test first.</p>
          <button className="back-btn" onClick={() => navigate("/")}>
            Go to Test
          </button>
        </div>
      </div>
    );
  }

  const [showAnswers, setShowAnswers] = useState(false);
  const timeTakenSecs = data?.timeTaken || 0;
  
  const formatTime = (seconds) => {
    if (!seconds) return "0m 0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  return (
    <div className={`result-page-new ${showAnswers ? "show-answers" : ""}`}>
      
      {!showAnswers && (
        <div className="result-modal-overlay">
          <div className="result-modal-card">
            
            {/* Header */}
            <div className="rm-header">
              <div className="rm-trophy" style={{ display: "flex", justifyContent: "center", marginBottom: "16px", color: "#F59E0B" }}>
                <Trophy size={64} strokeWidth={1.5} />
              </div>
              <h2>Quiz Completed!</h2>
              <p>Great job, <strong>{user.name || user.fullName}</strong>! You've completed the quiz.</p>
            </div>

            {/* Quiz Info */}
            <div className="rm-info-card">
              <div className="rm-icon-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#6E3FF3", backgroundColor: "rgba(110,63,243,0.1)", borderRadius: "12px", width: "48px", height: "48px" }}>
                <FileText size={24} />
              </div>
              <div className="rm-info-content">
                <p className="rm-info-label">Quiz Title</p>
                <h3 className="rm-info-title">{examTitle}</h3>
                <div className="rm-info-meta" style={{ flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}><CalendarDays size={14} /> {formattedDate}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}><Clock size={14} /> {data?.duration || 30} Min</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}><HelpCircle size={14} /> {total} Questions</span>
                </div>
              </div>
            </div>

            {/* Score Section */}
            <div className="rm-score-section">
              <div className="rm-score-circle-wrapper">
                <div className="rm-score-circle" style={{ background: `conic-gradient(#6E3FF3 ${computedPercentage}%, #F3F4F6 ${computedPercentage}%)` }}>
                  <div className="rm-score-inner">
                    <span className="rm-pct">{computedPercentage}%</span>
                    <span className="rm-pct-label">Score</span>
                  </div>
                </div>
              </div>
              
              <div className="rm-score-middle">
                <p className="rm-score-label">Your Score</p>
                <h2 className="rm-score-fraction">
                  <span className="rm-score-num">{score}</span>
                  <span className="rm-score-denom">/{total}</span>
                </h2>
                <div className={`rm-badge ${computedPercentage >= 50 ? "badge-pass" : "badge-fail"}`}>
                  {computedPercentage >= 50 ? "Passed 🎉" : "Failed 😢"}
                </div>
              </div>

              <div className="rm-score-right">
                <div className="rm-medal" style={{ display: "flex", justifyContent: "center", marginBottom: "8px", color: "#F59E0B" }}>
                  <Medal size={40} strokeWidth={1.5} />
                </div>
                <h4 className="rm-feedback-title">
                  {computedPercentage >= 80 ? "Excellent Work!" : computedPercentage >= 50 ? "Good Job!" : "Keep Trying!"}
                </h4>
                <p className="rm-feedback-text">
                  {computedPercentage === 0 
                    ? "Don't give up! Review your answers and try again." 
                    : <>You scored higher than <strong>{computedPercentage}%</strong> of users</>
                  }
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
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
                  <h4>{formatTime(timeTakenSecs)}</h4>
                  <p>Time Taken</p>
                </div>
              </div>
              <div className="rm-metric">
                <div className="rm-metric-icon icon-blue" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={24} /></div>
                <div className="rm-metric-data">
                  <h4>{computedPercentage}%</h4>
                  <p>Accuracy</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="rm-actions">
              <button className="rm-btn-outline" onClick={() => setShowAnswers(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <FileText size={18} /> Review Answers
              </button>
              <button className="rm-btn-solid" onClick={() => navigate("/")}>
                Back to Dashboard →
              </button>
            </div>

            {/* Social Share */}
            <div className="rm-social-share">
              <p>Share Your Result</p>
              <div className="rm-social-icons">
                <button title="Share on WhatsApp" onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`I scored ${score}/${total} on the ${examTitle} test! Can you beat my score?`)}`, '_blank')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#25D366" }}>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </button>
                <button title="Share on Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#1877F2" }}>
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </button>
                <button title="Share on Instagram" onClick={() => { navigator.clipboard.writeText(`I scored ${score}/${total} on the ${examTitle} test!`); alert("Result text copied! Open Instagram to share it."); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#E1306C" }}>
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </button>
                <button title="Copy Link" onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied to clipboard!"); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6B7280" }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnswers && (
        <div className="result-review-container">
          
          <div className="result-details" style={{ marginTop: "0" }}>
            {/* Fixed Back Button in Absolute Top Left Corner */}
            <button 
              onClick={() => setShowAnswers(false)}
              style={{
                position: "fixed",
                top: "20px",
                left: "20px",
                zIndex: 110,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                border: "1px solid #d1d5db",
                color: "#000000",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Back to Summary"
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>

            {/* Sticky Title */}
            <div style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 70px 20px",
              backgroundColor: "#EAEBF3",
              marginBottom: "24px",
              margin: "-20px -16px 24px -16px",
            }}>
              <h2 style={{ fontSize: "clamp(18px, 4vw, 26px)", margin: 0, lineHeight: "1.3", color: "#000000", textAlign: "center" }}>Answer Review - {examTitle}</h2>
            </div>

            <div className="review-list">
              {questions.slice(0, visibleCount).map((q, index) => {
                const userAns = userAnswers[index];
                const isCorrect = q.correctAnswer
                  ? userAns === q.correctAnswer
                  : undefined;

                return (
                  <div className="review-item" key={q.id || index}>
                    <div className="review-question" style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <span className="q-number" style={{ minWidth: "30px", fontWeight: "700", color: "var(--violet)" }}>Q{index + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px", fontSize: "16px", lineHeight: "1.5" }}>{q.english}</div>
                        {q.hindi && <div style={{ fontWeight: "500", color: "var(--text-secondary)", marginBottom: "12px", fontSize: "15px", lineHeight: "1.5" }}>{q.hindi}</div>}
                      </div>
                    </div>

                    <div className="review-options" style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                      {q.options && q.options.length > 0 ? q.options.map((opt, optIdx) => {
                        const isSelected = userAns === opt;
                        const isCorrectOpt = q.correctAnswer === opt;
                        
                        let optBg = "var(--card-bg)";
                        let optBorder = "1px solid var(--border-color)";
                        let optColor = "var(--text-primary)";
                        let optWeight = "500";
                        
                        if (isCorrectOpt) {
                          optBg = "#dcfce7";
                          optBorder = "1px solid #22c55e";
                          optColor = "#166534";
                          optWeight = "600";
                        } else if (isSelected && !isCorrectOpt) {
                          optBg = "#fee2e2";
                          optBorder = "1px solid #ef4444";
                          optColor = "#991b1b";
                        }
                        
                        return (
                          <div key={optIdx} style={{ 
                            padding: "12px 16px", 
                            borderRadius: "10px", 
                            backgroundColor: optBg, 
                            border: optBorder,
                            color: optColor,
                            fontWeight: optWeight,
                            fontSize: "14.5px",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            transition: "all 0.2s"
                          }}>
                            <span style={{ 
                              width: "26px", 
                              height: "26px", 
                              borderRadius: "50%", 
                              backgroundColor: isCorrectOpt ? "#22c55e" : (isSelected && !isCorrectOpt ? "#ef4444" : "var(--bg-page)"),
                              color: isCorrectOpt || (isSelected && !isCorrectOpt) ? "#fff" : "var(--text-muted)",
                              border: isCorrectOpt || (isSelected && !isCorrectOpt) ? "none" : "1px solid var(--border-color)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "13px",
                              fontWeight: "700",
                              flexShrink: 0
                            }}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span style={{ lineHeight: "1.4" }}>{opt}</span>
                          </div>
                        );
                      }) : (
                        <div style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "14px" }}>No options available.</div>
                      )}
                    </div>

                    <div className="review-answers" style={{ marginTop: "16px" }}>
                      <div style={{ marginBottom: "16px", fontSize: "14.5px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <strong>Your Answer: </strong>
                        <span
                          className={
                            userAns === undefined
                              ? "unanswered-text"
                              : isCorrect === false
                              ? "wrong-text"
                              : "correct-text"
                          }
                          style={{ padding: "4px 10px", borderRadius: "6px", backgroundColor: "var(--bg-page)", border: "1px solid var(--border-color)", fontWeight: "600", whiteSpace: "nowrap" }}
                        >
                          {userAns !== undefined ? userAns : "Not Answered"}
                        </span>
                      </div>
                      
                      {q.explanation && (
                        <div style={{ marginTop: "20px", padding: "16px 20px", backgroundColor: "var(--bg-sidebar)", borderLeft: "4px solid var(--violet)", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--violet)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>💡</span> Explanation
                          </p>
                          <p style={{ margin: 0, fontSize: "14.5px", color: "var(--text-secondary)", lineHeight: "1.6" }}>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="result-actions" style={{ marginTop: "40px", paddingBottom: "60px", display: "flex", justifyContent: "center", gap: "16px" }}>
              <button 
                className="rm-btn-outline" 
                style={{ padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
                onClick={() => setShowAnswers(false)}
              >
                ← Back to Summary
              </button>
              <button 
                className="rm-btn-solid" 
                style={{ padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
                onClick={() => navigate("/")}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Result;