import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/Questions.css";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const questionsPerPage = 15; // More per page since we now show options
  const [currentPage, setCurrentPage] = useState(1);

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
        if (booksList.length > 0) {
          setSelectedBook(booksList[0]);
          if (booksList[0].subjects.length > 0) setSelectedSubject(booksList[0].subjects[0]);
        }
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
    setSelectedSubject(book.subjects?.[0] || null);
    setCurrentPage(1);
    setSearchQuery("");
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setCurrentPage(1);
    setSearchQuery("");
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

              <div className="qb-left-col">
                <div className="qb-left-header">
                  <h3>My Quizzes</h3>
                  <p>Click on any quiz to view questions</p>
                </div>
                <div className="qb-books-list">
                  {books.map((book) => {
                    const isActive = selectedBook?.id === book.id;
                    const dateText = book.status === "Published" ? `Published on ${formatDate(book.publishedDate)}` : "Draft (Not Published)";
                    const firstLetter = book.title.charAt(0).toUpperCase();
                    return (
                      <div
                        key={book.id}
                        className={`qb-book-card ${isActive ? "active" : ""}`}
                        onClick={() => handleSelectBook(book)}
                      >
                        <div className="qb-book-icon">{firstLetter}</div>
                        <div className="qb-book-info">
                          <h4>{book.title}</h4>
                          <p>{book.description}</p>
                          <span className="qb-book-badge">{book.totalQuestions} Questions</span>
                          <div className="qb-book-date">{dateText}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── MIDDLE: EXAM DETAILS / SUBJECTS ── */}
              <div className="qb-middle-col">
                {selectedBook ? (
                  <>
                    <div className="qb-middle-header">
                      <div className="qb-middle-icon">{selectedBook.title.charAt(0).toUpperCase()}</div>
                      <div className="qb-middle-info">
                        <h2>
                          {selectedBook.title}
                          {selectedBook.status === "Published" && <span className="qb-status-badge">Published</span>}
                        </h2>
                        <h4>{selectedBook.description}</h4>
                        <div className="qb-middle-meta">
                          {selectedBook.status === "Published" ? `Published on ${formatDate(selectedBook.publishedDate)}` : "Draft"} • Total Questions: {selectedBook.totalQuestions}
                        </div>
                      </div>
                      <div style={{ cursor: "pointer", color: "var(--text-muted)" }}>⋮</div>
                    </div>

                    <div className="qb-subjects-section">
                      <div className="qb-subjects-header">
                        <div>
                          <h3>Subjects in this Quiz</h3>
                          <p>Click a subject to view its questions</p>
                        </div>
                        <span className="qb-total-subs">Total Subjects: {selectedBook.subjects.length}</span>
                      </div>
                      <div className="qb-subjects-list">
                        {selectedBook.subjects.map((sub, i) => {
                          const isActive = selectedSubject?.subjectName === sub.subjectName;
                          const meta = getSubjectMeta(sub.subjectName);
                          return (
                            <div
                              key={i}
                              className={`qb-subject-card ${isActive ? "active" : ""}`}
                              onClick={() => handleSelectSubject(sub)}
                            >
                              <div className="qb-sub-icon" style={{ backgroundColor: meta.color, color: meta.textColor }}>
                                {meta.emoji}
                              </div>
                              <div className="qb-sub-info">
                                <h5>{sub.subjectName}</h5>
                                <p>{selectedBook.title} - {sub.subjectName}</p>
                              </div>
                              <span className="qb-sub-count">{sub.questionsCount}</span>
                              <span style={{ color: "var(--text-muted)" }}>›</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    Select a book to view details
                  </div>
                )}
              </div>

              {/* ── RIGHT: QUESTIONS LIST ── */}
              <div className="qb-right-col">
                {selectedSubject ? (
                  <>
                    <div className="qb-right-header">
                      <div className="qb-right-top">
                        <div className="qb-right-title">
                          <button className="qb-back-btn" onClick={() => setSelectedSubject(null)}>←</button>
                          <div>
                            <h2>{selectedSubject.subjectName}</h2>
                            <p>{selectedSubject.questionsCount} Questions</p>
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
                        <div className="qb-search-input">
                          <span style={{position: "absolute", left: "12px", top: "10px"}}>🔍</span>
                          <input 
                            placeholder="Search questions..." 
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    Select a subject to view questions
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Questions;