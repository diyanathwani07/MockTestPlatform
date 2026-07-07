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
    startTime: Date.now()
  });

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
        totalWrongAttempts: prev.totalWrongAttempts + wrongCount
      }));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOptions({});
      setIsCorrectSelected(false);
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
      <div className="sd-layout">
        <StudentSidebar />
        <div className="sd-main-content">
          <StudentNavbar title="Practice Test" />
          <div className="sd-loading" style={{ marginTop: "100px" }}>
            <div className="sd-spinner"></div>
            <p>Loading your practice module...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="sd-layout">
        <StudentSidebar />
        <div className="sd-main-content">
          <StudentNavbar title="Practice Test" />
          <div className="sd-empty" style={{ marginTop: "100px" }}>
            <h3>No questions found.</h3>
            <button className="practice-btn-primary" onClick={() => navigate("/dashboard/practice")}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentIndex) / questions.length) * 100;

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title={quiz.title || "Practice Test"} />
        <div className="practice-test-container">
          
          <div className="practice-header">
            <button className="practice-back-btn" onClick={() => navigate("/dashboard/practice")}>
              <ArrowLeft size={20} />
            </button>
            <div className="practice-progress-wrapper">
              <div className="practice-progress-text">
                Question {currentIndex + 1} of {questions.length}
              </div>
              <div className="practice-progress-bar">
                <div className="practice-progress-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
          </div>

          {/* ── LEARNING STATUS PANEL ── */}
          <div className="practice-learning-status">
            <div className="status-item">
              <span className="status-label">Attempts</span>
              <span className="status-value">{Object.keys(selectedOptions).length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Wrong Attempts</span>
              <span className="status-value">{Object.keys(selectedOptions).length - (isCorrectSelected ? 1 : 0)}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Correct on Attempt</span>
              <span className="status-value">{isCorrectSelected ? Object.keys(selectedOptions).length : "-"}</span>
            </div>
          </div>

          <div className="practice-question-card animate-fade-in">
            <div className="practice-q-text">
              <span className="q-num">Q{currentIndex + 1}.</span>
              <div className="q-content">
                <p>{currentQuestion.questionEnglish}</p>
                {currentQuestion.questionHindi && <p className="q-hindi">{currentQuestion.questionHindi}</p>}
              </div>
            </div>

            <div className="practice-options-grid">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOptions[idx];
                const isCorrectOption = opt === currentQuestion.correctAnswer;
                
                let optionClass = "practice-opt";
                if (isSelected) {
                  if (isCorrectOption) optionClass += " correct";
                  else optionClass += " wrong";
                } else if (isCorrectSelected && isCorrectOption) {
                   optionClass += " correct-revealed";
                }

                return (
                  <div key={idx} className="practice-opt-wrapper">
                    <button 
                      className={optionClass}
                      onClick={() => handleOptionClick(idx)}
                      disabled={isCorrectSelected || isSelected}
                    >
                      <div className="opt-marker">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className="opt-text">{opt}</div>
                      
                      {isSelected && isCorrectOption && <CheckCircle size={20} className="status-icon success" />}
                      {isSelected && !isCorrectOption && <XCircle size={20} className="status-icon danger" />}
                    </button>

                    {/* Show explanation instantly for wrong selected answer */}
                    {isSelected && !isCorrectOption && (
                      <div className="practice-inline-exp danger" style={{ marginTop: "12px", padding: "12px", backgroundColor: "rgba(255,68,68,0.05)", borderLeft: "3px solid #ff4444", borderRadius: "0 8px 8px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "#ff4444", fontWeight: "500" }}>
                          <AlertCircle size={16} /> Incorrect
                        </div>
                        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                          {currentQuestion.explanations?.incorrect?.[opt] || "This is not the correct answer. Try to think about the core concepts and try again!"}
                        </p>
                      </div>
                    )}
                    
                    {/* Show explanation for WRONG options when correct answer is found (so user can learn about all options) */}
                    {isCorrectSelected && !isCorrectOption && (
                      <div className="practice-inline-exp" style={{ marginTop: "12px", padding: "12px", backgroundColor: "rgba(255,255,255,0.03)", borderLeft: "3px solid rgba(255,255,255,0.2)", borderRadius: "0 8px 8px 0" }}>
                        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                          {currentQuestion.explanations?.incorrect?.[opt] || "This option is incorrect."}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show full explanation when correct answer is found */}
            {isCorrectSelected && (
              <div className="practice-full-exp animate-slide-up" style={{ marginTop: "24px", padding: "20px", backgroundColor: "rgba(74, 222, 128, 0.05)", border: "1px solid rgba(74, 222, 128, 0.2)", borderRadius: "12px" }}>
                <h4 style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4ade80", margin: "0 0 12px 0", fontSize: "18px" }}>
                  <CheckCircle size={20} /> Correct Answer Explanation
                </h4>
                <p style={{ color: "var(--text-main)", lineHeight: "1.6", marginBottom: "16px" }}>
                  {currentQuestion.explanations?.correct || "Great job! This is the correct answer."}
                </p>
                
                {currentQuestion.explanations?.conceptSummary && (
                  <div className="concept-summary-card animate-fade-in" style={{ padding: "16px", backgroundColor: "rgba(108, 93, 211, 0.1)", borderRadius: "8px", borderLeft: "4px solid var(--primary-color)" }}>
                    <h5 style={{ margin: "0 0 8px 0", color: "var(--primary-color)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
                      💡 Concept Summary
                    </h5>
                    <p style={{ margin: 0, color: "var(--text-main)", fontSize: "14px", lineHeight: "1.6" }}>
                      {currentQuestion.explanations.conceptSummary}
                    </p>
                  </div>
                )}
                
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                  <button className="ai-explain-btn" onClick={() => alert("AI Explanation integration coming soon!")}>
                    ✨ Explain with AI
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="practice-footer">
              <button 
                className={`practice-next-btn ${isCorrectSelected ? 'active' : ''}`}
                onClick={handleNext}
                disabled={!isCorrectSelected}
              >
                {isCorrectSelected ? (
                  currentIndex === questions.length - 1 ? 'Finish Practice' : 'Continue Learning →'
                ) : 'Next Question'}
              </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PracticeTest;
