import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { BookOpen, Clock, HelpCircle } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/Practice.css";

function PracticeDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes?published=true`);
        setQuizzes(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStartPractice = (quizId) => {
    navigate(`/practice/${quizId}`);
  };

  const subjectColors = [
    { bg: "#EDE9FE", text: "#5B21B6", dot: "#7C3AED" },
    { bg: "#DCFCE7", text: "#166534", dot: "#16A34A" },
    { bg: "#FEF9C3", text: "#854D0E", dot: "#D97706" },
    { bg: "#FFE4E6", text: "#9F1239", dot: "#E11D48" },
    { bg: "#DBEAFE", text: "#1E40AF", dot: "#2563EB" },
    { bg: "#FCE7F3", text: "#9D174D", dot: "#DB2777" },
    { bg: "#F0FDF4", text: "#14532D", dot: "#15803D" },
  ];

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Practice Tests" />
        <div className="sd-content" style={{ paddingTop: '20px' }}>
          


          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner"></div>
              <p>Loading available practice modules...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-icon">📭</div>
              <h3>No Practice Tests Available</h3>
              <p>Check back soon for new learning modules.</p>
            </div>
          ) : (
            <div className="practice-grid">
              {quizzes.map((quiz, index) => {
                const color = subjectColors[index % subjectColors.length];
                const questionCount = quiz.questionCount || quiz.questions?.length || 0;
                
                return (
                  <div key={quiz._id} className="practice-card">
                    <div className="practice-card-header">
                      <div className="practice-subject-badge" style={{ backgroundColor: color.bg, color: color.text }}>
                        <span className="dot" style={{ backgroundColor: color.dot }}></span>
                        {quiz.subject || "General"}
                      </div>
                      <div className="practice-difficulty">
                        {quiz.difficulty || "Medium"}
                      </div>
                    </div>
                    
                    <h3 className="practice-quiz-title">{quiz.title || quiz.examGroup}</h3>
                    <p className="practice-quiz-desc">
                      Practice module focusing on core concepts.
                    </p>

                    <div className="practice-meta-grid">
                      <div className="meta-item">
                        <HelpCircle size={14} />
                        <span>{questionCount} Questions</span>
                      </div>
                      <div className="meta-item">
                        <Clock size={14} />
                        <span>Untimed</span>
                      </div>
                    </div>

                    <button 
                      className="practice-start-btn"
                      onClick={() => handleStartPractice(quiz._id)}
                    >
                      <BookOpen size={16} />
                      Start Practice
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PracticeDashboard;
