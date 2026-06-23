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
function QuestionCard({ q, idx, globalNo, forceCollapse }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(forceCollapse);
  }, [forceCollapse]);

  const options = q.options || [];
  const correct = q.correctAnswer; // e.g. "A", "B", "C", "D"

  return (
    <div 
      className="bq-card" 
      key={q.questionId || idx}
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1.5px solid var(--border-color)",
        borderRadius: "12px",
        margin: "12px 16px 14px",
        overflow: "hidden",
        boxShadow: "var(--card-shadow)",
        display: "block",
        height: "auto",
        minHeight: "fit-content",
        transition: "box-shadow 0.15s ease"
      }}
    >
      {/* ── Question Header (always visible) ── */}
      <div 
        className="bq-header" 
        onClick={() => setCollapsed((c) => !c)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "14px",
          padding: "16px 20px",
          cursor: "pointer",
          userSelect: "none"
        }}
      >
        <div className="bq-header-left" style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
          <span 
            className="bq-num"
            style={{
              minWidth: "28px",
              height: "28px",
              backgroundColor: "rgba(110, 63, 243, 0.1)",
              color: "#6E3FF3",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "800",
              flexShrink: 0,
              marginTop: "2px"
            }}
          >
            {globalNo}
          </span>
          <div className="bq-texts" style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, textAlign: "left" }}>
            <p 
              className="bq-eng"
              style={{
                fontSize: "14.5px",
                fontWeight: "600",
                color: "var(--text-primary)",
                margin: 0,
                lineHeight: "1.5"
              }}
            >
              {q.questionEnglish}
            </p>
            {q.questionHindi && (
              <p 
                className="bq-hin"
                style={{
                  fontSize: "13.5px",
                  fontWeight: "500",
                  color: "var(--text-secondary)",
                  margin: 0,
                  lineHeight: "1.5",
                  marginTop: "2px"
                }}
              >
                {q.questionHindi}
              </p>
            )}
          </div>
        </div>
        <button
          className="bq-collapse-btn"
          title={collapsed ? "Expand" : "Collapse"}
          onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
          style={{
            backgroundColor: "var(--bg-input)",
            color: "var(--text-secondary)",
            border: "1.5px solid var(--border-color)",
            borderRadius: "6px",
            width: "28px",
            height: "28px",
            minWidth: "28px",
            padding: 0,
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            lineHeight: 1
          }}
        >
          {collapsed ? "＋" : "－"}
        </button>
      </div>

      {/* ── Options + Correct highlight (collapsible) ── */}
      {!collapsed && (
        <div 
          className="bq-options"
          style={{
            padding: "0 20px 16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "12px"
          }}
        >
          {options.length > 0 ? (
            options.map((opt, i) => {
              const label = optionLabel(i);
              const isCorrect = correct === label;
              const optText = typeof opt === "object" ? (opt.text || opt.value || JSON.stringify(opt)) : opt;
              return (
                <div
                  key={i}
                  className={`bq-option ${isCorrect ? "bq-option-correct" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: isCorrect ? "1.5px solid #16A34A" : "1.5px solid var(--border-color)",
                    backgroundColor: isCorrect ? "rgba(22, 163, 74, 0.08)" : "var(--bg-input)",
                    transition: "all 0.15s ease",
                    textAlign: "left"
                  }}
                >
                  <span 
                    className={`bq-opt-label ${isCorrect ? "bq-opt-label-correct" : ""}`}
                    style={{
                      minWidth: "24px",
                      height: "24px",
                      borderRadius: "6px",
                      backgroundColor: isCorrect ? "#16A34A" : "var(--border-color)",
                      color: isCorrect ? "#ffffff" : "var(--text-secondary)",
                      fontSize: "11px",
                      fontWeight: "800",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    {label}
                  </span>
                  <span 
                    className="bq-opt-text"
                    style={{
                      fontSize: "13.5px",
                      color: "var(--text-primary)",
                      flex: 1,
                      fontWeight: "500",
                      textAlign: "left"
                    }}
                  >
                    {optText}
                  </span>
                  {isCorrect && (
                    <span 
                      className="bq-correct-tick"
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#16A34A",
                        backgroundColor: "rgba(22, 163, 74, 0.12)",
                        padding: "3px 9px",
                        borderRadius: "20px",
                        whiteSpace: "nowrap",
                        flexShrink: 0
                      }}
                    >
                      ✓ Correct
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            // Fallback — if options aren't stored as array, just show correct answer
            <div 
              className="bq-option bq-option-correct"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid #16A34A",
                backgroundColor: "rgba(22, 163, 74, 0.08)",
                textAlign: "left"
              }}
            >
              <span 
                className="bq-opt-label bq-opt-label-correct"
                style={{
                  minWidth: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  backgroundColor: "#16A34A",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "800",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {correct}
              </span>
              <span 
                className="bq-opt-text"
                style={{
                  fontSize: "13.5px",
                  color: "var(--text-primary)",
                  flex: 1,
                  fontWeight: "500",
                  textAlign: "left"
                }}
              >
                Correct Answer
              </span>
              <span 
                className="bq-correct-tick"
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#16A34A",
                  backgroundColor: "rgba(22, 163, 74, 0.12)",
                  padding: "3px 9px",
                  borderRadius: "20px",
                  whiteSpace: "nowrap",
                  flexShrink: 0
                }}
              >
                ✓ Correct
              </span>
            </div>
          )}
        </div>
      )}
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
        const res = await axios.get("http://localhost:5000/api/quizzes");
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
        <div className="admin-content" style={{ padding: "32px", minHeight: 0 }}>
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

              {/* ── LEFT: BOOKS ── */}
              <div className="books-sidebar-panel">
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                    My Quizzes (Books)
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
                    Click on any book to view questions
                  </span>
                </div>
                <div className="books-list-grid">
                  {books.map((book) => {
                    const isActive = selectedBook?.id === book.id;
                    const dateText = book.status === "Published" ? `Published ${formatDate(book.publishedDate)}` : "Draft (Not Published)";
                    return (
                      <div
                        key={book.id}
                        className={`notebook-book-cover ${book.color}-cover ${isActive ? "active" : ""}`}
                        onClick={() => handleSelectBook(book)}
                      >
                        <div className="book-title-section">
                          <h4 className="book-exam-label">{book.title}</h4>
                          <span className="book-subject-label">{book.description}</span>
                        </div>
                        <div className="book-badge-row">
                          <span className="book-count-badge">{book.totalQuestions} Questions</span>
                        </div>
                        <div className="book-footer-row"><span>{dateText}</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── RIGHT: OPENED BOOK ── */}
              <div className="opened-book-panel">
                {selectedBook && (
                  <div className="opened-book-container">

                    {/* LEFT PAGE: TABLE OF CONTENTS */}
                    <div className="book-page book-page-left">
                      <div className="book-header-section">
                        <h2 className="book-header-title">{selectedBook.title}</h2>
                        <h4 className="book-header-subtitle">{selectedBook.description}</h4>
                        <div className="book-header-meta">
                          {selectedBook.status === "Published" ? "Published" : "Draft"} | Total Questions: {selectedBook.totalQuestions}
                        </div>
                      </div>
                      <h3 className="book-section-title">Subjects in this Quiz</h3>
                      <div className="subjects-toc-list">
                        {selectedBook.subjects.map((sub, i) => {
                          const isActive = selectedSubject?.subjectName === sub.subjectName;
                          const meta = getSubjectMeta(sub.subjectName);
                          return (
                            <div
                              key={i}
                              className={`subject-item-card ${isActive ? "active" : ""}`}
                              onClick={() => handleSelectSubject(sub)}
                            >
                              <div className="subject-icon-wrapper" style={{ backgroundColor: meta.color, color: meta.textColor }}>
                                {meta.emoji}
                              </div>
                              <div className="subject-info">
                                <h4 className="subject-title">{sub.subjectName}</h4>
                                <p className="subject-questions-count">{sub.questionsCount} Questions</p>
                              </div>
                              <span className="subject-chevron">›</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT PAGE: QUESTIONS */}
                    <div className="book-page book-page-right" style={{ display: "flex", flexDirection: "column" }}>
                      {selectedSubject ? (
                        <>
                          {/* ── Page Header ── */}
                          <div className="right-page-header">
                            <div className="right-page-back-title" onClick={() => setSelectedSubject(null)}>
                              <span className="back-arrow-icon">←</span>
                              <span>{selectedSubject.subjectName}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className="right-page-count-badge">{selectedSubject.questionsCount} Questions</span>

                              {/* ── EXPORT BUTTON ── */}
                              <div style={{ position: "relative" }}>
                                <button
                                  onClick={() => setShowExportMenu((v) => !v)}
                                  style={{
                                    background: "#16A34A", color: "#fff",
                                    border: "none", borderRadius: "8px",
                                    padding: "6px 14px", fontSize: "12px", fontWeight: "700",
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                                    width: "auto",
                                  }}
                                  title="Export questions for this subject"
                                >
                                  ↗ Export
                                </button>
                                {showExportMenu && (
                                  <div style={{
                                    position: "absolute", top: "110%", right: 0,
                                    background: "var(--bg-card)", border: "1.5px solid var(--border-color)",
                                    borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                                    zIndex: 999, minWidth: "150px", overflow: "hidden",
                                  }}>
                                    <button
                                      onClick={() => { exportToCSV(selectedSubject); setShowExportMenu(false); }}
                                      style={{
                                        display: "block", width: "100%", padding: "11px 16px",
                                        textAlign: "left", background: "none", border: "none",
                                        color: "var(--text-primary)", fontSize: "13px", fontWeight: "600",
                                        cursor: "pointer",
                                      }}
                                    >
                                      📊 Export as CSV
                                    </button>
                                    <button
                                      onClick={() => { exportToJSON(selectedSubject); setShowExportMenu(false); }}
                                      style={{
                                        display: "block", width: "100%", padding: "11px 16px",
                                        textAlign: "left", background: "none", border: "none",
                                        color: "var(--text-primary)", fontSize: "13px", fontWeight: "600",
                                        cursor: "pointer", borderTop: "1px solid var(--border-color)",
                                      }}
                                    >
                                      📋 Export as JSON
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* ── COLLAPSE ALL ── */}
                              <button
                                onClick={() => setAllCollapsed((v) => !v)}
                                style={{
                                  background: "var(--bg-input)", color: "var(--text-secondary)",
                                  border: "1.5px solid var(--border-color)", borderRadius: "8px",
                                  padding: "6px 12px", fontSize: "12px", fontWeight: "600",
                                  cursor: "pointer", width: "auto",
                                }}
                                title={allCollapsed ? "Expand all questions" : "Collapse all questions"}
                              >
                                {allCollapsed ? "＋ Expand All" : "－ Collapse All"}
                              </button>
                            </div>
                          </div>

                          {/* ── Search ── */}
                          <div style={{ padding: "10px 20px 4px" }}>
                            <input
                              placeholder="🔍 Search questions..."
                              value={searchQuery}
                              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                              style={{
                                width: "100%", padding: "8px 14px",
                                border: "1.5px solid var(--border-color)",
                                borderRadius: "8px", background: "var(--bg-input)",
                                color: "var(--text-primary)", fontSize: "13px",
                                outline: "none", fontFamily: "inherit",
                              }}
                            />
                          </div>

                          {/* ── Question Cards ── */}
                          <div className="book-questions-list" style={{ flex: 1, overflowY: "auto" }}>
                            {paginated.length > 0 ? (
                              paginated.map((q, idx) => (
                                <QuestionCard
                                  key={q.questionId || idx}
                                  q={q}
                                  idx={idx}
                                  globalNo={(currentPage - 1) * questionsPerPage + idx + 1}
                                  forceCollapse={allCollapsed}
                                />
                              ))
                            ) : (
                              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                {searchQuery ? "No questions match your search." : "No questions found in this section."}
                              </div>
                            )}
                          </div>

                          {/* ── Pagination ── */}
                          {totalPages > 1 && (
                            <div className="book-pagination">
                              <button className="book-page-btn" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>&lt;</button>
                              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                // Show pages around current page
                                let page = i + 1;
                                if (totalPages > 7) {
                                  const start = Math.max(1, currentPage - 3);
                                  page = start + i;
                                  if (page > totalPages) return null;
                                }
                                return (
                                  <button
                                    key={page}
                                    className={`book-page-btn ${currentPage === page ? "active" : ""}`}
                                    onClick={() => setCurrentPage(page)}
                                  >
                                    {page}
                                  </button>
                                );
                              })}
                              <button className="book-page-btn" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>&gt;</button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="book-right-placeholder">
                          <span className="placeholder-emoji">📖</span>
                          <p>👈 Select a subject on the left to view questions.</p>
                        </div>
                      )}
                    </div>

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