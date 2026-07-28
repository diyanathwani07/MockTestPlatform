import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminNavbar from "./components/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar";
import DocxParser from "./components/DocxParser";
import { Plus, Eye, Edit2, Trash2, Bot, Loader, X, Calendar, ArrowRightLeft, Search } from "lucide-react";

function PracticeQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingAiFor, setGeneratingAiFor] = useState(null); // id of quiz being generated
  const [viewMode, setViewMode] = useState("active"); // "active" or "recycle"
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [scheduleModal, setScheduleModal] = useState(null); // quiz object
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduledHour, setScheduledHour] = useState("12");
  const [scheduledMinute, setScheduledMinute] = useState("00");
  const [scheduledPeriod, setScheduledPeriod] = useState("AM");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null); // null means creating
  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
    questions: [],
    shuffleQuestions: false,
    shuffleOptions: false,
    randomSelection: false,
    questionsPerAttempt: 20
  });

  const emptyQuestion = {
    questionEnglish: "",
    questionHindi: "",
    options: ["", "", "", ""],
    correctAnswer: ""
  };

  const handleQuestionsLoaded = (parsedSections) => {
    let flatQuestions = [];
    if (parsedSections && parsedSections.length > 0) {
      parsedSections.forEach(sec => {
        if (sec.questions) {
          flatQuestions = flatQuestions.concat(sec.questions);
        }
      });
    }

    const mapped = flatQuestions.map((q) => {
      const optionsMapped = q.options.map(opt => {
        if (typeof opt === "object") {
          if (opt.english && opt.hindi) return `${opt.english} / ${opt.hindi}`;
          return opt.english || opt.hindi || "";
        }
        return String(opt).trim();
      });

      let correctText = "";
      if (q.correctAnswer === "A") correctText = optionsMapped[0] || "";
      else if (q.correctAnswer === "B") correctText = optionsMapped[1] || "";
      else if (q.correctAnswer === "C") correctText = optionsMapped[2] || "";
      else if (q.correctAnswer === "D") correctText = optionsMapped[3] || "";
      else {
        correctText = q.correctAnswer;
      }

      return {
        questionEnglish: q.questionEnglish || "",
        questionHindi: q.questionHindi || "",
        options: optionsMapped.length === 4 ? optionsMapped : ["", "", "", ""],
        correctAnswer: correctText,
      };
    });

    setForm(prev => {
      // Check if the only existing question is the default empty one
      const isFirstEmpty = prev.questions.length === 1 && 
                           !prev.questions[0].questionEnglish.trim() && 
                           !prev.questions[0].questionHindi.trim();
      
      const existingQs = isFirstEmpty ? [] : prev.questions;

      return {
        ...prev,
        questions: [...existingQs, ...mapped]
      };
    });
  };

  const updateScheduledTime = (hr, min, period) => {
    let hr24 = parseInt(hr, 10);
    if (period === "PM" && hr24 < 12) hr24 += 12;
    if (period === "AM" && hr24 === 12) hr24 = 0;
    const hr24Str = String(hr24).padStart(2, "0");
    setScheduleTime(`${hr24Str}:${min}`);
  };

  const openCreateModal = () => {
    setEditingQuizId(null);
    setForm({
      title: "",
      subject: "",
      description: "",
      questions: [{ ...emptyQuestion, options: ["", "", "", ""] }],
      shuffleQuestions: false,
      shuffleOptions: false,
      randomSelection: false,
      questionsPerAttempt: 20
    });
    setIsModalOpen(true);
  };

  const openEditModal = (quiz) => {
    setEditingQuizId(quiz._id);
    setForm({
      title: quiz.title || "",
      subject: quiz.subject || "",
      description: quiz.description || "",
      questions: quiz.questions ? quiz.questions.map(q => ({
        questionEnglish: q.questionEnglish || "",
        questionHindi: q.questionHindi || "",
        options: q.options ? [...q.options] : ["", "", "", ""],
        correctAnswer: q.correctAnswer || ""
      })) : [],
      shuffleQuestions: quiz.shuffleQuestions || false,
      shuffleOptions: quiz.shuffleOptions || false,
      randomSelection: quiz.randomSelection || false,
      questionsPerAttempt: quiz.questionsPerAttempt || 20
    });
    setIsModalOpen(true);
  };

  const addQuestion = () => {
    setForm(prev => ({
      ...prev,
      questions: [...prev.questions, { ...emptyQuestion, options: ["", "", "", ""] }]
    }));
  };

  const removeQuestion = (index) => {
    setForm(prev => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index)
    }));
  };

  const handleQuestionChange = (qIndex, field, value) => {
    setForm(prev => {
      const updatedQuestions = [...prev.questions];
      updatedQuestions[qIndex] = {
        ...updatedQuestions[qIndex],
        [field]: value
      };
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setForm(prev => {
      const updatedQuestions = [...prev.questions];
      const updatedOptions = [...updatedQuestions[qIndex].options];
      updatedOptions[optIndex] = value;
      updatedQuestions[qIndex] = {
        ...updatedQuestions[qIndex],
        options: updatedOptions
      };
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleSubmit = async (e, statusOverride = "Published") => {
    if (e) e.preventDefault();
    
    if (!form.title.trim()) return alert("Please enter a title");
    if (!form.subject.trim()) return alert("Please enter a subject");
    if (form.questions.length === 0) return alert("Please add at least one question");
    
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.questionEnglish.trim()) return alert(`Question ${i + 1} requires English text`);
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) return alert(`Question ${i + 1} Option ${String.fromCharCode(65 + j)} is empty`);
      }
      if (!q.correctAnswer.trim()) return alert(`Question ${i + 1} requires a selected correct answer`);
      if (!q.options.includes(q.correctAnswer)) return alert(`Question ${i + 1} correct answer must match one of the options`);
    }

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        ...form,
        status: statusOverride
      };
      
      if (editingQuizId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/practice/${editingQuizId}`, payload, { headers });
        alert("Practice quiz updated successfully");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/practice`, payload, { headers });
        alert("Practice quiz created successfully");
      }
      
      setIsModalOpen(false);
      fetchQuizzes();
    } catch (error) {
      console.error("Save Quiz Error:", error);
      alert(error.response?.data?.message || "Failed to save practice quiz");
    }
  };

  const fetchQuizzes = async (mode = viewMode) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = mode === "recycle"
        ? `${import.meta.env.VITE_API_URL}/api/practice?deleted=true`
        : `${import.meta.env.VITE_API_URL}/api/practice`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(response.data);
    } catch (error) {
      console.error("Fetch Practice Quizzes Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes(viewMode);
  }, [viewMode]);

  const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
  const filteredQuizzes = quizzes.filter(q => {
    const titleText = (q.title || "").toLowerCase();
    const subjectText = (q.subject || "").toLowerCase();
    return searchTerms.every(term => titleText.includes(term) || subjectText.includes(term));
  });

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to move "${title}" to the recycle bin?`)) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/practice/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(quizzes.filter((q) => q._id !== id));
      } catch (error) {
        console.error("Delete Error:", error);
        alert("Failed to move practice quiz to recycle bin");
      }
    }
  };

  const handleRestore = async (id, title) => {
    if (window.confirm(`Restore "${title}"?`)) {
      try {
        const token = localStorage.getItem("token");
        await axios.put(`${import.meta.env.VITE_API_URL}/api/practice/${id}/restore`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(quizzes.filter((q) => q._id !== id));
      } catch (error) {
        console.error("Restore Error:", error);
        alert("Failed to restore practice quiz.");
      }
    }
  };

  const handlePermanentDelete = async (id, title) => {
    if (window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete "${title}"? This cannot be undone.`)) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/practice/${id}/permanent`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(quizzes.filter((q) => q._id !== id));
      } catch (error) {
        console.error("Permanent Delete Error:", error);
        alert("Failed to permanently delete practice quiz.");
      }
    }
  };

  const handleGenerateAI = async (id) => {
    setGeneratingAiFor(id);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/practice/${id}/generate-ai`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      fetchQuizzes(); // Refetch to get updated status
    } catch (error) {
      console.error("AI Gen Error:", error);
      alert(error.response?.data?.message || "Failed to generate AI explanations");
    } finally {
      setGeneratingAiFor(null);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleDate || !scheduleTime) return alert("Please select both date and time.");
    setSavingSchedule(true);
    try {
      const token = localStorage.getItem("token");
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await axios.put(`${import.meta.env.VITE_API_URL}/api/practice/${scheduleModal._id}`, 
        { scheduledAt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`✅ "${scheduleModal.title}" scheduled for ${new Date(scheduledAt).toLocaleString()}`);
      setScheduleModal(null);
      fetchQuizzes();
    } catch (error) {
      console.error("Schedule Error:", error);
      alert(error.response?.data?.message || "Failed to save schedule.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const calculateAiProgress = (quiz) => {
    if (!quiz.questions || quiz.questions.length === 0) return 0;
    const generatedCount = quiz.questions.filter(q => q.aiGenerated).length;
    return Math.round((generatedCount / quiz.questions.length) * 100);
  };

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-page)" }}>
        <AdminNavbar title={<><span className="sm:hidden">Practice</span><span className="hidden sm:inline">Practice Quizzes</span></>} />
        
        <div className="admin-content" style={{ flex: 1, textAlign: "left" }}>
          
          <div className="manage-command-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'nowrap', width: '100%', overflowX: 'auto', paddingBottom: '4px' }}>
            <div style={{ 
              flex: "0 1 320px",
              minWidth: '120px',
              display: "flex", alignItems: "center", gap: "6px", 
              backgroundColor: "var(--bg-card)", border: "2px solid var(--violet)", 
              borderRadius: "100px", padding: "6px 12px",
              boxShadow: "0 4px 12px rgba(110, 63, 243, 0.1)", position: "relative"
            }}>
              <Search size={14} style={{ color: "var(--violet)", flexShrink: 0 }} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "12px", color: "var(--text-primary)", fontWeight: "500", paddingRight: "18px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-page)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)", flexShrink: 0, alignItems: "center" }}>
                <button
                  onClick={() => setViewMode("active")}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    backgroundColor: viewMode === "active" ? "var(--violet)" : "transparent",
                    color: viewMode === "active" ? "white" : "var(--text-secondary)",
                  }}
                >
                  Active
                </button>
                <button
                  onClick={() => setViewMode("recycle")}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    backgroundColor: viewMode === "recycle" ? "var(--red)" : "transparent",
                    color: viewMode === "recycle" ? "white" : "var(--text-secondary)",
                  }}
                >
                  Recycle
                </button>
              </div>
          </div>

          <div className="quiz-table-wrapper" style={{ 
            backgroundColor: "var(--bg-card)", 
            borderRadius: "16px", 
            border: "1px solid var(--border-color)",
            boxShadow: "var(--card-shadow)",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch"
          }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                Loading practice quizzes...
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                No practice quizzes found. Create one to get started!
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                <thead>
                  <tr style={{ 
                    borderBottom: "1px solid var(--border-color)", 
                    backgroundColor: "var(--bg-input)",
                    whiteSpace: "nowrap"
                  }}>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500", maxWidth: "180px" }}>Title</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>Pricing</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>Subject</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>Questions</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>Date Created</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>Status</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>AI Status</th>
                    <th style={{ padding: "16px", textAlign: "right", color: "var(--text-muted)", fontWeight: "500" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuizzes.map((quiz) => {
                    const aiProgress = calculateAiProgress(quiz);
                    return (
                      <tr key={quiz._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "16px", color: "var(--text-primary)", maxWidth: "180px" }}>
                          <div style={{ fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={quiz.title}>{quiz.title}</div>
                        </td>
                        <td style={{ padding: "16px", whiteSpace: "nowrap" }}>
                          {quiz.isPaid ? (
                            <span style={{ 
                              backgroundColor: "rgba(239, 68, 68, 0.12)", 
                              color: "#EF4444", 
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                              padding: "4px 8px", 
                              borderRadius: "6px", 
                              fontSize: "12px", 
                              fontWeight: "700" 
                            }}>
                              Paid
                            </span>
                          ) : (
                            <span style={{ 
                              backgroundColor: "rgba(16, 185, 129, 0.12)", 
                              color: "#10B981", 
                              border: "1px solid rgba(16, 185, 129, 0.2)",
                              padding: "4px 8px", 
                              borderRadius: "6px", 
                              fontSize: "12px", 
                              fontWeight: "700" 
                            }}>
                              Free
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "16px", color: "var(--text-main)" }}>
                          <span style={{ 
                            padding: "4px 10px", 
                            backgroundColor: "var(--bg-input)", 
                            border: "1px solid var(--border-color)",
                            borderRadius: "20px",
                            fontSize: "13px"
                          }}>
                            {quiz.subject}
                          </span>
                        </td>
                        <td style={{ padding: "16px", fontWeight: "700", color: "var(--violet)", whiteSpace: "nowrap" }}>
                          {quiz.questions?.length || 0}
                        </td>
                        <td style={{ padding: "16px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }}>
                          {new Date(quiz.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                        </td>
                        <td style={{ padding: "16px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{
                              backgroundColor: quiz.status === "Published" ? "#E4F8F0" : "#F1F5F9",
                              color: quiz.status === "Published" ? "#10B981" : "#64748B",
                              padding: "4px 10px", 
                              borderRadius: "20px", 
                              fontSize: "12px", 
                              fontWeight: "600",
                              display: "inline-block", 
                              textAlign: "center"
                            }}>
                              {quiz.status || "Draft"}
                            </span>
                            {quiz.status === "Published" && quiz.publishedAt && (
                              <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", textAlign: "center" }}>
                                {new Date(quiz.publishedAt).toLocaleDateString('en-GB').replace(/\//g, '-')}, {new Date(quiz.publishedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ 
                              width: "100px", 
                              height: "8px", 
                              backgroundColor: "var(--border-color)", 
                              borderRadius: "4px",
                              overflow: "hidden"
                            }}>
                              <div style={{ 
                                height: "100%", 
                                width: `${aiProgress}%`, 
                                backgroundColor: aiProgress === 100 ? "#4ade80" : "var(--primary-color)",
                                borderRadius: "4px",
                                transition: "width 0.3s ease"
                              }}></div>
                            </div>
                            <span style={{ fontSize: "13px", color: aiProgress === 100 ? "#4ade80" : "var(--text-muted)" }}>
                              {aiProgress}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "18px 28px", textAlign: "right", overflow: "visible", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}>
                            <button
                              onClick={(e) => {
                                if (activeDropdown === quiz._id) {
                                  setActiveDropdown(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                  setActiveDropdown(quiz._id);
                                }
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-primary)",
                                fontSize: "18px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                padding: "4px 12px",
                                outline: "none"
                              }}
                              title="Quiz Actions"
                            >
                              ⋮
                            </button>

                            {activeDropdown === quiz._id && (
                              <>
                                {/* Global backdrop to dismiss dropdown on outer click */}
                                <div
                                  onClick={() => setActiveDropdown(null)}
                                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: "transparent" }}
                                />

                                {/* Floating context dropdown menu - fixed position to escape overflow clipping */}
                                <div style={{
                                  position: "fixed",
                                  top: `${dropdownPos.top}px`,
                                  right: `${dropdownPos.right}px`,
                                  backgroundColor: "var(--bg-card)",
                                  border: "1.5px solid var(--border-color)",
                                  borderRadius: "10px",
                                  padding: "6px 0",
                                  minWidth: "130px",
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                                  zIndex: 9999,
                                  textAlign: "left"
                                }}>
                                  {viewMode === "active" ? (
                                    <>
                                      {/* Preview */}
                                      <div
                                        onClick={() => { setActiveDropdown(null); navigate(`/dashboard/practice/test/${quiz._id}?preview=true`); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <Eye size={15} /> Preview
                                      </div>
  
                                      {/* Edit */}
                                      <div
                                        onClick={() => { 
                                          setActiveDropdown(null); 
                                          navigate(`/admin/edit-practice/${quiz._id}`);
                                        }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <Edit2 size={15} /> Edit
                                      </div>
  
                                      {/* Schedule */}
                                      <div
                                        onClick={() => { 
                                          setActiveDropdown(null); 
                                          setScheduleDate(quiz.scheduledAt ? quiz.scheduledAt.slice(0,10) : "");
                                          let hrStr = "12";
                                          let minStr = "00";
                                          let periodStr = "AM";
                                          if (quiz.scheduledAt) {
                                            const dt = new Date(quiz.scheduledAt);
                                            let hours = dt.getHours();
                                            minStr = String(dt.getMinutes()).padStart(2, "0");
                                            periodStr = hours >= 12 ? "PM" : "AM";
                                            hours = hours % 12;
                                            hours = hours ? hours : 12;
                                            hrStr = String(hours).padStart(2, "0");
                                          }
                                          setScheduledHour(hrStr);
                                          setScheduledMinute(minStr);
                                          setScheduledPeriod(periodStr);
                                          setScheduleTime(quiz.scheduledAt ? quiz.scheduledAt.slice(11,16) : "00:00");
                                          setScheduleModal(quiz);
                                        }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <Calendar size={15} /> Schedule
                                      </div>
  
                                      {/* Convert to Exam */}
                                      <div
                                        onClick={async () => {
                                          setActiveDropdown(null);
                                          if (window.confirm(`Convert "${quiz.title}" into a Real Exam? This will create a duplicate in your My Exams list.`)) {
                                            try {
                                              const token = localStorage.getItem("token");
                                              await axios.post(`${import.meta.env.VITE_API_URL}/api/practice/${quiz._id}/convert-to-exam`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                              alert("Successfully converted to Real Exam. Check 'Manage Quizzes' to publish it.");
                                            } catch (error) {
                                              console.error("Conversion error", error);
                                              alert("Failed to convert to exam.");
                                            }
                                          }
                                        }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <ArrowRightLeft size={15} /> Convert to Exam
                                      </div>
  
                                      {/* Delete */}
                                      <div
                                        onClick={() => { setActiveDropdown(null); handleDelete(quiz._id, quiz.title); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--red)", transition: "background 0.15s", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(226, 67, 107, 0.08)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <Trash2 size={15} /> Delete
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); handleRestore(quiz._id, quiz.title); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <Eye size={15} /> Restore
                                      </div>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); handlePermanentDelete(quiz._id, quiz.title); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--red)", transition: "background 0.15s", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(226, 67, 107, 0.08)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <Trash2 size={15} /> Delete Permanently
                                      </div>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
        </div>
      </div>
      
      <PracticeQuizModal 
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        editingQuizId={editingQuizId}
        form={form}
        setForm={setForm}
        handleSubmit={handleSubmit}
        addQuestion={addQuestion}
        removeQuestion={removeQuestion}
        handleQuestionChange={handleQuestionChange}
        handleOptionChange={handleOptionChange}
        handleQuestionsLoaded={handleQuestionsLoaded}
      />

      {/* ── SCHEDULE MODAL ── */}
      {scheduleModal && (
        <div 
          onClick={() => setScheduleModal(null)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", padding: "32px", width: "380px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Calendar size={20} style={{ color: "var(--violet)" }} />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>Schedule Quiz</h3>
              </div>
              <button onClick={() => setScheduleModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "20px" }}>✕</button>
            </div>

            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--text-muted)" }}>
              Setting schedule for: <strong style={{ color: "var(--text-primary)" }}>{scheduleModal.title}</strong>
            </p>

            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</label>
            <input 
              type="date" 
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "14px", outline: "none", marginBottom: "16px", boxSizing: "border-box" }}
            />

            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</label>
            <div style={{ position: "relative", marginBottom: "24px" }}>
              <button
                type="button"
                onClick={() => setShowTimePicker(!showTimePicker)}
                style={{ background: "var(--bg-input)", border: "1.5px solid var(--border-color)", borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}
              >
                <span>{`${scheduledHour}:${scheduledMinute} ${scheduledPeriod}`}</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>🕒</span>
              </button>

              {showTimePicker && (
                <div style={{ position: "absolute", top: "105%", left: 0, right: 0, zIndex: 1000, backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", height: "180px", borderBottom: "1.5px solid var(--border-color)", paddingBottom: "12px" }}>

                    {/* Hours */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }} className="time-scroll-col">
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(hr => {
                        const isSelected = hr === scheduledHour;
                        return (
                          <div key={hr} onClick={() => { setScheduledHour(hr); updateScheduledTime(hr, scheduledMinute, scheduledPeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-primary)", transition: "all 0.1s ease" }}>
                            {hr}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ width: "1px", backgroundColor: "var(--border-color)" }}></div>

                    {/* Minutes */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", padding: "0 4px" }} className="time-scroll-col">
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map(min => {
                        const isSelected = min === scheduledMinute;
                        return (
                          <div key={min} onClick={() => { setScheduledMinute(min); updateScheduledTime(scheduledHour, min, scheduledPeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-primary)", transition: "all 0.1s ease" }}>
                            {min}
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ width: "1px", backgroundColor: "var(--border-color)" }}></div>

                    {/* AM/PM */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "4px", justifyContent: "center" }}>
                      {["AM", "PM"].map(p => {
                        const isSelected = p === scheduledPeriod;
                        return (
                          <div key={p} onClick={() => { setScheduledPeriod(p); updateScheduledTime(scheduledHour, scheduledMinute, p); }} style={{ padding: "10px 6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-secondary)", transition: "all 0.1s ease" }}>
                            {p}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button type="button" onClick={() => setShowTimePicker(false)} style={{ padding: "8px 12px", border: "1.5px solid var(--border-color)", borderRadius: "10px", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "13px", fontWeight: "700", cursor: "pointer", textAlign: "center" }}>
                    Select Time
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => setScheduleModal(null)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "1.5px solid var(--border-color)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "var(--violet)", color: "#fff", cursor: savingSchedule ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "13px", opacity: savingSchedule ? 0.7 : 1 }}
              >
                {savingSchedule ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default PracticeQuizzes;

// Modal Overlay component rendered when open
function PracticeQuizModal({ isOpen, setIsOpen, editingQuizId, form, setForm, handleSubmit, addQuestion, removeQuestion, handleQuestionChange, handleOptionChange, handleQuestionsLoaded }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={() => setIsOpen(false)} style={{ zIndex: 1100 }}>
      <div 
        className="ticket-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '550px', 
          width: '90%', 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: '0'
        }}
      >
        <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px", padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
            {editingQuizId ? "Edit Practice Quiz" : "Create Practice Quiz"}
          </h3>
          <button 
            type="button" 
            onClick={() => setIsOpen(false)} 
            style={{ 
              marginLeft: "auto", 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer' 
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div 
            className="modal-body" 
            style={{ 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px', 
              overflowY: 'auto',
              flex: 1
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="input-box" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Quiz Title</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Basic JavaScript Practice"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', height: '46px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '0 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div className="input-box" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Subject</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Computer Science"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  style={{ width: '100%', height: '46px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '0 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="input-box" style={{ marginBottom: 0 }}>
              <label style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Description</label>
              <textarea 
                placeholder="Short description of this practice test..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ width: '100%', minHeight: '80px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '12px 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
            </div>



            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Questions ({form.questions.length})</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {handleQuestionsLoaded && (
                  <DocxParser onQuestionsLoaded={handleQuestionsLoaded} />
                )}
                <button 
                  type="button" 
                  onClick={addQuestion}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "rgba(108, 93, 211, 0.1)",
                    color: "var(--primary-color)",
                    border: "1px solid rgba(108, 93, 211, 0.2)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "500",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={16} /> Add Question
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {form.questions.map((q, qIndex) => (
                <div 
                  key={qIndex} 
                  style={{ 
                    padding: '20px', 
                    backgroundColor: 'var(--bg-sidebar)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>Question #{qIndex + 1}</span>
                    {form.questions.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeQuestion(qIndex)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "rgba(255, 68, 68, 0.1)",
                          color: "#ff4444",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Question (English) *</label>
                      <textarea 
                        required
                        placeholder="Enter question text in English"
                        value={q.questionEnglish}
                        onChange={e => handleQuestionChange(qIndex, 'questionEnglish', e.target.value)}
                        style={{ width: '100%', minHeight: '60px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '8px 12px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)', resize: 'vertical' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Question (Hindi) - Optional</label>
                      <textarea 
                        placeholder="Enter question text in Hindi"
                        value={q.questionHindi}
                        onChange={e => handleQuestionChange(qIndex, 'questionHindi', e.target.value)}
                        style={{ width: '100%', minHeight: '60px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '8px 12px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)', resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Options & Select Correct Answer *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {q.options.map((opt, optIndex) => {
                      const optionLabel = String.fromCharCode(65 + optIndex);
                      return (
                        <div key={optIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input 
                            type="radio" 
                            name={`correctAnswer-${qIndex}`}
                            checked={q.correctAnswer === opt && opt !== ""}
                            onChange={() => handleQuestionChange(qIndex, 'correctAnswer', opt)}
                            disabled={opt === ""}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: opt === "" ? 'not-allowed' : 'pointer' }}
                            title={opt === "" ? "Enter option text first before selecting correct" : "Set as correct answer"}
                          />
                          <span style={{ minWidth: '24px', fontWeight: '700', color: 'var(--text-secondary)' }}>{optionLabel}</span>
                          <input 
                            type="text"
                            required
                            placeholder={`Enter Option ${optionLabel}`}
                            value={opt}
                            onChange={e => {
                              handleOptionChange(qIndex, optIndex, e.target.value);
                              if (q.correctAnswer === opt) {
                                handleQuestionChange(qIndex, 'correctAnswer', e.target.value);
                              }
                            }}
                            style={{ flex: 1, height: '38px', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0 12px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div 
            className="modal-footer" 
            style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px',
              backgroundColor: 'var(--bg-input)'
            }}
          >
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="btn-save-draft"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={(e) => handleSubmit(e, "Draft")}
              className="btn-save-draft"
            >
              Save to Drafts
            </button>
            <button 
              type="button"
              onClick={(e) => handleSubmit(e, "Published")}
              className="btn-submit-publish"
            >
              {editingQuizId ? "Publish Changes" : "Publish Immediately"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
