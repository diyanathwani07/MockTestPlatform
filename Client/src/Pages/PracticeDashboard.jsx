import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import { BookOpen, Clock, HelpCircle, Search } from "lucide-react";
import "../css/StudentDashboard.css";
import "../css/Practice.css";

function PracticeDashboard() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
  const filteredQuizzes = quizzes.filter(quiz => {
    const titleText = (quiz.title || quiz.examGroup || "").toLowerCase();
    const subjectText = (quiz.subject || "General").toLowerCase();
    return searchTerms.every(term => titleText.includes(term) || subjectText.includes(term));
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/practice`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
    navigate(`/practice/${quizId}?restart=true`);
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
          <div className="practice-header-actions" style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
            <div className="practice-search-container" style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search practice modules..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px 16px 12px 40px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border-color)', 
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>
          </div>

          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner"></div>
              <p>Loading available practice modules...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-icon">📭</div>
              <h3>No Practice Tests Found</h3>
              <p>{searchQuery ? "Try adjusting your search keywords." : "Check back soon for new learning modules."}</p>
            </div>
          ) : (
            <div className="practice-grid">
              {filteredQuizzes.map((quiz, index) => {
                const color = subjectColors[index % subjectColors.length];
                const questionCount = quiz.questionCount || 
                  (quiz.isModular && quiz.sections
                    ? quiz.sections.reduce((sum, sec) => sum + (sec.sectionId?.questions?.length || 0), 0)
                    : quiz.questions?.length) || 0;
                
                return (
                  <div key={quiz._id} className="practice-card">
                    <div className="practice-card-header">
                      <div className="practice-subject-badge" style={{ backgroundColor: color.bg, color: color.text }}>
                        <span className="dot" style={{ backgroundColor: color.dot }}></span>
                        <span className="badge-text" title={quiz.subject || "General"}>{quiz.subject || "General"}</span>
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
