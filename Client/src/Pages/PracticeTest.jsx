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

  const progressPercentage = ((currentIndex) / questions.length) * 100;

  return (
    <div className="practice-fullscreen-layout" style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", padding: "40px 20px" }}>
        <div className="practice-test-container" style={{ maxWidth: "900px", margin: "0 auto" }}>
          
          <div className="practice-header">
            <button className="practice-back-btn" onClick={() => navigate("/dashboard/practice")}>
              <ArrowLeft size={20} />
            </button>
            <div className="practice-progress-wrapper" style={{ flex: 1 }}>
              <div className="practice-progress-text" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  ⏱ {Math.floor(questionTime / 60).toString().padStart(2, '0')}:{(questionTime % 60).toString().padStart(2, '0')}
                </span>
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
            <div className="status-item" style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: "16px" }}>
              <span className="status-label">Avg. Attempts</span>
              <span className="status-value">
                {currentIndex > 0 || isCorrectSelected 
                  ? ((stats.totalAttemptsAll + (isCorrectSelected ? 0 : Object.keys(selectedOptions).length)) / (currentIndex + (isCorrectSelected ? 1 : 0))).toFixed(1)
                  : "-"}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Accuracy</span>
              <span className="status-value">
                {currentIndex > 0 || isCorrectSelected
                  ? Math.round(((currentIndex + (isCorrectSelected ? 1 : 0)) / (stats.totalAttemptsAll + (isCorrectSelected ? 0 : Object.keys(selectedOptions).length))) * 100) + "%"
                  : "-"}
              </span>
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

                    {/* Show explanation for the CORRECT option when correct answer is found */}
                    {isCorrectSelected && isCorrectOption && (
                      <div className="practice-inline-exp success" style={{ marginTop: "12px", padding: "12px", backgroundColor: "rgba(74, 222, 128, 0.05)", borderLeft: "3px solid #4ade80", borderRadius: "0 8px 8px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "#4ade80", fontWeight: "500" }}>
                          <CheckCircle size={16} /> Correct
                        </div>
                        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                          {currentQuestion.explanations?.correct || "Great job! This is the correct answer."}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>


          </div>

          <div className="practice-footer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              
              <button 
                className={`practice-next-btn ${isCorrectSelected ? 'active' : ''}`}
                onClick={handleNext}
                disabled={!isCorrectSelected}
                style={{ minWidth: "200px", padding: "14px 24px", fontSize: "16px" }}
              >
                {isCorrectSelected ? (
                  currentIndex === questions.length - 1 ? 'Finish Practice' : 'Next Question →'
                ) : 'Select an Answer'}
              </button>
          </div>
        </div>

      {/* 🤖 AI TUTOR MODAL */}
      {showAiTutor && (
        <div className="ai-tutor-overlay animate-fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="ai-tutor-modal animate-slide-up" style={{ background: "var(--bg-main)", border: "1px solid rgba(108, 93, 211, 0.3)", borderRadius: "16px", padding: "32px", maxWidth: "500px", width: "90%", position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
            <button 
              onClick={() => setShowAiTutor(false)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <XCircle size={24} />
            </button>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "8px" }}>
              🤖 AI Tutor
            </h3>
            <div style={{ backgroundColor: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", minHeight: "150px" }}>
              <p style={{ color: "var(--text-main)", lineHeight: "1.6", margin: "0 0 12px 0" }}>
                Think of JavaScript like a calculator. It only knows one number box called Number. 
                Whether you write 5, 5.5 or 100.25, they are all stored inside the same Number box.
              </p>
              <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0, fontSize: "13px" }}>
                (Note: This is a simulated UI placeholder. Future updates will stream real-time generative AI tutoring based on your exact mistakes!)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PracticeTest;
