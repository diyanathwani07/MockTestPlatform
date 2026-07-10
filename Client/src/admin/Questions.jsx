import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { HelpCircle, Clock, Search } from "lucide-react";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/Questions.css";
import "../css/Practice.css";
import Folder from "../components/Folder";

// ── Helpers ──
const getSubjectMeta = (subjectName) => {
  const name = String(subjectName).toLowerCase();
  if (name.includes("history")) return { emoji: "📜", color: "#FEE2E2", textColor: "#EF4444" };
  if (name.includes("polity") || name.includes("civics") || name.includes("law")) return { emoji: "🏛️", color: "#E0F2FE", textColor: "#0284C7" };
  if (name.includes("geography") || name.includes("environment") || name.includes("earth")) return { emoji: "🌍", color: "#DCFCE7", textColor: "#22C55E" };
  if (name.includes("economy") || name.includes("business") || name.includes("finance")) return { emoji: "📈", color: "#FEF3C7", textColor: "#D97706" };
  if (name.includes("science") || name.includes("physics") || name.includes("chemistry") || name.includes("biology") || name.includes("tech")) return { emoji: "🔬", color: "#F3E8FF", textColor: "#A855F7" };
  if (name.includes("current") || name.includes("general") || name.includes("gk") || name.includes("news")) return { emoji: "📰", color: "#FFEDD5", textColor: "#F97316" };
  if (name.includes("math") || name.includes("quantitative") || name.includes("aptitude") || name.includes("numerical")) return { emoji: "🔢", color: "#E0F2FE", textColor: "#3B82F6" };
  if (name.includes("english") || name.includes("hindi") || name.includes("language") || name.includes("verbal")) return { emoji: "📝", color: "#ECEFEE", textColor: "#4B5563" };
  if (name.includes("computer") || name.includes("programming") || name.includes("it")) return { emoji: "💻", color: "#ECFDF5", textColor: "#10B981" };
  return { emoji: "📚", color: "#F1F5F9", textColor: "#64748B" };
};

