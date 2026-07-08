import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { BookOpen, Clock, HelpCircle, ChevronRight, FileCheck } from "lucide-react";
import "../css/StudentDashboard.css"; // Reuse dashboard layout styles
import "../css/MyExams.css"; // New specific styles
import "../css/Practice.css";

function MyExams() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
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

  const examGroups = quizzes.reduce((acc, quiz) => {
    const examName = quiz.examGroup || quiz.exam || quiz.title || "General";
    if (!acc[examName]) acc[examName] = [];
    acc[examName].push(quiz);
    return acc;
  }, {});

  const examNames = Object.keys(examGroups);

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
          ) : examNames.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-icon">≡ƒô¡</div>
              <h3>No Exams Published Yet</h3>
              <p>Check back soon. The admin will publish exams shortly.</p>
            </div>
          ) : (
            <>

              <div className="practice-header-section">
                <h1 className="practice-title">My Exams</h1>
              </div>

              <div className="me-section-title">AVAILABLE EXAMS</div>
              <div className={`me-exam-container ${selectedExam ? "me-has-selection" : ""}`}>
                {examNames.map((examName) => {
                  const group = examGroups[examName];
                  const count = group.length;
                  const totalMins = group.reduce((sum, q) => {
                    const isMulti = q.sections && q.sections.length > 0;
                    const durMin = isMulti ? (Number(q.duration) / 60) : Number(q.duration);
                    return sum + (durMin || 0);
                  }, 0);
                  const totalQs = group.reduce((sum, q) => sum + (Number(q.questionCount) || q.questions?.length || 0), 0);
                  const isSelected = selectedExam === examName;
                  
                  return (
                    <div className="me-exam-row-wrapper" key={examName}>
                      <div
                        className={`me-exam-card ${isSelected ? "me-exam-active" : ""}`}
                        onClick={() => setSelectedExam(isSelected ? null : examName)}
                      >
                      {/* TOP ROW */}
                      <div className="me-card-top">
                        <div className="me-card-left">
                          <div className="me-icon-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--violet)', width: '48px', height: '48px', borderRadius: '12px', color: '#fff' }}>
                            <FileCheck size={24} />
                          </div>
                          <div className="me-exam-name">{examName}</div>
                        </div>
                        <div className="me-chevron">
                          <ChevronRight size={20} />
                        </div>
                      </div>

                      {/* DIVIDER */}
                      <div className="me-divider"></div>

                      {/* MIDDLE ROW */}
                      <div className="me-card-middle">
                        <div className="me-stat">
                          <BookOpen className="me-stat-icon" size={16} />
                          <span>{count} Subject{count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="me-stat">
                          <Clock className="me-stat-icon" size={16} />
                          <span>{totalMins} Min</span>
                        </div>
                        <div className="me-stat">
                          <HelpCircle className="me-stat-icon" size={16} />
                          <span>{totalQs} Questions</span>
                        </div>
                      </div>

                      {/* DIVIDER */}
                      <div className="me-divider"></div>

                      {/* BOTTOM ROW */}
                      <div className="me-card-bottom">
                        <div className="me-difficulty-container">
                          <span>Difficulty</span>
                          <span className="me-badge">Medium</span>
                        </div>
                        <button className="sp-btn-save" style={{ padding: "8px 16px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>Start Exam</button>
                      </div>
                    </div>
                      
                    {isSelected && (
                      <div className="sd-subjects-panel me-inline-panel">
                          <div className="sd-subjects-header">
                    <span className="sd-subjects-title">
                      {selectedExam} ΓÇö Choose a Subject
                    </span>
                    <span className="sd-subjects-count">
                      {examGroups[selectedExam].length} available
                    </span>
                  </div>
                  <div className="practice-grid">
                    {examGroups[selectedExam].map((quiz, idx) => {
                      const color = subjectColors[idx % subjectColors.length];
                      return (
                        <div
                          key={quiz._id}
                          className="practice-card"
                        >
                          <div className="practice-card-header">
                            <div
                              className="practice-subject-badge"
                              style={{ backgroundColor: color.bg, color: color.text }}
                            >
                              <span className="dot" style={{ backgroundColor: color.dot }}></span>
                              {quiz.subject || "General"}
                            </div>
                            <div className="practice-difficulty">
                              {quiz.difficulty || "Medium"}
                            </div>
                          </div>
                          
                          <h3 className="practice-quiz-title">{quiz.title}</h3>
                          <p className="practice-quiz-desc">
                            Full mock exam to test your preparation.
                          </p>

                          <div className="practice-meta-grid">
                            <div className="meta-item">
                              <HelpCircle size={14} />
                              <span>{quiz.questionCount || quiz.questions?.length || 0} Questions</span>
                            </div>
                            <div className="meta-item">
                              <Clock size={14} />
                              <span>{quiz.sections && quiz.sections.length > 0 ? quiz.duration / 60 : quiz.duration} mins</span>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                            {attemptedQuizzes.includes(quiz._id) ? (
                              <button 
                                className="practice-start-btn" 
                                style={{ flex: 1 }}
                                onClick={() => handleSubjectClick(quiz)}
                              >
                                <BookOpen size={16} />
                                Reattempt Exam
                              </button>
                            ) : (
                              <button 
                                className="practice-start-btn" 
                                style={{ flex: 1 }}
                                onClick={() => handleSubjectClick(quiz)}
                              >
                                <BookOpen size={16} />
                                Start Exam
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                          </div>
                        </div>
                      )}
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
