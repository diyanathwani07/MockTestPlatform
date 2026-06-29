import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuizHeader from "../components/QuizHeader";
import "../css/Result.css";
import axios from "axios";

function Result({ inlineData }) {
  const location = useLocation();
  const navigate = useNavigate();

  // data is sent via navigate("/result", { state: data }) from Quiz.jsx, OR passed as a prop
  const data = inlineData || location.state;

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
  const user = JSON.parse(localStorage.getItem("user")) || { name: "User" };
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
              <div className="rm-trophy">
                🏆
              </div>
              <h2>Quiz Completed!</h2>
              <p>Great job, <strong>{user.name || user.fullName}</strong>! You've completed the quiz.</p>
            </div>

            {/* Quiz Info */}
            <div className="rm-info-card">
              <div className="rm-icon-wrapper">
                <span className="rm-icon">📝</span>
              </div>
              <div className="rm-info-content">
                <p className="rm-info-label">Quiz Title</p>
                <h3 className="rm-info-title">{examTitle}</h3>
                <div className="rm-info-meta">
                  <span>📅 {formattedDate}</span>
                  <span>⏱️ {data?.duration || 30} Min</span>
                  <span>❓ {total} Questions</span>
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
                <div className="rm-medal">🎖️</div>
                <h4 className="rm-feedback-title">
                  {computedPercentage >= 80 ? "Excellent Work!" : computedPercentage >= 50 ? "Good Job!" : "Keep Trying!"}
                </h4>
                <p className="rm-feedback-text">
                  You scored higher than <strong>{computedPercentage}%</strong> of users
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="rm-metrics-grid">
              <div className="rm-metric">
                <div className="rm-metric-icon icon-green">🎯</div>
                <div className="rm-metric-data">
                  <h4>{correct}</h4>
                  <p>Correct Answers</p>
                </div>
              </div>
              <div className="rm-metric">
                <div className="rm-metric-icon icon-red">❌</div>
                <div className="rm-metric-data">
                  <h4>{incorrect}</h4>
                  <p>Incorrect Answers</p>
                </div>
              </div>
              <div className="rm-metric">
                <div className="rm-metric-icon icon-orange">⏱️</div>
                <div className="rm-metric-data">
                  <h4>{formatTime(timeTakenSecs)}</h4>
                  <p>Time Taken</p>
                </div>
              </div>
              <div className="rm-metric">
                <div className="rm-metric-icon icon-blue">📈</div>
                <div className="rm-metric-data">
                  <h4>{computedPercentage}%</h4>
                  <p>Accuracy</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="rm-actions">
              <button className="rm-btn-outline" onClick={() => setShowAnswers(true)}>
                📄 Review Answers
              </button>
              <button className="rm-btn-solid" onClick={() => navigate("/")}>
                Back to Dashboard →
              </button>
            </div>

            {/* Social Share */}
            <div className="rm-social-share">
              <p>Share Your Result</p>
              <div className="rm-social-icons">
                <button>📱</button>
                <button>🐦</button>
                <button>💼</button>
                <button>🔗</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnswers && (
        <div className="result-review-container">
          <QuizHeader title={examTitle} showInstructions={false} />
          
          <div className="result-details" style={{ marginTop: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2>Answer Review</h2>
              <button className="rm-btn-solid" style={{ padding: "10px 20px", fontSize: "14px" }} onClick={() => setShowAnswers(false)}>
                ← Back to Summary
              </button>
            </div>

            <div className="review-list">
              {questions.slice(0, visibleCount).map((q, index) => {
                const userAns = userAnswers[index];
                const isCorrect = q.correctAnswer
                  ? userAns === q.correctAnswer
                  : undefined;

                return (
                  <div className="review-item" key={q.id || index}>
                    <div className="review-question">
                      <span className="q-number">Q{index + 1}.</span>{" "}
                      {q.english}
                    </div>

                    <div className="review-answers">
                      <p>
                        <strong>Your Answer: </strong>
                        <span
                          className={
                            userAns === undefined
                              ? "unanswered-text"
                              : isCorrect === false
                              ? "wrong-text"
                              : "correct-text"
                          }
                        >
                          {userAns !== undefined ? userAns : "Not Answered"}
                        </span>
                      </p>

                      {q.correctAnswer && (
                        <p>
                          <strong>Correct Answer: </strong>
                          <span className="correct-text">
                            {q.correctAnswer}
                          </span>
                        </p>
                      )}
                      
                      {q.explanation && (
                        <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "rgba(110, 63, 243, 0.05)", borderLeft: "4px solid #6E3FF3", borderRadius: "4px" }}>
                          <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#6E3FF3", marginBottom: "4px" }}>Answer Explanation:</p>
                          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="result-actions" style={{ marginTop: "40px", paddingBottom: "60px", textAlign: "center" }}>
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