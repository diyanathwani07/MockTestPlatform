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
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes/${quizId}`);
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

          <div className="practice-question-card">
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
                      <div className="practice-inline-exp danger">
                        <AlertCircle size={16} />
                        <p>This is not the correct answer. Give it another try!</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show full explanation when correct answer is found */}
            {isCorrectSelected && currentQuestion.explanation && (
              <div className="practice-full-exp">
                <h4><CheckCircle size={18} /> Detailed Explanation</h4>
                <p>{currentQuestion.explanation}</p>
                <div className="exp-note">
                  <em>Note: Detailed AI explanations for each specific option will be integrated in a future update.</em>
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
                {currentIndex === questions.length - 1 ? 'Finish Practice' : 'Next Question'}
                <ChevronRight size={20} />
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PracticeTest;
