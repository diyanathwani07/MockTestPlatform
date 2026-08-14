import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { HelpCircle, Clock, Search, Pencil, SlidersHorizontal, ArrowLeft, ChevronRight, BookOpen, GraduationCap, Trash2, CheckSquare, FileText, Calendar, FolderOpen } from "lucide-react";
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

// ── Single Question Card (with inline edit) ──
function QuestionCard({ q, idx, globalNo, onUpdateAnswer, isGlobalEdit }) {
  const [pendingCorrect, setPendingCorrect] = useState(null);
  const [saving, setSaving] = useState(false);
  const options = q.options || [];
  const correct = q.correctAnswer;

  const handleSave = async () => {
    if (!pendingCorrect || !onUpdateAnswer) return;
    setSaving(true);
    await onUpdateAnswer(q.questionId, pendingCorrect);
    setSaving(false);
    setPendingCorrect(null);
  };

  // Reset pending when edit mode is turned off globally
  React.useEffect(() => {
    if (!isGlobalEdit) setPendingCorrect(null);
  }, [isGlobalEdit]);

  const displayCorrect = pendingCorrect || correct;

  return (
    <div className={`qb-qcard ${isGlobalEdit ? "qb-qcard-editing" : ""}`} key={q.questionId || idx}>
      <div className="qb-qcard-header">
        <div className="qb-qnum">{globalNo}</div>
        <div className="qb-qtext-box">
          <p className="qb-qtext-eng">{q.questionEnglish}</p>
          {q.questionHindi && <p className="qb-qtext-hin">{q.questionHindi}</p>}
          {q.createdAt && (
            <span style={{ 
              fontSize: "10.5px", 
              color: "var(--text-secondary, #94A3B8)", 
              marginTop: "6px", 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "4px",
              opacity: 0.8
            }}>
              📅 Published: {new Date(q.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isGlobalEdit && pendingCorrect && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "5px 14px", borderRadius: "6px", border: "none", cursor: saving ? "wait" : "pointer",
                background: "#22c55e", color: "#fff", fontSize: "12px", fontWeight: "700",
                opacity: saving ? 0.5 : 1, transition: "all 0.2s",
              }}
            >
              {saving ? "Saving..." : "✓ Save"}
            </button>
          )}
          <div className="qb-qbadge">MCQ</div>
        </div>
      </div>
      <div className="qb-options-grid">
        {options.map((opt, oIdx) => {
          const letter = optionLabel(oIdx);
          const optText = opt.text || opt;
          const isCorrect = 
            String(displayCorrect).trim().toUpperCase() === letter || 
            String(displayCorrect).trim() === String(optText).trim() ||
            String(displayCorrect).trim().toLowerCase() === `option ${oIdx + 1}`;
          const isPending = pendingCorrect && String(pendingCorrect).trim() === String(optText).trim();
            
          return (
            <div
              key={oIdx}
              className={`qb-opt ${isCorrect ? "correct" : ""} ${isPending ? "qb-opt-pending" : ""}`}
              onClick={isGlobalEdit ? () => setPendingCorrect(String(optText)) : undefined}
              style={isGlobalEdit ? { cursor: "pointer", transition: "all 0.15s" } : {}}
            >
              <div className="qb-opt-letter">{letter}</div>
              <span className="qb-opt-text">{optText}</span>
              {isGlobalEdit && isCorrect && <span style={{ marginLeft: "auto", fontSize: "14px" }}>✓</span>}
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
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const questionsPerPage = 15; // More per page since we now show options
  const [currentPage, setCurrentPage] = useState(1);
  const [openingBookId, setOpeningBookId] = useState(null);
  const [quizType, setQuizType] = useState("exams");
  const [isRecycleBin, setIsRecycleBin] = useState(false);
  const [deletedSections, setDeletedSections] = useState([]);
  const [deletedQuestions, setDeletedQuestions] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const [collectionSearchTerm, setCollectionSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleCardClick = (book) => {
    setOpeningBookId(book.id);
    setTimeout(() => {
      handleSelectBook(book);
      setOpeningBookId(null);
    }, 750);
  };

  useEffect(() => {
    if (isRecycleBin) {
      fetchDeleted();
      return;
    }
    const fetchQuestionsAndGroup = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const endpoint = quizType === "exams" 
          ? `${import.meta.env.VITE_API_URL}/api/quizzes` 
          : `${import.meta.env.VITE_API_URL}/api/practice`;
          
        const res = await axios.get(endpoint, { headers });
        const grouped = {};

        for (const quiz of res.data) {
          const bookKey = quizType === "practice" 
            ? quiz.title 
            : ((quiz.examName && quiz.examName.trim()) ? quiz.examName.trim() : "General Quizzes");
            
          if (!grouped[bookKey]) {
            grouped[bookKey] = {
              id: bookKey, title: bookKey,
              description: quizType === "practice" ? (quiz.subject || "Practice Quiz") : (bookKey === "General Quizzes" ? "Standalone Quiz Modules" : `${bookKey} Collection`),
              totalQuestions: 0, publishedDate: quiz.publishedAt || quiz.createdAt,
              status: quiz.status || "Draft", subjects: {},
            };
          }
          const subjectKey = quiz.subject || "General";
          if (!grouped[bookKey].subjects[subjectKey]) {
            grouped[bookKey].subjects[subjectKey] = {
              quizId: quiz._id, subjectName: subjectKey,
              questionsCount: 0, questions: [],
              publishedDate: quiz.publishedAt || quiz.createdAt, status: quiz.status || "Draft",
            };
          }

          let quizQuestionsCount = 0;
          if (quiz.sections && quiz.sections.length > 0) {
            for (const sectionRef of quiz.sections) {
              const sectionDoc = sectionRef.sectionId;
              if (sectionDoc && sectionDoc.questions) {
                quizQuestionsCount += sectionDoc.questions.length;
              }
            }
          } else if (quiz.questions) {
            quizQuestionsCount += quiz.questions.length;
          }

          grouped[bookKey].subjects[subjectKey].questionsCount += quizQuestionsCount;
          grouped[bookKey].totalQuestions += quizQuestionsCount;
          if (new Date(quiz.updatedAt || quiz.createdAt) > new Date(grouped[bookKey].publishedDate)) {
            grouped[bookKey].publishedDate = quiz.updatedAt || quiz.createdAt;
            grouped[bookKey].status = quiz.status || "Draft";
          }
        }

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
    if (!isRecycleBin) {
      fetchQuestionsAndGroup();
    }
  }, [quizType, isRecycleBin]);

  const fetchDeleted = async () => {
    try {
      setLoadingDeleted(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [secRes, qRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/sections?deleted=true`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/questions?deleted=true`, { headers })
      ]);
      
      setDeletedSections(secRes.data);
      setDeletedQuestions(qRes.data);
    } catch (err) {
      console.error("Fetch Deleted Error:", err);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleRestoreSection = async (id) => {
    if (!window.confirm("Restore this section?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/sections/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeleted();
    } catch (error) {
      alert("Failed to restore section.");
    }
  };

  const handlePermDeleteSection = async (id) => {
    if (!window.confirm("PERMANENTLY delete this section? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/sections/${id}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeleted();
    } catch (error) {
      alert("Failed to permanently delete section.");
    }
  };

  const handleRestoreQuestion = async (id) => {
    if (!window.confirm("Restore this question?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/questions/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeleted();
    } catch (error) {
      alert("Failed to restore question.");
    }
  };

  const handlePermDeleteQuestion = async (id) => {
    if (!window.confirm("PERMANENTLY delete this question? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/questions/${id}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeleted();
    } catch (error) {
      alert("Failed to permanently delete question.");
    }
  };

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setSelectedSubject(null);
    setCurrentPage(1);
    setSearchQuery("");
    setViewMode("subjects");
  };

  const handleSelectSubject = async (subject) => {
    if (subject.questions && subject.questions.length > 0) {
      setSelectedSubject(subject);
      setCurrentPage(1);
      setSearchQuery("");
      setViewMode("questions");
      return;
    }

    setLoadingQuestions(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = quizType === "exams" 
        ? `${import.meta.env.VITE_API_URL}/api/quizzes/${subject.quizId}` 
        : `${import.meta.env.VITE_API_URL}/api/practice/${subject.quizId}`;
        
      const res = await axios.get(endpoint, { headers });
      const quiz = res.data;
      
      let quizQuestions = [];
      if (quiz.sections && quiz.sections.length > 0) {
        for (const sectionRef of quiz.sections) {
          const sectionDoc = sectionRef.sectionId || sectionRef;
          if (sectionDoc && sectionDoc.questions && sectionDoc.questions.length > 0) {
            quizQuestions = [...quizQuestions, ...sectionDoc.questions.map((q, idx) => ({
              questionId: q._id, qNo: quizQuestions.length + idx + 1,
              questionEnglish: q.questionEnglish, questionHindi: q.questionHindi,
              options: q.options || [], correctAnswer: q.correctAnswer,
            }))];
          }
        }
      } else {
        quizQuestions = (quiz.questions || []).map((q, idx) => ({
          questionId: q._id, qNo: idx + 1,
          questionEnglish: q.questionEnglish, questionHindi: q.questionHindi,
          options: q.options || [], correctAnswer: q.correctAnswer,
        }));
      }

      const updatedSubject = { ...subject, questions: quizQuestions };
      
      setBooks(prevBooks => prevBooks.map(b => {
        if (b.id === selectedBook.id) {
          return {
            ...b,
            subjects: b.subjects.map(s => s.subjectName === subject.subjectName ? updatedSubject : s)
          };
        }
        return b;
      }));

      setSelectedBook(prevBook => ({
        ...prevBook,
        subjects: prevBook.subjects.map(s => s.subjectName === subject.subjectName ? updatedSubject : s)
      }));

      setSelectedSubject(updatedSubject);
      setCurrentPage(1);
      setSearchQuery("");
      setViewMode("questions");
    } catch (err) {
      console.error("Fetch questions for quiz error:", err);
      alert("Failed to load questions. Please try again.");
    } finally {
      setLoadingQuestions(false);
    }
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

  const handleUpdateAnswer = async (questionId, newCorrectAnswer) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/questions/${questionId}`,
        { correctAnswer: newCorrectAnswer },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local state so the UI reflects the change immediately
      if (selectedSubject) {
        const updatedQuestions = selectedSubject.questions.map(q =>
          q.questionId === questionId ? { ...q, correctAnswer: newCorrectAnswer } : q
        );
        setSelectedSubject({ ...selectedSubject, questions: updatedQuestions });
      }
    } catch (err) {
      console.error("Update answer error:", err);
      alert("Failed to update answer. Please try again.");
    }
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

  const filteredBooks = books.filter(book => 
    book.title?.toLowerCase().includes(collectionSearchTerm.toLowerCase()) ||
    (book.description || "").toLowerCase().includes(collectionSearchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Questions Bank" />
        <div className="admin-content" style={{ padding: "24px", minHeight: 0 }}>
          {viewMode === "quizzes" && !selectedBook && (
            /* ── NEW PREMIUM TOP AREA FOR MOBILE/DESKTOP ── */
            <div className="qb-new-toggles-container" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px", width: "100%" }}>
              
              {/* Select a Quiz & Info (Rendered at the top) */}
              <div style={{ textAlign: "left", padding: "4px 0" }}>
                <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 4px 0" }}>Select a Quiz</h2>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>Manage your exam question collections</p>
              </div>

              {/* Flex Row Container for Switchers */}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", width: "100%" }}>
                
                {isMobile ? (
                  <>
                    {/* MOBILE: 3D Flip Tab Switcher 1 (Exams / Practice) */}
                    <div 
                      className="qb-flip-container" 
                      onClick={() => setQuizType(quizType === "exams" ? "practice" : "exams")}
                      style={{ flex: "1" }}
                    >
                      <div className={`qb-flip-card ${quizType === "practice" ? "flipped" : ""}`}>
                        <div className="qb-flip-front" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <FileText size={14} />
                            <span style={{ fontSize: "12px" }}>Exams</span>
                          </div>
                        </div>
                        <div className="qb-flip-back" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <GraduationCap size={14} />
                            <span style={{ fontSize: "12px" }}>Practice</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MOBILE: 3D Flip Tab Switcher 2 (Active / Recycle Bin) */}
                    <div 
                      className="qb-flip-container" 
                      onClick={() => setIsRecycleBin(!isRecycleBin)}
                      style={{ flex: "1" }}
                    >
                      <div className={`qb-flip-card ${isRecycleBin ? "flipped" : ""}`}>
                        <div className="qb-flip-front" style={{ padding: "6px 10px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckSquare size={14} />
                            <span style={{ fontSize: "12px" }}>Active</span>
                          </div>
                          <span style={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.2)", padding: "1px 5px", borderRadius: "20px" }}>
                            {books.length}
                          </span>
                        </div>
                        <div className="qb-flip-back" style={{ backgroundColor: "var(--red, #EF4444)", color: "white", padding: "6px 10px", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Trash2 size={14} />
                            <span style={{ fontSize: "12px" }}>Recycled</span>
                          </div>
                          <span style={{ fontSize: "10px", backgroundColor: "rgba(255,255,255,0.2)", padding: "1px 5px", borderRadius: "20px" }}>
                            {deletedSections.length + deletedQuestions.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* DESKTOP: Exams / Practice Tab Switcher */}
                    <div style={{ flex: "1 1 280px", display: "flex", gap: "12px" }}>
                      <button
                        onClick={() => { setQuizType("exams"); setCollectionSearchTerm(""); }}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1.5px solid var(--border-color)",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          fontWeight: "600",
                          transition: "all 0.2s",
                          backgroundColor: quizType === "exams" ? "var(--violet, #6E3FF3)" : "var(--bg-card, #1E1B2E)",
                          color: quizType === "exams" ? "white" : "var(--text-primary)",
                          boxShadow: quizType === "exams" ? "0 4px 12px rgba(110, 63, 243, 0.2)" : "none"
                        }}
                      >
                        <FileText size={14} />
                        <span>Exams</span>
                      </button>
                      <button
                        onClick={() => { setQuizType("practice"); setCollectionSearchTerm(""); }}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1.5px solid var(--border-color)",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          fontWeight: "600",
                          transition: "all 0.2s",
                          backgroundColor: quizType === "practice" ? "var(--violet, #6E3FF3)" : "var(--bg-card, #1E1B2E)",
                          color: quizType === "practice" ? "white" : "var(--text-primary)",
                          boxShadow: quizType === "practice" ? "0 4px 12px rgba(110, 63, 243, 0.2)" : "none"
                        }}
                      >
                        <GraduationCap size={14} />
                        <span>Practice</span>
                      </button>
                    </div>

                    {/* DESKTOP: Active / Recycle Bin Toggles with Badges */}
                    <div style={{ flex: "1 1 280px", display: "flex", gap: "12px" }}>
                      <button
                        onClick={() => setIsRecycleBin(false)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1.5px solid var(--border-color)",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          fontWeight: "600",
                          backgroundColor: !isRecycleBin ? "var(--violet, #6E3FF3)" : "var(--bg-card, #1E1B2E)",
                          color: !isRecycleBin ? "white" : "var(--text-primary)",
                          boxShadow: !isRecycleBin ? "0 4px 12px rgba(110, 63, 243, 0.2)" : "none"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <CheckSquare size={14} />
                          <span>Active</span>
                        </div>
                        <span style={{ 
                          fontSize: "10.5px", 
                          backgroundColor: !isRecycleBin ? "rgba(255,255,255,0.2)" : "var(--border-color)", 
                          color: !isRecycleBin ? "white" : "var(--text-primary)", 
                          padding: "2px 6px", 
                          borderRadius: "20px" 
                        }}>
                          {books.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setIsRecycleBin(true)}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1.5px solid var(--border-color)",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          fontWeight: "600",
                          backgroundColor: isRecycleBin ? "var(--red, #EF4444)" : "var(--bg-card, #1E1B2E)",
                          color: isRecycleBin ? "white" : "var(--text-primary)",
                          boxShadow: isRecycleBin ? "0 4px 12px rgba(239, 68, 68, 0.2)" : "none"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Trash2 size={14} />
                          <span>Recycle Bin</span>
                        </div>
                        <span style={{ 
                          fontSize: "10.5px", 
                          backgroundColor: isRecycleBin ? "rgba(255,255,255,0.2)" : "var(--border-color)", 
                          color: isRecycleBin ? "white" : "var(--text-primary)", 
                          padding: "2px 6px", 
                          borderRadius: "20px" 
                        }}>
                          {deletedSections.length + deletedQuestions.length}
                        </span>
                      </button>
                    </div>
                  </>
                )}

              </div>

              {/* Search Input collections */}
              <div className="practice-search-pill" style={{ 
                display: "flex", alignItems: "center", gap: "8px", 
                backgroundColor: "var(--bg-card, #1E1B2E)", border: "2px solid var(--violet, #6E3FF3)", 
                borderRadius: "100px", padding: "10px 16px",
                width: "100%", maxWidth: "320px", boxSizing: "border-box"
              }}>
                  <Search size={16} style={{ color: "var(--violet, #6E3FF3)", flexShrink: 0 }} />
                  <input 
                    type="text" 
                    placeholder="Search collections..." 
                    value={collectionSearchTerm}
                    onChange={(e) => setCollectionSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            )}

          {(loading || loadingDeleted) ? (
            <div style={{ textAlign: "center", padding: "80px", color: "var(--text-secondary)", fontSize: "16px" }}>
              ⏳ Loading...
            </div>
          ) : isRecycleBin ? (
            <div className="recycle-bin-view" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              <div>
                <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>Deleted Sections ({deletedSections.length})</h3>
                {deletedSections.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No deleted sections.</p>
                ) : (
                  <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {deletedSections.map(sec => (
                      <div key={sec._id} style={{ background: "var(--bg-card)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <h4 style={{ margin: "0 0 8px 0" }}>{sec.name}</h4>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 16px 0" }}>Deleted: {new Date(sec.deletedAt).toLocaleString()}</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleRestoreSection(sec._id)} style={{ padding: "6px 12px", background: "var(--bg-page)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>Restore</button>
                          <button onClick={() => handlePermDeleteSection(sec._id)} style={{ padding: "6px 12px", background: "rgba(226, 67, 107, 0.1)", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "var(--red)" }}>Delete Permanently</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>Deleted Questions ({deletedQuestions.length})</h3>
                {deletedQuestions.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No deleted questions.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {deletedQuestions.map(q => (
                      <div key={q._id} style={{ background: "var(--bg-card)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                        <p style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "500", margin: "0 0 8px 0" }}>{q.questionEnglish}</p>
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 16px 0" }}>Subject: {q.subject || "N/A"} • Deleted: {new Date(q.deletedAt).toLocaleString()}</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleRestoreQuestion(q._id)} style={{ padding: "6px 12px", background: "var(--bg-page)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>Restore</button>
                          <button onClick={() => handlePermDeleteQuestion(q._id)} style={{ padding: "6px 12px", background: "rgba(226, 67, 107, 0.1)", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "var(--red)" }}>Delete Permanently</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  <div className="practice-grid">
                    {filteredBooks.map((book, index) => {
                      const dateText = book.status === "Published" 
                        ? `Published on ${new Date(book.publishedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` 
                        : "Draft (Not Published)";
                      
                      const dotColor = book.status === "Published" ? "#16A34A" : "#6B7280";
                      const folderColor = index % 2 === 0 ? "#6E3FF3" : "#22C55E";

                      return (
                        <div
                          key={book.id}
                          onClick={() => handleCardClick(book)}
                          style={{
                            cursor: "pointer",
                            backgroundColor: "var(--bg-card, #1E1B2E)",
                            border: "1.5px solid var(--border-color, #34314F)",
                            borderRadius: "16px",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            transition: "all 0.2s ease",
                            position: "relative"
                          }}
                          className="qb-collection-card"
                        >
                          {/* Card Header Tag Row */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "6px", 
                              backgroundColor: book.status === "Published" ? "rgba(22, 163, 74, 0.12)" : "rgba(107, 114, 128, 0.12)", 
                              color: book.status === "Published" ? "#22C55E" : "#9CA3AF", 
                              padding: "4px 10px", 
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: "700"
                            }}>
                              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: dotColor }}></span>
                              {book.status === "Published" ? "Published" : "Draft"}
                            </div>
                            <div style={{ 
                              fontSize: "9.5px", 
                              fontWeight: "700", 
                              textTransform: "uppercase", 
                              color: "var(--violet, #6E3FF3)", 
                              backgroundColor: "rgba(110, 63, 243, 0.1)", 
                              padding: "4px 8px", 
                              borderRadius: "6px",
                              letterSpacing: "0.05em"
                            }}>
                              Collection
                            </div>
                          </div>

                          {/* Card Center: Folder + Title Info Layout */}
                          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                            {/* Left Side: Folder Icon Container */}
                            <div style={{ 
                              width: "68px", 
                              height: "68px", 
                              borderRadius: "12px", 
                              backgroundColor: "rgba(255, 255, 255, 0.02)", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              border: "1px solid var(--border-color)",
                              flexShrink: 0
                            }}>
                              <Folder 
                                color={folderColor} 
                                size={0.75} 
                                open={openingBookId === book.id}
                                items={[
                                  <div key={1} style={{ padding: '1px', fontSize: '8px', color: '#1e293b', fontWeight: '800' }}>📄 Quiz</div>,
                                  <div key={2} style={{ padding: '1px', fontSize: '8px', color: '#1e293b', fontWeight: '800' }}>📝 Qs</div>
                                ]}
                              />
                            </div>

                            {/* Right Side: Title & Description */}
                            <div style={{ flex: 1, textAlign: "left", display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</h3>
                              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                {book.description || `${book.title} Collection`}
                              </p>
                            </div>
                          </div>

                          {/* Card Footer: Metadata divider row */}
                          <div style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "8px", 
                            fontSize: "12px", 
                            color: "var(--text-secondary)", 
                            borderTop: "1px dashed var(--border-color)", 
                            paddingTop: "10px",
                            marginTop: "4px"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <HelpCircle size={13} style={{ opacity: 0.7 }} />
                              <span>{book.totalQuestions} Questions</span>
                            </div>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
                              <Calendar size={13} style={{ opacity: 0.7 }} />
                              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{dateText}</span>
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
                  {loadingQuestions ? (
                    <div style={{ textAlign: "center", padding: "80px", color: "var(--text-secondary)", fontSize: "16px" }}>
                      ⏳ Loading subject questions...
                    </div>
                  ) : (
                    <>
                      <div className="qb-view-header-with-back">
                        <button className="qb-back-btn" onClick={handleBackToQuizzes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ArrowLeft size={18} />
                        </button>
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
                              <div className="qb-sub-icon" style={{ backgroundColor: meta.color, color: meta.textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', width: '48px', height: '48px' }}>
                                <BookOpen size={20} />
                              </div>
                              <div className="qb-sub-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                                <h5 style={{ margin: 0 }}>{sub.subjectName}</h5>
                                <p style={{ margin: 0, fontSize: "12.5px" }}>{sub.questionsCount} Questions</p>
                                {sub.publishedDate && (
                                  <span style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.8, marginTop: "2px" }}>
                                    Published on {new Date(sub.publishedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── VIEW 3: QUESTIONS ── */}
              {viewMode === "questions" && selectedSubject && (
                <div className="qb-questions-view">
                  <div className="qb-right-header">
                    <div className="qb-right-top">
                      <div className="qb-right-title">
                        <button className="qb-back-btn" onClick={handleBackToSubjects} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ArrowLeft size={18} />
                        </button>
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
                          <SlidersHorizontal size={16} />
                        </button>
                        <button
                          className={`qb-btn-edit-answers ${globalEditMode ? "active" : ""}`}
                          onClick={() => setGlobalEditMode(!globalEditMode)}
                          title={globalEditMode ? "Exit edit mode" : "Edit answers"}
                        >
                          <Pencil size={14} />
                          {globalEditMode ? "Done" : "Edit Answers"}
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
                      <div className="qb-search-pill" style={{ 
                        display: "flex", alignItems: "center", gap: "10px",
                        backgroundColor: "var(--bg-card)", border: "2px solid var(--violet)",
                        borderRadius: "100px", padding: "8px 16px",
                        boxShadow: "0 4px 12px rgba(110, 63, 243, 0.1)",
                        maxWidth: "280px", width: "100%",
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
                          onUpdateAnswer={handleUpdateAnswer}
                          isGlobalEdit={globalEditMode}
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