const formatDate = (dateString) => {
  if (!dateString) return "Not Published";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Not Published";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Option label A/B/C/D
const optionLabel = (idx) => String.fromCharCode(65 + idx);

// ── Export helpers ──
const exportToCSV = (subject) => {
  const headers = ["Q.No", "Question (English)", "Question (Hindi)", "Option A", "Option B", "Option C", "Option D", "Correct Answer"];
  const rows = subject.questions.map((q) => [
    q.qNo,
    `"${(q.questionEnglish || "").replace(/"/g, '""')}"`,
    `"${(q.questionHindi || "").replace(/"/g, '""')}"`,
    ...(q.options || []).map((o) => `"${String(o.text || o || "").replace(/"/g, '""')}"`),
    q.correctAnswer,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subject.subjectName}_questions.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToJSON = (subject) => {
  const blob = new Blob([JSON.stringify(subject.questions, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${subject.subjectName}_questions.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Single Question Card ──
function QuestionCard({ q, idx, globalNo }) {
  const options = q.options || [];
  const correct = q.correctAnswer; // e.g. "A", "B", "C", "D"

  return (
    <div className="qb-qcard" key={q.questionId || idx}>
      <div className="qb-qcard-header">
        <div className="qb-qnum">{globalNo}</div>
        <div className="qb-qtext-box">
          <p className="qb-qtext-eng">{q.questionEnglish}</p>
          {q.questionHindi && <p className="qb-qtext-hin">{q.questionHindi}</p>}
        </div>
        <div className="qb-qbadge">MCQ</div>
      </div>
      <div className="qb-options-grid">
        {options.map((opt, oIdx) => {
          const letter = optionLabel(oIdx);
          const isCorrect = String(correct).trim().toUpperCase() === letter;
          return (
            <div key={oIdx} className={`qb-opt ${isCorrect ? "correct" : ""}`}>
              <div className="qb-opt-letter">{letter}</div>
              <span className="qb-opt-text">{opt.text || opt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ──
function Questions() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [viewMode, setViewMode] = useState("quizzes"); // "quizzes" | "subjects" | "questions"
  const [searchQuery, setSearchQuery] = useState("");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const questionsPerPage = 15; // More per page since we now show options
  const [currentPage, setCurrentPage] = useState(1);
  const [openingBookId, setOpeningBookId] = useState(null);

  const handleCardClick = (book) => {
    setOpeningBookId(book.id);
    setTimeout(() => {
      handleSelectBook(book);
      setOpeningBookId(null);
    }, 750);
  };

  useEffect(() => {
    const fetchQuestionsAndGroup = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes`);
        const grouped = {};

        res.data.forEach((quiz) => {
          const bookKey = (quiz.examName && quiz.examName.trim()) ? quiz.examName.trim() : "General Quizzes";
          if (!grouped[bookKey]) {
            grouped[bookKey] = {
              id: bookKey, title: bookKey,
              description: bookKey === "General Quizzes" ? "Standalone Quiz Modules" : `${bookKey} Collection`,
              totalQuestions: 0, publishedDate: quiz.createdAt,
              status: quiz.status || "Draft", subjects: {},
            };
          }
          const subjectKey = quiz.subject || "General";
          if (!grouped[bookKey].subjects[subjectKey]) {
            grouped[bookKey].subjects[subjectKey] = {
              quizId: quiz._id, subjectName: subjectKey,
              questionsCount: 0, questions: [],
              publishedDate: quiz.createdAt, status: quiz.status || "Draft",
            };
          }
          const quizQuestions = (quiz.questions || []).map((q, idx) => ({
            questionId: q._id, qNo: idx + 1,
            questionEnglish: q.questionEnglish, questionHindi: q.questionHindi,
            options: q.options || [], correctAnswer: q.correctAnswer,
          }));
          grouped[bookKey].subjects[subjectKey].questions.push(...quizQuestions);
          grouped[bookKey].subjects[subjectKey].questionsCount += quizQuestions.length;
          grouped[bookKey].totalQuestions += quizQuestions.length;
          if (new Date(quiz.updatedAt || quiz.createdAt) > new Date(grouped[bookKey].publishedDate)) {
            grouped[bookKey].publishedDate = quiz.updatedAt || quiz.createdAt;
            grouped[bookKey].status = quiz.status || "Draft";
          }
        });

        const colors = ["purple", "green", "blue", "orange"];
        const booksList = Object.values(grouped).map((book, i) => ({
          ...book,
          subjects: Object.values(book.subjects),
          color: colors[i % colors.length],
        }));

        setBooks(booksList);
        // Do not auto-select to enforce a true drill-down experience
      } catch (err) {
        console.error("Fetch Books Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestionsAndGroup();
  }, []);

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setSelectedSubject(null);
    setCurrentPage(1);
    setSearchQuery("");
    setViewMode("subjects");
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setCurrentPage(1);
    setSearchQuery("");
    setViewMode("questions");
  };

  const handleBackToQuizzes = () => {
    setViewMode("quizzes");
    setSelectedBook(null);
    setSelectedSubject(null);
  };

  const handleBackToSubjects = () => {
    setViewMode("subjects");
    setSelectedSubject(null);
  };

  // Filtered questions by search
  const filteredQuestions = selectedSubject
    ? selectedSubject.questions.filter((q) => {
        const s = searchQuery.toLowerCase();
        return (
          !s ||
          (q.questionEnglish || "").toLowerCase().includes(s) ||
          (q.questionHindi || "").toLowerCase().includes(s)
        );
      })
    : [];

  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const paginated = filteredQuestions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Questions Bank" />
        <div className="admin-content" style={{ padding: "24px", minHeight: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px", color: "var(--text-secondary)", fontSize: "16px" }}>
              ⏳ Loading Questions database...
            </div>
          ) : books.length === 0 ? (
            <div className="no-books-placeholder">
              <span style={{ fontSize: "40px" }}>📭</span>
              <h3>No Quizzes Found</h3>
              <p>Create a quiz first to populate the questions bank.</p>
            </div>
          ) : (
            <div className="questions-bank-view">

              {/* ── VIEW 1: QUIZZES ── */}
              {viewMode === "quizzes" && (
                <div className="qb-quizzes-view">
                  <div className="qb-view-header">
                    <h2>Select a Quiz</h2>
                    <p>Choose a quiz to view its subjects and questions.</p>
                  </div>
                  <div className="practice-grid">
                    {books.map((book, index) => {
                      const dateText = book.status === "Published" ? `Published on ${formatDate(book.publishedDate)}` : "Draft (Not Published)";
                      const subjectColors = [
                        { bg: "#EDE9FE", text: "#5B21B6", dot: "#7C3AED" },
                        { bg: "#DCFCE7", text: "#166534", dot: "#16A34A" },
                        { bg: "#FEF9C3", text: "#854D0E", dot: "#D97706" },
                        { bg: "#FFE4E6", text: "#9F1239", dot: "#E11D48" },
                        { bg: "#DBEAFE", text: "#1E40AF", dot: "#2563EB" },
                        { bg: "#FCE7F3", text: "#9D174D", dot: "#DB2777" },
                        { bg: "#F0FDF4", text: "#14532D", dot: "#15803D" },
                      ];
                      const color = subjectColors[index % subjectColors.length];

                      return (
                        <div
                          key={book.id}
                          className={`practice-card ${openingBookId === book.id ? 'opening' : ''}`}
                          onClick={() => handleCardClick(book)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="practice-card-header">
                            <div className="practice-subject-badge" style={{ backgroundColor: color.bg, color: color.text }}>
                              <span className="dot" style={{ backgroundColor: color.dot }}></span>
                              {book.status === "Published" ? "Published" : "Draft"}
                            </div>
                            <div className="practice-difficulty">
                              Collection
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 15px 0' }}>
                            <Folder 
                              color={color.dot} 
                              size={1.1} 
                              open={openingBookId === book.id}
                              items={[
                                <div key={1} style={{ padding: '2px', fontSize: '8.5px', color: '#1e293b', fontWeight: '800', textAlign: 'center' }}>📄 Quiz</div>,
                                <div key={2} style={{ padding: '2px', fontSize: '8.5px', color: '#1e293b', fontWeight: '800', textAlign: 'center' }}>📝 {book.totalQuestions} Qs</div>,
                                <div key={3} style={{ padding: '2px', fontSize: '8.5px', color: '#1e293b', fontWeight: '800', textAlign: 'center' }}>✨ Tests</div>
                              ]}
                            />
                          </div>
                          
                          <h3 className="practice-quiz-title">{book.title}</h3>
                          <p className="practice-quiz-desc">
                            {book.description || "Quiz collection containing multiple subjects."}
                          </p>

                          <div className="practice-meta-grid" style={{ marginBottom: "0" }}>
                            <div className="meta-item">
                              <HelpCircle size={14} />
                              <span>{book.totalQuestions} Questions</span>
                            </div>
                            <div className="meta-item">
                              <Clock size={14} />
                              <span>{dateText}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── VIEW 2: SUBJECTS ── */}
              {viewMode === "subjects" && selectedBook && (
                <div className="qb-subjects-view">
                  <div className="qb-view-header-with-back">
                    <button className="qb-back-btn" onClick={handleBackToQuizzes}>←</button>
                    <div>
                      <h2>{selectedBook.title} - Subjects</h2>
                      <p>Total Subjects: {selectedBook.subjects.length} • Total Questions: {selectedBook.totalQuestions}</p>
                    </div>
                  </div>
                  <div className="qb-subjects-grid">
                    {selectedBook.subjects.map((sub, i) => {
                      const meta = getSubjectMeta(sub.subjectName);
                      return (
                        <div
                          key={i}
                          className="qb-subject-card"
                          onClick={() => handleSelectSubject(sub)}
                        >
                          <div className="qb-sub-icon" style={{ backgroundColor: meta.color, color: meta.textColor }}>
                            {meta.emoji}
                          </div>
                          <div className="qb-sub-info">
                            <h5>{sub.subjectName}</h5>
                            <p>{sub.questionsCount} Questions</p>
                          </div>
                          <span className="qb-sub-arrow" style={{ color: "var(--text-muted)", fontSize: "20px" }}>›</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── VIEW 3: QUESTIONS ── */}
              {viewMode === "questions" && selectedSubject && (
                <div className="qb-questions-view">
                  <div className="qb-right-header">
                    <div className="qb-right-top">
                      <div className="qb-right-title">
                        <button className="qb-back-btn" onClick={handleBackToSubjects}>←</button>
                        <div>
                          <h2>{selectedSubject.subjectName}</h2>
                          <p>{selectedSubject.questionsCount} Questions in {selectedBook.title}</p>
                        </div>
                      </div>
                      <div className="qb-right-actions">
                        <button className="qb-btn-export" onClick={() => setShowExportMenu(!showExportMenu)}>
                          ↓ Export
                        </button>
                        <button className="qb-btn-filter">
                          <span style={{ fontSize: "16px" }}>⚲</span>
                        </button>
                        {showExportMenu && (
                          <div style={{
                            position: "absolute", top: "100%", right: "40px",
                            background: "var(--bg-card)", border: "1px solid var(--border-color)",
                            borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            zIndex: 10, marginTop: "8px", minWidth: "140px"
                          }}>
                            <button
                              onClick={() => { exportToCSV(selectedSubject); setShowExportMenu(false); }}
                              style={{
                                display: "block", width: "100%", padding: "10px 16px",
                                textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--border-color)",
                                color: "var(--text-primary)", fontSize: "13px", cursor: "pointer",
                              }}
                            >
                              Export CSV
                            </button>
                            <button
                              onClick={() => { exportToJSON(selectedSubject); setShowExportMenu(false); }}
                              style={{
                                display: "block", width: "100%", padding: "10px 16px",
                                textAlign: "left", background: "none", border: "none",
                                color: "var(--text-primary)", fontSize: "13px", cursor: "pointer",
                              }}
                            >
                              Export JSON
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="qb-right-searchbar">
                      <div style={{ 
                        flex: 1,
                        display: "flex", alignItems: "center", gap: "10px",
                        backgroundColor: "var(--bg-card)", border: "2px solid var(--violet)",
                        borderRadius: "100px", padding: "8px 16px",
                        boxShadow: "0 4px 12px rgba(110, 63, 243, 0.1)"
                      }}>
                        <Search size={16} style={{ color: "var(--violet)", flexShrink: 0 }} />
                        <input 
                          placeholder="Search questions..." 
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                          style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "13px", color: "var(--text-primary)", fontWeight: "500" }}
                        />
                      </div>
                      <select className="qb-type-select">
                        <option>All Types</option>
                        <option>MCQ</option>
                      </select>
                    </div>
                  </div>

                  <div className="qb-questions-list">
                    {paginated.length > 0 ? (
                      paginated.map((q, idx) => (
                        <QuestionCard
                          key={q.questionId || idx}
                          q={q}
                          idx={idx}
                          globalNo={(currentPage - 1) * questionsPerPage + idx + 1}
                        />
                      ))
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        {searchQuery ? "No questions match your search." : "No questions found."}
                      </div>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="qb-pagination">
                      <button className="qb-page-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>&lt;</button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page = i + 1;
                        if (totalPages > 5) {
                          const start = Math.max(1, currentPage - 2);
                          page = start + i;
                          if (page > totalPages) return null;
                        }
                        return (
                          <button
                            key={page}
                            className={`qb-page-btn ${currentPage === page ? "active" : ""}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <button className="qb-page-btn" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                      )}
                      <button className="qb-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>&gt;</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Questions;