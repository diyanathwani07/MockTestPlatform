import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import { BookOpen, Clock, HelpCircle, ChevronRight } from "lucide-react";
import "../css/StudentDashboard.css"; // Reuse dashboard layout styles
import "../css/MyExams.css"; // New specific styles

function MyExams() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes?published=true`);
        setQuizzes(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
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
        <div className="sd-content">
          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner"></div>
              <p>Loading available exams...</p>
            </div>
          ) : examNames.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-icon">📭</div>
              <h3>No Exams Published Yet</h3>
              <p>Check back soon. The admin will publish exams shortly.</p>
            </div>
          ) : (
            <>
              <div className="sd-header">
                <div className="sd-breadcrumbs">
                  <Link to="/dashboard">Dashboard</Link> &gt; <span>My Exams</span>
                </div>
              </div>
              <div className="me-page-header">
                <h1 className="me-page-title">My Exams</h1>
              </div>

              <div className="me-section-title">AVAILABLE EXAMS</div>
              <div className="me-exam-grid">
                {examNames.map((examName) => {
                  const group = examGroups[examName];
                  const count = group.length;
                  const totalMins = group.reduce((sum, q) => sum + (Number(q.duration) || 0), 0);
                  const totalQs = group.reduce((sum, q) => sum + (Number(q.questionCount) || q.questions?.length || 0), 0);
                  const isSelected = selectedExam === examName;
                  
                  return (
                    <div
                      key={examName}
                      className={`me-exam-card ${isSelected ? "me-exam-active" : ""}`}
                      onClick={() => setSelectedExam(isSelected ? null : examName)}
                    >
                      {/* TOP ROW */}
                      <div className="me-card-top">
                        <div className="me-card-left">
                          <div className="me-icon-wrapper">
                            📄<span className="me-icon-pen" style={{ fontSize: "14px", bottom: "10px", right: "8px" }}>⭐</span>
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
                        <button className="sp-btn-save" style={{ padding: "8px 16px" }}>Start Exam</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedExam && (
                <div className="sd-subjects-panel">
                  <div className="sd-subjects-header">
                    <span className="sd-subjects-title">
                      {selectedExam} — Choose a Subject
                    </span>
                    <span className="sd-subjects-count">
                      {examGroups[selectedExam].length} available
                    </span>
                  </div>
                  <div className="sd-subjects-grid">
                    {examGroups[selectedExam].map((quiz, idx) => {
                      const color = subjectColors[idx % subjectColors.length];
                      return (
                        <div
                          key={quiz._id}
                          className="sd-subject-card"
                          onClick={() => handleSubjectClick(quiz)}
                        >
                          <div className="sd-subject-top">
                            <div
                              className="sd-subject-dot"
                              style={{ backgroundColor: color.dot }}
                            ></div>
                            <span
                              className="sd-subject-badge"
                              style={{ backgroundColor: color.bg, color: color.text }}
                            >
                              {quiz.subject}
                            </span>
                          </div>
                          <div className="sd-subject-name">{quiz.title}</div>
                          <div className="sd-subject-meta">
                            <span>⏱ {quiz.duration} mins</span>
                            <span>❓ {quiz.questionCount || quiz.questions?.length || "—"} Qs</span>
                          </div>
                          <button className="sd-start-btn">
                            Start Quiz
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyExams;
