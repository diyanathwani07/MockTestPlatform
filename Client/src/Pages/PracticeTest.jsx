import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, ChevronRight, Info, Trash2, Bookmark, X, Shield } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/Practice.css";

function PracticeTest() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({}); // { optionIndex: true }
  const [isCorrectSelected, setIsCorrectSelected] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState([]); // Array of review indices
  const [answeredQuestions, setAnsweredQuestions] = useState({}); // { index: true }
  const [visitedQuestions, setVisitedQuestions] = useState([0]); // Array of visited indices
  const [showInstructions, setShowInstructions] = useState(false);
  const [wrongQuestionIds, setWrongQuestionIds] = useState(new Set());

  const [stats, setStats] = useState({
    firstTryCorrect: 0,
    multipleTries: 0,
    totalWrongAttempts: 0,
    totalAttemptsAll: 0,
    startTime: Date.now()
  });

  const [questionTime, setQuestionTime] = useState(0);

  // Timer Effect
  useEffect(() => {
    if (loading || !questions.length || isCorrectSelected) return;
    const timer = setInterval(() => {
      setQuestionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, questions.length, isCorrectSelected, currentIndex]);

  // Fetch Quiz & Active/New Session
  useEffect(() => {
    const fetchQuizAndSession = async () => {
      try {
        const token = localStorage.getItem("token");
        const queryParams = new URLSearchParams(location.search);
        const restart = queryParams.get("restart") === "true";

        const sessionUrl = `${import.meta.env.VITE_API_URL}/api/practice/${quizId}/session${restart ? "?restart=true" : ""}`;
        
        const [quizRes, sessionRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/practice/${quizId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(sessionUrl, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const rawQuiz = quizRes.data;
        const rawQuestions = rawQuiz.questions || [];
        const sessionData = sessionRes.data;

        // Re-map the questions array to match sessionData.questionsOrder list of indices
        const orderedQuestions = sessionData.questionsOrder.map((origIdx) => {
          const q = rawQuestions[origIdx];
          if (!q) return null;

          // Handle Option Shuffling
          const optOrder = (sessionData.optionsOrder && sessionData.optionsOrder[origIdx]) || [0, 1, 2, 3];
          const shuffledOptions = optOrder.map((optIdx) => q.options[optIdx]);

          return {
            ...q,
            originalIndex: origIdx,
            options: shuffledOptions,
            optionIndicesMapping: optOrder
          };
        }).filter(Boolean);

        setQuiz(rawQuiz);
        setQuestions(orderedQuestions);

        // Strip restart parameter from address bar to prevent reshuffle on refresh
        if (restart) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch (err) {
        console.error("Error loading quiz/session:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizAndSession();
  }, [quizId]);

  // Add current index to visited list
  useEffect(() => {
    if (!visitedQuestions.includes(currentIndex)) {
      setVisitedQuestions(prev => [...prev, currentIndex]);
    }
  }, [currentIndex]);

  const renderExplanationText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\([^)]+\))/g);
    return parts.map((part, index) => {
      if (part.startsWith('(') && part.endsWith(')')) {
        return (
          <span 
            key={index} 
            className="hindi-exp-text" 
            style={{ 
              color: '#F87171', 
              fontWeight: '500', 
              display: 'block', 
              marginTop: '4px' 
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "#080914", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="sd-loading">
            <div className="sd-spinner" style={{ borderColor: "#8B5CF6", borderTopColor: "transparent" }}></div>
            <p style={{ color: "#a78bfa" }}>Loading your practice module...</p>
          </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "#080914", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="sd-empty" style={{ textAlign: "center" }}>
            <h3 style={{ color: "#ffffff", marginBottom: "16px" }}>No questions found.</h3>
            <button className="practice-btn-primary" onClick={() => navigate("/dashboard/practice")} style={{ background: "#8B5CF6", color: "#ffffff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}>Go Back</button>
          </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (optIdx) => {
    if (isCorrectSelected || selectedOptions[optIdx]) return; // prevent re-clicking

    const isCorrect = currentQuestion.options[optIdx] === currentQuestion.correctAnswer;
    const newSelected = { ...selectedOptions, [optIdx]: true };
    setSelectedOptions(newSelected);

    if (isCorrect) {
      setIsCorrectSelected(true);
      setAnsweredQuestions(prev => ({ ...prev, [currentIndex]: true }));
      
      // Update stats
      const wrongCount = Object.keys(newSelected).length - 1;
      setStats(prev => ({
        ...prev,
        firstTryCorrect: prev.firstTryCorrect + (wrongCount === 0 ? 1 : 0),
        multipleTries: prev.multipleTries + (wrongCount > 0 ? 1 : 0),
        totalWrongAttempts: prev.totalWrongAttempts + wrongCount,
        totalAttemptsAll: prev.totalAttemptsAll + Object.keys(newSelected).length
      }));
    } else {
      // Track wrong question for analytics
      setWrongQuestionIds(prev => {
        const next = new Set(prev);
        next.add(currentQuestion._id);
        return next;
      });
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOptions({});
      setIsCorrectSelected(false);
      setQuestionTime(0);
    } else {
      // Finish Practice Attempt
      const timeSpent = Math.floor((Date.now() - stats.startTime) / 1000);
      const accuracyVal = questions.length > 0 ? Math.round((stats.firstTryCorrect / questions.length) * 100) : 0;

      // Map wrongQuestions, sorted by original logical index in the quiz for proper analytics order
      const wrongQs = Array.from(wrongQuestionIds).map(id => {
        const q = questions.find(item => item._id === id);
        if (!q) return null;
        return {
          questionId: q._id,
          questionEnglish: q.questionEnglish,
          questionHindi: q.questionHindi,
          options: q.options, // Save option order for completeness
          correctAnswer: q.correctAnswer,
          explanations: {
            correct: q.explanations?.correct || "",
            incorrect: q.explanations?.incorrect || {},
            conceptSummary: q.explanations?.conceptSummary || ""
          }
        };
      }).filter(Boolean).sort((a, b) => {
        const aIndex = quiz.questions.findIndex(q => q._id.toString() === a.questionId.toString());
        const bIndex = quiz.questions.findIndex(q => q._id.toString() === b.questionId.toString());
        return aIndex - bIndex;
      });

      try {
        const token = localStorage.getItem("token");
        // Save practice result history to server
        await axios.post(`${import.meta.env.VITE_API_URL}/api/practice/history`, {
          quizId,
          stats: {
            totalQuestions: questions.length,
            firstTryCorrect: stats.firstTryCorrect,
            multipleTries: stats.multipleTries,
            totalWrongAttempts: stats.totalWrongAttempts,
            totalAttemptsAll: stats.totalAttemptsAll,
            timeSpent,
            accuracy: accuracyVal
          },
          wrongQuestions: wrongQs
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Restart/Reset active session order for future attempts
        await axios.get(`${import.meta.env.VITE_API_URL}/api/practice/${quizId}/session?restart=true`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to save practice completion metrics:", err);
      }

      navigate("/practice-result", {
        state: {
          quizId,
          title: quiz.title,
          stats: {
            ...stats,
            totalQuestions: questions.length,
            timeSpent
          }
        }
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOptions({});
      setIsCorrectSelected(false);
      setQuestionTime(0);
    }
  };

  const handleMarkReview = () => {
    if (reviewQuestions.includes(currentIndex)) {
      setReviewQuestions(prev => prev.filter(idx => idx !== currentIndex));
    } else {
      setReviewQuestions(prev => [...prev, currentIndex]);
    }
  };

  const clearResponse = () => {
    setSelectedOptions({});
    setIsCorrectSelected(false);
    setAnsweredQuestions(prev => {
      const updated = { ...prev };
      delete updated[currentIndex];
      return updated;
    });
  };

  // Stats for right sidebar
  const answeredCount = Object.keys(answeredQuestions).length;
  const reviewCount = reviewQuestions.length;
  const remainingCount = questions.length - answeredCount;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  const getOptionLetter = (idx) => {
    return ["A", "B", "C", "D"][idx] || String.fromCharCode(65 + idx);
  };

  return (
    <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "#080914", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── TOP HEADER BAR ── */}
      <div className="practice-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1e1b4b", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#ffffff", padding: "14px 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <button className="back-btn" onClick={() => navigate("/dashboard/practice")} style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: "15px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <ArrowLeft size={18} /> Back
        </button>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", letterSpacing: "0.5px" }}>Quiz</h3>
        <button className="instructions-btn" onClick={() => setShowInstructions(true)} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#ffffff", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <Info size={16} /> Instructions
        </button>
      </div>

      {/* ── SUBJECT / TITLE BANNER ── */}
      <div style={{ padding: "24px 40px 0", maxWidth: "1400px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
          <div style={{ width: "54px", height: "54px", borderRadius: "14px", backgroundColor: "#1e1b4c", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", color: "#FBBF24" }}>
            JS
          </div>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#ffffff", margin: 0 }}>
              {quiz?.title || quiz?.examGroup || "Basic Practice"}
            </h2>
            <p style={{ fontSize: "14px", color: "#94a3b8", margin: "2px 0 0 0" }}>
              {quiz?.description || "Test your fundamentals"}
            </p>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA (GRID) ── */}
      <div style={{ flex: 1, padding: "24px 40px 40px", display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", maxWidth: "1400px", width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        
        {/* LEFT COLUMN: QUESTION CARD */}
        <div className="practice-question-card" style={{ backgroundColor: "#111222", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "36px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          
          <div>


            {/* Question Indicator & Mark for Review */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
              <span className="quiz-question-pill" style={{ backgroundColor: "rgba(139, 92, 246, 0.12)", color: "#c084fc", border: "1px solid rgba(139, 92, 246, 0.2)", fontWeight: "700", fontSize: "13px", padding: "8px 16px", borderRadius: "20px" }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <button 
                onClick={handleMarkReview}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: reviewQuestions.includes(currentIndex) ? "#F59E0B" : "#94a3b8", 
                  fontSize: "14px", 
                  fontWeight: "600", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "6px", 
                  cursor: "pointer" 
                }}
              >
                <Bookmark size={18} fill={reviewQuestions.includes(currentIndex) ? "#F59E0B" : "none"} /> Mark for Review
              </button>
            </div>

            {/* Question Texts */}
            <div className="practice-q-text" style={{ marginBottom: "32px", textAlign: "left" }}>
              <p style={{ fontSize: "19px", fontWeight: "700", color: "#ffffff", margin: "0 0 12px 0", lineHeight: 1.5 }}>
                {currentQuestion.questionEnglish}
              </p>
              {currentQuestion.questionHindi && (
                <p className="q-hindi" style={{ fontSize: "17px", color: "#94a3b8", fontWeight: "500", margin: 0 }}>
                  {currentQuestion.questionHindi}
                </p>
              )}
            </div>

            {/* Options List */}
            <div className="practice-options-grid" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOptions[idx];
                const isCorrectOption = opt === currentQuestion.correctAnswer;
                
                // Define border & background styles based on correctness
                let borderStyle = "1.5px solid rgba(255, 255, 255, 0.08)";
                let backgroundStyle = "#18192e";
                let badgeBorder = "2px solid rgba(139, 92, 246, 0.4)";
                let badgeBg = "transparent";
                let badgeText = "#a78bfa";
                
                if (isSelected && isCorrectOption) {
                  borderStyle = "2.5px solid #10B981";
                  backgroundStyle = "rgba(16, 185, 129, 0.08)";
                  badgeBorder = "2px solid #10B981";
                  badgeBg = "#10B981";
                  badgeText = "#ffffff";
                } else if (isSelected && !isCorrectOption) {
                  borderStyle = "1.5px solid rgba(255, 255, 255, 0.08)";
                  backgroundStyle = "#18192e";
                  badgeBorder = "2px solid rgba(239, 68, 68, 0.6)";
                  badgeBg = "#EF4444";
                  badgeText = "#ffffff";
                } else if (isCorrectSelected && isCorrectOption) {
                  borderStyle = "2.5px solid #10B981";
                  backgroundStyle = "rgba(16, 185, 129, 0.08)";
                  badgeBorder = "2px solid #10B981";
                  badgeBg = "#10B981";
                  badgeText = "#ffffff";
                }

                return (
                  <div key={idx} className="practice-opt-wrapper" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button 
                      onClick={() => handleOptionClick(idx)}
                      disabled={isCorrectSelected || isSelected}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "16px 20px",
                        borderRadius: "14px",
                        border: borderStyle,
                        background: backgroundStyle,
                        color: "#ffffff",
                        cursor: (isCorrectSelected || isSelected) ? "default" : "pointer",
                        width: "100%",
                        textAlign: "left",
                        fontSize: "15px",
                        fontWeight: "500",
                        transition: "all 0.15s ease",
                        gap: "16px"
                      }}
                    >
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: badgeBorder,
                        background: badgeBg,
                        color: badgeText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "13px"
                      }}>
                        {getOptionLetter(idx)}
                      </div>
                      <span style={{ flex: 1 }}>{opt}</span>
                    </button>

                    {/* Show explanation under selected wrong option */}
                    {isSelected && !isCorrectOption && (
                      <div className="practice-inline-exp danger" style={{ padding: "16px", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F87171", fontWeight: "700", fontSize: "14px" }}>
                          ❌ Incorrect
                        </div>
                        <p style={{ margin: 0, fontSize: "14.5px", color: "#e2e8f0", lineHeight: 1.5, fontWeight: "500" }}>
                          {renderExplanationText(currentQuestion.explanations?.incorrect?.[opt] || "This option is incorrect.")}
                        </p>
                      </div>
                    )}

                    {/* Show explanation under wrong options once correct answer is chosen */}
                    {isCorrectSelected && !isCorrectOption && !isSelected && (
                      <div className="practice-inline-exp danger" style={{ padding: "16px", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#F87171", fontWeight: "700", fontSize: "14px" }}>
                          ❌ Incorrect
                        </div>
                        <p style={{ margin: 0, fontSize: "14.5px", color: "#e2e8f0", lineHeight: 1.5, fontWeight: "500" }}>
                          {renderExplanationText(currentQuestion.explanations?.incorrect?.[opt] || "This option is incorrect.")}
                        </p>
                      </div>
                    )}

                    {/* Show explanation for the correct option once correct answer is chosen */}
                    {isCorrectSelected && isCorrectOption && (
                      <div className="practice-inline-exp success" style={{ padding: "16px", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10B981", fontWeight: "700", fontSize: "14px" }}>
                          ☑ Correct Answer
                        </div>
                        <p style={{ margin: 0, fontSize: "14.5px", color: "#e2e8f0", lineHeight: 1.5, fontWeight: "500" }}>
                          {renderExplanationText(currentQuestion.explanations?.correct || "This option is correct.")}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: SIDE PANEL */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Progress Widget */}
          <div style={{ backgroundColor: "#111222", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.06)", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>Your Progress</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#c084fc" }}>{progressPercent}%</span>
            </div>
            
            {/* Progress Bar */}
            <div style={{ width: "100%", height: "8px", backgroundColor: "#1e293b", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "#8B5CF6", borderRadius: "4px", transition: "width 0.3s ease" }}></div>
            </div>

            {/* Counts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#10B981" }}>{answeredCount}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", marginTop: "2px" }}>Answered</div>
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#F59E0B" }}>{reviewCount}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", marginTop: "2px" }}>Review</div>
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff" }}>{remainingCount}</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", marginTop: "2px" }}>Remaining</div>
              </div>
            </div>
          </div>

          {/* Palette Grid */}
          <div style={{ backgroundColor: "#111222", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.06)", padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>Question Palette</span>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#c084fc" }}>{questions.length} Questions</span>
            </div>

            {/* Legends */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "4px", backgroundColor: "#8B5CF6" }}></span> Current
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "4px", backgroundColor: "#10B981" }}></span> Answered
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "4px", backgroundColor: "#F59E0B" }}></span> Review
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "4px", backgroundColor: "#334155" }}></span> Not Visited
              </div>
            </div>

            {/* Buttons Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
              {questions.map((_, idx) => {
                const isCurrent = currentIndex === idx;
                const isAnswered = answeredQuestions[idx];
                const isReview = reviewQuestions.includes(idx);
                const isVisited = visitedQuestions.includes(idx);

                let bg = "#1e293b";
                let text = "#94a3b8";
                let border = "1px solid rgba(255,255,255,0.06)";

                if (isCurrent) {
                  bg = "#8B5CF6";
                  text = "#ffffff";
                  border = "1px solid #8B5CF6";
                } else if (isAnswered) {
                  bg = "#10B981";
                  text = "#ffffff";
                  border = "1px solid #10B981";
                } else if (isReview) {
                  bg = "#F59E0B";
                  text = "#ffffff";
                  border = "1px solid #F59E0B";
                } else if (!isVisited) {
                  bg = "#0f172a";
                  text = "#475569";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setSelectedOptions({});
                      setIsCorrectSelected(false);
                      setQuestionTime(0);
                    }}
                    style={{
                      height: "36px",
                      borderRadius: "8px",
                      background: bg,
                      color: text,
                      border: border,
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Clear Response Button */}
            <button 
              onClick={clearResponse}
              style={{
                background: "transparent",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#EF4444",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                marginTop: "10px",
                transition: "all 0.15s ease"
              }}
            >
              <Trash2 size={16} /> Clear Response
            </button>

          </div>

        </div>

      </div>

      {/* ── BOTTOM ACTIONS ROW ── */}
      <div style={{ backgroundColor: "#0c0d1e", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 40px" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: currentIndex === 0 ? "#475569" : "#ffffff",
              fontSize: "14px",
              fontWeight: "600",
              cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s ease"
            }}
          >
            &lt; Previous Question
          </button>

          {/* Centered spacer / empty box since we removed the auto-saved text */}
          <div style={{ flex: 1 }}></div>

          <button 
            onClick={handleNext}
            disabled={!isCorrectSelected}
            style={{
              padding: "12px 28px",
              borderRadius: "10px",
              background: isCorrectSelected ? "#6d28d9" : "rgba(109, 40, 217, 0.4)",
              color: isCorrectSelected ? "#ffffff" : "#94a3b8",
              border: "none",
              fontSize: "14px",
              fontWeight: "700",
              cursor: isCorrectSelected ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease"
            }}
          >
            {currentIndex === questions.length - 1 ? 'Finish Practice' : 'Next Question'} <ChevronRight size={16} />
          </button>

        </div>
      </div>

      {/* ── INSTRUCTIONS MODAL ── */}
      {showInstructions && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#111222",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "28px",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
            position: "relative"
          }}>
            <button 
              onClick={() => setShowInstructions(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer"
              }}
            >
              <X size={20} />
            </button>
            <h3 style={{ color: "#ffffff", fontSize: "18px", fontWeight: "700", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
              <Info size={20} color="#8B5CF6" /> Practice Test Instructions
            </h3>
            <div style={{ color: "#e2e8f0", fontSize: "14.5px", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p>Welcome to the interactive Practice Module. Please read the following instructions carefully:</p>
              <ul style={{ paddingLeft: "20px", margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                <li>This is an untimed practice quiz designed to improve your conceptual clarity.</li>
                <li>You must select the correct option to unlock the <strong>Next Question</strong> action.</li>
                <li>You can retry any question as many times as you like. Detailed explanations for both correct and incorrect options will appear instantly below each selected choice.</li>
                <li>Use the <strong>Question Palette</strong> on the right to navigate directly to any question.</li>
                <li>You can mark any question as "Review" to revisit it later.</li>
              </ul>
            </div>
            <button 
              onClick={() => setShowInstructions(false)}
              style={{
                width: "100%",
                background: "#8B5CF6",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "14px",
                cursor: "pointer",
                marginTop: "24px",
                transition: "all 0.15s ease"
              }}
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default PracticeTest;