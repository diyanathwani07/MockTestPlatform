import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { BookOpen, Clock, HelpCircle, ChevronRight, FileCheck } from "lucide-react";
import "../css/StudentDashboard.css"; // Reuse dashboard layout styles
import "../css/Practice.css"; // Reuse modern grid styles

function MyExams() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attemptedQuizzes, setAttemptedQuizzes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes?published=true`);
        setQuizzes(res.data);
        
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const resultsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/results/${user.id}`);
          const attemptedIds = resultsRes.data.map(r => r.quizId).filter(Boolean);
          setAttemptedQuizzes(attemptedIds);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);



  const handleSubjectClick = (quiz) => {
    navigate("/start-test", {
      state: {
        preSelectedQuizId: quiz._id,
        subject: quiz.subject,
        quizId: quiz._id,
        quizTitle: quiz.title,
        duration: quiz.duration,
      },
    });
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
        <StudentNavbar title="My Exams" />
        <div className="sd-content" style={{ paddingTop: '20px' }}>
          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner"></div>
              <p>Loading available exams...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-icon">📭</div>
              <h3>No Exams Published Yet</h3>
              <p>Check back soon. The admin will publish exams shortly.</p>
            </div>
          ) : (
            <>

              <div className="practice-header-section">
                <h1 className="practice-title">My Exams</h1>
              </div>

              <div className="practice-grid">
                {quizzes.map((quiz, index) => {
                  const color = subjectColors[index % subjectColors.length];
                  const questionCount = quiz.questionCount || quiz.questions?.length || 0;
                  const isAttempted = attemptedQuizzes.includes(quiz._id);
                  
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
                        Full mock exam to test your preparation.
                      </p>

                      <div className="practice-meta-grid">
                        <div className="meta-item">
                          <HelpCircle size={14} />
                          <span>{questionCount} Questions</span>
                        </div>
                        <div className="meta-item">
                          <Clock size={14} />
                          <span>{quiz.duration} mins</span>
                        </div>
                      </div>

                      <button 
                        className="practice-start-btn"
                        onClick={() => handleSubjectClick(quiz)}
                      >
                        <BookOpen size={16} />
                        {isAttempted ? "Reattempt Exam" : "Start Exam"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyExams;
