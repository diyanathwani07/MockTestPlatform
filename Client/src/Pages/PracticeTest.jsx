import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, CheckCircle, XCircle, ChevronRight, AlertCircle } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css";
import "../css/Practice.css";

function PracticeTest() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({}); // { index: true }
  const [isCorrectSelected, setIsCorrectSelected] = useState(false);
  const [stats, setStats] = useState({
    firstTryCorrect: 0,
    multipleTries: 0,
    totalWrongAttempts: 0,
    totalAttemptsAll: 0, // Track total attempts across all questions
    startTime: Date.now()
  });

  const [questionTime, setQuestionTime] = useState(0);
  const [showAiTutor, setShowAiTutor] = useState(false);

  // Timer Effect
  useEffect(() => {
    if (loading || !questions.length || isCorrectSelected) return;
    const timer = setInterval(() => {
      setQuestionTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, questions.length, isCorrectSelected, currentIndex]);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/practice/${quizId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuiz(res.data);
        setQuestions(res.data.questions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (optIdx) => {
    if (isCorrectSelected || selectedOptions[optIdx]) return; // prevent re-clicking

    const isCorrect = currentQuestion.options[optIdx] === currentQuestion.correctAnswer;
    const newSelected = { ...selectedOptions, [optIdx]: true };
    setSelectedOptions(newSelected);

    if (isCorrect) {
      setIsCorrectSelected(true);
      
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
      // It's a wrong answer, we can increment total attempts immediately
      // Actually we update totalAttemptsAll when correct is selected above to be safe, 
      // but let's just track it dynamically in render or keep a global counter.
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOptions({});
      setIsCorrectSelected(false);
      setQuestionTime(0);
      setShowAiTutor(false);
    } else {
      // Finish
      const timeSpent = Math.floor((Date.now() - stats.startTime) / 1000);
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

  if (loading) {
    return (
      <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="sd-loading">
            <div className="sd-spinner"></div>
            <p>Loading your practice module...</p>
          </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="sd-empty">
            <h3>No questions found.</h3>
            <button className="practice-btn-primary" onClick={() => navigate("/dashboard/practice")}>Go Back</button>
          </div>
      </div>
    );
  }

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
              color: '#EF4444', 
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

  // Removed handleRefresh functionality as per user request.


  return (
    <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "var(--bg-page, #f8fafc)", display: "flex", flexDirection: "column" }}>
      {/* ── TOP HEADER BAR ── */}
      <div className="practice-top-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#8B5CF6", color: "#ffffff", padding: "14px 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <button className="back-btn" onClick={() => navigate("/dashboard/practice")} style={{ background: "transparent", border: "none", color: "#ffffff", fontSize: "16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <ArrowLeft size={18} /> Back
        </button>
        <h3 style={{ margin: 0, fontSize: "19px", fontWeight: "700" }}>Quiz</h3>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, padding: "24px 20px 60px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        {/* Quiz Title */}
        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", textAlign: "center", margin: "0 0 24px 0", maxWidth: "800px", lineHeight: 1.3 }}>
          {quiz?.title || quiz?.examGroup}
        </h2>

        {/* Question Card */}
        <div className="practice-question-card animate-fade-in" style={{ backgroundColor: "var(--bg-card, #ffffff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "24px", padding: "32px", width: "100%", maxWidth: "800px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
          
          {/* Question Text */}
          <div className="practice-q-text" style={{ textAlign: "center", marginBottom: "28px" }}>
            <p style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 10px 0", lineHeight: 1.5 }}>
              {currentQuestion.questionEnglish}
            </p>
            {currentQuestion.questionHindi && (
              <p className="q-hindi" style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: "500", margin: 0 }}>
                {currentQuestion.questionHindi}
              </p>
            )}
          </div>

          {/* Options Grid */}
          <div className="practice-options-grid" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOptions[idx];
              const isCorrectOption = opt === currentQuestion.correctAnswer;
              
              // Define border & background styles based on correctness
              let borderStyle = "1px solid var(--border-color, #e2e8f0)";
              let backgroundStyle = "var(--bg-page, #f8fafc)";
              let textColor = "var(--text-primary)";
              
              if (isSelected && isCorrectOption) {
                borderStyle = "2px solid #10B981";
                backgroundStyle = "var(--bg-card, #ffffff)";
              } else if (isSelected && !isCorrectOption) {
                borderStyle = "1px solid var(--border-color)";
                backgroundStyle = "var(--bg-page, #f8fafc)";
              } else if (isCorrectSelected && isCorrectOption) {
                borderStyle = "2px solid #10B981";
                backgroundStyle = "var(--bg-card, #ffffff)";
              }

              return (
                <div key={idx} className="practice-opt-wrapper" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button 
                    onClick={() => handleOptionClick(idx)}
                    disabled={isCorrectSelected || isSelected}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      borderRadius: "16px",
                      border: borderStyle,
                      background: backgroundStyle,
                      color: textColor,
                      cursor: (isCorrectSelected || isSelected) ? "default" : "pointer",
                      width: "100%",
                      textAlign: "left",
                      fontSize: "15px",
                      fontWeight: "500",
                      transition: "all 0.2s"
                    }}
                  >
                    <span>{opt}</span>
                    {((isSelected && isCorrectOption) || (isCorrectSelected && isCorrectOption)) && (
                      <span style={{ color: "#10B981", fontWeight: "bold", fontSize: "16px" }}>✓</span>
                    )}
                  </button>

                  {/* Show explanation under selected wrong option */}
                  {isSelected && !isCorrectOption && (
                    <div className="practice-inline-exp danger" style={{ padding: "16px", backgroundColor: "var(--bg-page, #fef2f2)", border: "1px solid #FCA5A5", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#EF4444", fontWeight: "700", fontSize: "14px" }}>
                        ❌ Incorrect
                      </div>
                      <p style={{ margin: 0, fontSize: "14.5px", color: "var(--text-primary)", lineHeight: 1.5, fontWeight: "500" }}>
                        {renderExplanationText(currentQuestion.explanations?.incorrect?.[opt] || "This is associated with another school.")}
                      </p>
                    </div>
                  )}

                  {/* Show explanation under wrong options once correct answer is chosen */}
                  {isCorrectSelected && !isCorrectOption && !isSelected && (
                    <div className="practice-inline-exp danger" style={{ padding: "16px", backgroundColor: "var(--bg-page, #fef2f2)", border: "1px solid #FCA5A5", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#EF4444", fontWeight: "700", fontSize: "14px" }}>
                        ❌ Incorrect
                      </div>
                      <p style={{ margin: 0, fontSize: "14.5px", color: "var(--text-primary)", lineHeight: 1.5, fontWeight: "500" }}>
                        {renderExplanationText(currentQuestion.explanations?.incorrect?.[opt] || "This option is incorrect.")}
                      </p>
                    </div>
                  )}

                  {/* Show explanation for the correct option once correct answer is chosen */}
                  {isCorrectSelected && isCorrectOption && (
                    <div className="practice-inline-exp success" style={{ padding: "16px", backgroundColor: "var(--bg-page, #f0fdf4)", border: "1px solid #BBF7D0", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534", fontWeight: "700", fontSize: "14px" }}>
                        ☑ Correct Answer
                      </div>
                      <p style={{ margin: 0, fontSize: "14.5px", color: "var(--text-primary)", lineHeight: 1.5, fontWeight: "500" }}>
                        {renderExplanationText(currentQuestion.explanations?.correct || "This is correct.")}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer/Navigation Buttons */}
        <div style={{ width: "100%", maxWidth: "800px", display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
          <button 
            onClick={handleNext}
            disabled={!isCorrectSelected}
            style={{
              padding: "12px 24px",
              borderRadius: "12px",
              background: isCorrectSelected ? "#8B5CF6" : "#E2E8F0",
              color: isCorrectSelected ? "#ffffff" : "#94A3B8",
              border: "none",
              fontSize: "15px",
              fontWeight: "700",
              cursor: isCorrectSelected ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: isCorrectSelected ? "0 4px 12px rgba(139, 92, 246, 0.25)" : "none"
            }}
          >
            {currentIndex === questions.length - 1 ? 'Finish Practice' : 'Next Question'}
            <ChevronRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}

export default PracticeTest;
