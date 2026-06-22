import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/Questions.css";

// Helper to get emoji icon and card highlights based on subject names
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

// Date formatter
const formatDate = (dateString) => {
  if (!dateString) return "Not Published";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Not Published";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

function Questions() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 6;

  useEffect(() => {
    const fetchQuestionsAndGroup = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/quizzes");
        const grouped = {};

        res.data.forEach((quiz) => {
          // Group by examName
          const bookKey = (quiz.examName && quiz.examName.trim()) ? quiz.examName.trim() : "General Quizzes";
          
          if (!grouped[bookKey]) {
            grouped[bookKey] = {
              id: bookKey,
              title: bookKey,
              description: bookKey === "General Quizzes" ? "Standalone Quiz Modules" : `${bookKey} Collection`,
              totalQuestions: 0,
              publishedDate: quiz.createdAt,
              status: quiz.status || "Draft",
              subjects: {},
            };
          }

          const subjectKey = quiz.subject || "General";
          if (!grouped[bookKey].subjects[subjectKey]) {
            grouped[bookKey].subjects[subjectKey] = {
              quizId: quiz._id,
              subjectName: subjectKey,
              questionsCount: 0,
              questions: [],
              publishedDate: quiz.createdAt,
              status: quiz.status || "Draft",
            };
          }

          // Format questions list
          const quizQuestions = (quiz.questions || []).map((q, idx) => ({
            questionId: q._id,
            qNo: idx + 1,
            questionEnglish: q.questionEnglish,
            questionHindi: q.questionHindi,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
          }));

          grouped[bookKey].subjects[subjectKey].questions = [
            ...grouped[bookKey].subjects[subjectKey].questions,
            ...quizQuestions
          ];
          grouped[bookKey].subjects[subjectKey].questionsCount += quizQuestions.length;
          grouped[bookKey].totalQuestions += quizQuestions.length;

          // Keep latest date & status
          if (new Date(quiz.updatedAt || quiz.createdAt) > new Date(grouped[bookKey].publishedDate)) {
            grouped[bookKey].publishedDate = quiz.updatedAt || quiz.createdAt;
            grouped[bookKey].status = quiz.status || "Draft";
          }
          if (new Date(quiz.updatedAt || quiz.createdAt) > new Date(grouped[bookKey].subjects[subjectKey].publishedDate)) {
            grouped[bookKey].subjects[subjectKey].publishedDate = quiz.updatedAt || quiz.createdAt;
            grouped[bookKey].subjects[subjectKey].status = quiz.status || "Draft";
          }
        });

        // Convert grouped hash to array and assign covers
        const colors = ["purple", "green", "blue", "orange"];
        const booksList = Object.values(grouped).map((book, index) => {
          const subjectsArray = Object.values(book.subjects);
          return {
            ...book,
            subjects: subjectsArray,
            color: colors[index % colors.length]
          };
        });

        setBooks(booksList);
        
        if (booksList.length > 0) {
          // Select first book and its first subject by default
          setSelectedBook(booksList[0]);
          if (booksList[0].subjects.length > 0) {
            setSelectedSubject(booksList[0].subjects[0]);
          }
        }
      } catch (error) {
        console.error("Fetch Books Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionsAndGroup();
  }, []);

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    if (book.subjects && book.subjects.length > 0) {
      setSelectedSubject(book.subjects[0]);
    } else {
      setSelectedSubject(null);
    }
    setCurrentPage(1);
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setCurrentPage(1);
  };

  // Pagination Math
  const totalQuestions = selectedSubject ? selectedSubject.questions.length : 0;
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = selectedSubject 
    ? selectedSubject.questions.slice(indexOfFirstQuestion, indexOfLastQuestion) 
    : [];

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Questions Bank" />
        
        <div className="admin-content" style={{ padding: "32px", minHeight: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px", color: "var(--text-secondary)", fontSize: "16px" }}>
              ⏳ Loading Books database...
            </div>
          ) : books.length === 0 ? (
            <div className="no-books-placeholder">
              <span style={{ fontSize: "40px" }}>📭</span>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "20px", marginTop: "12px" }}>No Quizzes Found</h3>
              <p>You have not created any quizzes yet. Please create a quiz first to populate the questions bank.</p>
            </div>
          ) : (
            <div className="questions-bank-view">
              
              {/* 📘 LEFT PANEL: BOOKS LIST */}
              <div className="books-sidebar-panel">
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)", fontFamily: "'Fraunces', serif", margin: "0 0 4px 0" }}>
                    My Quizzes (Books)
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
                    Click on any book to view questions
                  </span>
                </div>

                <div className="books-list-grid">
                  {books.map((book) => {
                    const isActive = selectedBook?.id === book.id;
                    const dateText = book.status === "Published" ? `Published on ${formatDate(book.publishedDate)}` : "Draft (Not Published)";
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
                        <div>
                          <div className="book-badge-row">
                            <span className="book-count-badge">
                              {book.totalQuestions} Questions
                            </span>
                          </div>
                        </div>
                        <div className="book-footer-row">
                          <span>{dateText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 📖 RIGHT PANEL: DUAL PAGE OPENED NOTEBOOK */}
              <div className="opened-book-panel">
                {selectedBook && (
                  <div className="opened-book-container">
                    
                    {/* LEFT PAGE: TABLE OF CONTENTS (SUBJECTS IN QUIZ) */}
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
                        {selectedBook.subjects.map((sub, index) => {
                          const isActive = selectedSubject?.subjectName === sub.subjectName;
                          const meta = getSubjectMeta(sub.subjectName);
                          return (
                            <div 
                              key={index}
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

                    {/* RIGHT PAGE: QUESTIONS SHEET */}
                    <div className="book-page book-page-right" style={{ display: "flex", flexDirection: "column" }}>
                      {selectedSubject ? (
                        <>
                          <div className="right-page-header">
                            <div className="right-page-back-title" onClick={() => setSelectedSubject(null)}>
                              <span className="back-arrow-icon">←</span>
                              <span>{selectedSubject.subjectName}</span>
                            </div>
                            <span className="right-page-count-badge">
                              {selectedSubject.questionsCount} Questions
                            </span>
                          </div>

                          <div className="book-questions-list">
                            {currentQuestions.length > 0 ? (
                              currentQuestions.map((q, idx) => (
                                <div className="book-question-row" key={q.questionId || idx}>
                                  <div className="book-question-info-row">
                                    <span className="book-q-number">{q.qNo}</span>
                                    <p className="book-q-text">{q.questionEnglish}</p>
                                  </div>
                                  {q.questionHindi && (
                                    <div className="book-question-info-row" style={{ marginTop: "4px" }}>
                                      <span className="book-q-number" style={{ visibility: "hidden" }}>{q.qNo}</span>
                                      <p className="book-q-text" style={{ fontSize: "13.5px", color: "var(--text-secondary)", fontWeight: "500" }}>
                                        {q.questionHindi}
                                      </p>
                                    </div>
                                  )}
                                  <div className="book-q-ans-box">
                                    <span className="book-q-ans-label">Correct Answer:</span>
                                    <span className="book-q-ans-value">{q.correctAnswer}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                                No questions found in this section.
                              </div>
                            )}
                          </div>

                          {/* Pagination controls inside Right Page */}
                          {totalPages > 1 && (
                            <div className="book-pagination">
                              <button 
                                className="book-page-btn"
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                              >
                                &lt;
                              </button>
                              
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                  key={page}
                                  className={`book-page-btn ${currentPage === page ? "active" : ""}`}
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </button>
                              ))}

                              <button 
                                className="book-page-btn"
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                              >
                                &gt;
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="book-right-placeholder">
                          <span className="placeholder-emoji">📖</span>
                          <p>👈 Select a subject on the left page to start reading questions.</p>
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