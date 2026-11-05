import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminNavbar from "./components/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar";
import DocxParser from "./components/DocxParser";
import { Plus, Eye, Edit2, Trash2, Bot, Loader, X, Calendar, Clock, ArrowRightLeft, Search, User, Grid, Tag, EyeOff, UploadCloud } from "lucide-react";
import MuiDatePicker from "../components/MuiDatePicker";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { SkeletonTable } from "@/components/ui/skeleton";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function PracticeQuizzes() {
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [ownershipTab, setOwnershipTab] = useState("all");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const [generatingAiFor, setGeneratingAiFor] = useState(null); // id of quiz being generated
  const [viewMode, setViewMode] = useState("active"); // "active" or "recycle"
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: null, bottom: null, right: 0, openUpwards: false });

  const toggleActionDropdown = (e, quizId) => {
    if (activeDropdown === quizId) {
      setActiveDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    setDropdownPos({
      top: openUpwards ? null : Math.max(10, rect.bottom + 6),
      bottom: openUpwards ? Math.max(10, window.innerHeight - rect.top + 6) : null,
      right: Math.max(16, window.innerWidth - rect.right),
      openUpwards
    });
    setActiveDropdown(quizId);
  };

  useEffect(() => {
    if (!activeDropdown) return;
    const handleScrollOrResize = () => setActiveDropdown(null);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [activeDropdown]);
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchQuizzes = async (mode = viewMode) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const endpoint = mode === "recycle"
        ? `${import.meta.env.VITE_API_URL}/api/practice?deleted=true`
        : `${import.meta.env.VITE_API_URL}/api/practice`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuizzes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Fetch Practice Quizzes Error:", error);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes(viewMode);
  }, [viewMode]);

  const checkIsMine = (quiz) => {
    const creatorId = quiz.createdBy?._id || quiz.createdBy?.id || quiz.createdBy;
    const currentUserId = currentUser?._id || currentUser?.id;
    if (!creatorId || !currentUserId) return false;
    return String(creatorId) === String(currentUserId);
  };

  const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
  const quizList = Array.isArray(quizzes) ? quizzes : [];
  const filteredQuizzes = quizList.filter(q => {
    const isMine = checkIsMine(q);
    if (ownershipTab === "mine" && !isMine) return false;

    const titleText = (q.title || "").toLowerCase();
    const subjectText = (q.subject || "").toLowerCase();
    const matchesSearch = searchTerms.every(term => titleText.includes(term) || subjectText.includes(term));

    let matchesDate = true;
    if (filterDate && q.createdAt) {
      const qDate = new Date(q.createdAt).toISOString().split('T')[0];
      matchesDate = qDate === filterDate;
    }

    let matchesType = true;
    if (filterType === "free") matchesType = !q.isPaid;
    if (filterType === "paid") matchesType = Boolean(q.isPaid);
    if (filterType === "published") matchesType = q.status === "Published";
    if (filterType === "draft") matchesType = q.status === "Draft" || !q.status;

    return matchesSearch && matchesDate && matchesType;
  });

  const handleDelete = async (id, title) => {
    const isConfirmed = await confirm({
      title: "Move to Recycle Bin?",
      message: `Are you sure you want to move "${title}" to the recycle bin?`,
      type: "warning",
      confirmText: "Move",
    });
    if (isConfirmed) {
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
    const isConfirmed = await confirm({
      title: "Restore Practice Assessment?",
      message: `Restore "${title}"?`,
      type: "info",
      confirmText: "Restore",
    });
    if (isConfirmed) {
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
    const isConfirmed = await confirm({
      title: "Permanently Delete?",
      message: `WARNING: Are you sure you want to PERMANENTLY delete "${title}"? This cannot be undone.`,
      type: "danger",
      confirmText: "Delete Permanently",
    });
    if (isConfirmed) {
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
        
        <div className="admin-content manage-quizzes-view-container" style={{ flex: 1, textAlign: "left" }}>
          
          {/* ─── APEX COMMAND BAR ─── */}
          <div className="armored-admin-card manage-command-bar-card" style={{ 
            backgroundColor: "var(--bg-card)", 
            border: "1.5px solid var(--border-color)", 
            borderRadius: "16px", 
            marginBottom: "28px", 
            padding: "24px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            textAlign: "left",
            width: "100%"
          }}>
            <div className="manage-quizzes-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ textAlign: "left" }}>
                <h2 style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                  {viewMode === "active" ? "Practice Quizzes" : "Recycle Bin"}
                </h2>
                <span style={{ fontSize: "13px", color: "var(--violet)", fontWeight: "600" }}>
                  {quizList.length} Total Quizzes | {quizList.filter(checkIsMine).length} Created by You
                </span>
              </div>
              
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "8px", backgroundColor: "var(--bg-page)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <button
                    onClick={() => setViewMode("active")}
                    className={viewMode === "active" ? "practice-toggle-active" : ""}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color, transparent)",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      backgroundColor: viewMode === "active" ? "var(--violet)" : "transparent",
                      color: viewMode === "active" ? "var(--primary-foreground, #ffffff)" : "var(--text-secondary)",
                    }}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setViewMode("recycle")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color, transparent)",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      backgroundColor: viewMode === "recycle" ? "var(--red, #ef4444)" : "transparent",
                      color: viewMode === "recycle" ? "#ffffff" : "var(--text-secondary)",
                    }}
                  >
                    Recycle Bin
                  </button>
                </div>

                <button
                  onClick={() => navigate('/admin/create-practice')}
                  className="practice-create-btn"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    backgroundColor: "var(--violet)",
                    color: "var(--primary-foreground, #ffffff)",
                    border: "1px solid var(--border-color, transparent)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)"
                  }}
                >
                  <Plus size={15} style={{ stroke: "currentColor", strokeWidth: 2.2 }} /> Create Practice Quiz
                </button>
              </div>
            </div>

            {/* Ownership Tabs */}
            <div style={{ 
              display: "flex", 
              borderBottom: "1.5px solid var(--border-color)", 
              width: "100%", 
              marginBottom: "16px",
              overflowX: "auto",
              scrollbarWidth: "none"
            }}>
              <button
                onClick={() => setOwnershipTab("mine")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: ownershipTab === "mine" ? "2.5px solid var(--violet)" : "2.5px solid transparent",
                  backgroundColor: "transparent",
                  color: ownershipTab === "mine" ? "var(--violet)" : "var(--text-secondary)",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap"
                }}
              >
                <User size={15} />
                My Quizzes
              </button>
              <button
                onClick={() => setOwnershipTab("all")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: ownershipTab === "all" ? "2.5px solid var(--violet)" : "2.5px solid transparent",
                  backgroundColor: "transparent",
                  color: ownershipTab === "all" ? "var(--violet)" : "var(--text-secondary)",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap"
                }}
              >
                <Grid size={15} />
                All Quizzes
              </button>
            </div>

            {/* Filters Row: Search, Date Picker, Types Filter */}
            <div className="manage-quizzes-filter-row" style={{ display: "flex", gap: "12px", width: "100%", flexWrap: "wrap", alignItems: "center" }}>
              <div className="pill-search-container" style={{ 
                margin: 0, 
                flex: "1 1 240px", 
                maxWidth: "340px",
                display: "flex", 
                alignItems: "center", 
                gap: "8px",
                padding: "8px 14px",
                height: "38px"
              }}>
                <Search size={15} className="pill-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search quizzes..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pill-search-input"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <div style={{ flex: "0 1 200px", minWidth: "160px", position: "relative" }}>
                <MuiDatePicker value={filterDate} onChange={setFilterDate} label="mm/dd/yyyy" />
                {filterDate && (
                  <button 
                    onClick={() => setFilterDate("")}
                    style={{ position: "absolute", right: "32px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}
                    title="Clear date"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Types / Pricing Filter */}
              <div style={{ 
                flex: "0 1 150px", 
                minWidth: "130px", 
                height: "38px", 
                display: "flex", 
                alignItems: "center", 
                gap: "6px", 
                backgroundColor: "var(--bg-input, #FAFAFC)", 
                border: "1px solid var(--border-color)", 
                borderRadius: "8px", 
                padding: "0 12px"
              }}>
                <Tag size={13} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ 
                    border: "none", 
                    background: "transparent", 
                    outline: "none", 
                    fontSize: "12px", 
                    color: "var(--text-primary)", 
                    fontWeight: "500", 
                    width: "100%",
                    cursor: "pointer"
                  }}
                >
                  <option value="all">Types / Status</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {(searchTerm || filterDate || filterType !== "all") && (
                <button
                  onClick={() => { setSearchTerm(""); setFilterDate(""); setFilterType("all"); }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--violet)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: "6px 10px"
                  }}
                >
                  Clear Filters
                </button>
              )}
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
              <SkeletonTable rows={5} columns={ownershipTab !== "mine" ? 8 : 7} style={{ border: "none" }} />
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
                    {ownershipTab !== "mine" && (
                      <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Created By</th>
                    )}
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", maxWidth: "220px" }}>Title</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pricing</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Subject</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Questions</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date Created</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                    <th style={{ padding: "16px", textAlign: "right", color: "var(--text-muted)", fontWeight: "600", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuizzes.map((quiz) => {
                    return (
                      <tr key={quiz._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        {ownershipTab !== "mine" && (
                          <td style={{ padding: "16px", whiteSpace: "nowrap" }}>
                            {(() => {
                              const isMine = checkIsMine(quiz);
                              const creatorName = quiz.createdBy?.fullName || "System Admin";
                              const firstLetter = creatorName.charAt(0).toUpperCase();
                              const colors = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
                              const charCode = creatorName.charCodeAt(0) || 0;
                              const bgColor = colors[charCode % colors.length];
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div style={{
                                    width: "26px",
                                    height: "26px",
                                    borderRadius: "50%",
                                    backgroundColor: bgColor,
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    textTransform: "uppercase"
                                  }}>
                                    {firstLetter}
                                  </div>
                                  <span style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "13px" }}>
                                    {isMine ? "You" : creatorName}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        )}
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
                            fontSize: "13px",
                            whiteSpace: "nowrap",
                            display: "inline-block"
                          }}>
                            {quiz.subject}
                          </span>
                        </td>
                        <td style={{ padding: "16px", fontWeight: "700", color: "var(--violet)", whiteSpace: "nowrap" }}>
                          {quiz.questionCount ?? quiz.questions?.length ?? 0}
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
                        <td style={{ padding: "18px 28px", textAlign: "right", overflow: "visible", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}>
                            <button
                              onClick={(e) => toggleActionDropdown(e, quiz._id)}
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
                                  top: dropdownPos.top != null ? `${dropdownPos.top}px` : "auto",
                                  bottom: dropdownPos.bottom != null ? `${dropdownPos.bottom}px` : "auto",
                                  right: `${dropdownPos.right}px`,
                                  backgroundColor: "var(--bg-card)",
                                  border: "1.5px solid var(--border-color)",
                                  borderRadius: "10px",
                                  padding: "6px 0",
                                  minWidth: "140px",
                                  maxHeight: "calc(100vh - 36px)",
                                  overflowY: "auto",
                                  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
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
  
                                      {/* Publish / Unpublish (Save to Draft) */}
                                      {quiz.status === "Published" ? (
                                        <div
                                          onClick={async () => {
                                            setActiveDropdown(null);
                                            const isConfirmed = await confirm({
                                              title: "Unpublish Practice Quiz?",
                                              message: `Are you sure you want to unpublish "${quiz.title}"? It will be saved as Draft and hidden from students.`,
                                              type: "warning",
                                              confirmText: "Unpublish",
                                            });
                                            if (isConfirmed) {
                                              try {
                                                const token = localStorage.getItem("token");
                                                await axios.put(
                                                  `${import.meta.env.VITE_API_URL}/api/practice/${quiz._id}`,
                                                  { status: "Draft" },
                                                  { headers: { Authorization: `Bearer ${token}` } }
                                                );
                                                fetchQuizzes();
                                              } catch (error) {
                                                console.error("Failed to unpublish practice quiz:", error);
                                                alert(error.response?.data?.message || "Failed to unpublish practice quiz.");
                                              }
                                            }
                                          }}
                                          style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                        >
                                          <EyeOff size={15} /> Unpublish (Save to Draft)
                                        </div>
                                      ) : (
                                        <div
                                          onClick={async () => {
                                            setActiveDropdown(null);
                                            try {
                                              const token = localStorage.getItem("token");
                                              await axios.put(
                                                `${import.meta.env.VITE_API_URL}/api/practice/${quiz._id}`,
                                                { status: "Published", scheduledAt: null },
                                                { headers: { Authorization: `Bearer ${token}` } }
                                              );
                                              fetchQuizzes();
                                            } catch (error) {
                                              console.error("Failed to publish practice quiz:", error);
                                              alert(error.response?.data?.message || "Failed to publish practice quiz.");
                                            }
                                          }}
                                          style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                        >
                                          <UploadCloud size={15} /> Publish
                                        </div>
                                      )}

                                      {quiz.status === "Scheduled" && (
                                        <div
                                          onClick={async () => {
                                            setActiveDropdown(null);
                                            const isConfirmed = await confirm({
                                              title: "Cancel Schedule & Save to Draft?",
                                              message: `Cancel the scheduled release for "${quiz.title}" and save it as Draft?`,
                                              type: "warning",
                                              confirmText: "Save to Draft",
                                            });
                                            if (isConfirmed) {
                                              try {
                                                const token = localStorage.getItem("token");
                                                await axios.put(
                                                  `${import.meta.env.VITE_API_URL}/api/practice/${quiz._id}`,
                                                  { status: "Draft", scheduledAt: null },
                                                  { headers: { Authorization: `Bearer ${token}` } }
                                                );
                                                fetchQuizzes();
                                              } catch (error) {
                                                console.error("Failed to save to draft:", error);
                                                alert(error.response?.data?.message || "Failed to save to draft.");
                                              }
                                            }
                                          }}
                                          style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                        >
                                          <EyeOff size={15} /> Save to Draft
                                        </div>
                                      )}

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
                                          const isConfirmed = await confirm({
                                            title: "Convert to Real Exam?",
                                            message: `Convert "${quiz.title}" into a Real Exam? This will create a duplicate in your My Exams list.`,
                                            type: "info",
                                            confirmText: "Convert",
                                          });
                                          if (isConfirmed) {
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

            <div style={{ marginBottom: "16px" }}>
              <MuiDatePicker value={scheduleDate} onChange={setScheduleDate} label="mm-dd-yyyy" />
            </div>

            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</label>
            <div style={{ position: "relative", marginBottom: "24px" }}>
              <button
                type="button"
                onClick={() => setShowTimePicker(!showTimePicker)}
                style={{ background: "var(--bg-input)", border: "1.5px solid var(--border-color)", borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}
              >
                <span>{`${scheduledHour}:${scheduledMinute} ${scheduledPeriod}`}</span>
                <Clock size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              </button>

              {showTimePicker && (
                <div style={{ position: "absolute", top: "105%", left: 0, right: 0, zIndex: 1000, backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", height: "180px", borderBottom: "1.5px solid var(--border-color)", paddingBottom: "12px" }}>

                    {/* Hours */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }} className="time-scroll-col">
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(hr => {
                        const isSelected = hr === scheduledHour;
                        return (
                          <div key={hr} onClick={() => { setScheduledHour(hr); updateScheduledTime(hr, scheduledMinute, scheduledPeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "var(--primary-foreground)" : "var(--text-primary)", transition: "all 0.1s ease" }}>
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
                          <div key={min} onClick={() => { setScheduledMinute(min); updateScheduledTime(scheduledHour, min, scheduledPeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "var(--primary-foreground)" : "var(--text-primary)", transition: "all 0.1s ease" }}>
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
                          <div key={p} onClick={() => { setScheduledPeriod(p); updateScheduledTime(scheduledHour, scheduledMinute, p); }} style={{ padding: "10px 6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: viewMode === "active" ? "var(--primary-foreground)" : "var(--text-secondary)", transition: "all 0.1s ease" }}>
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
                style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", background: "var(--violet)", color: "var(--primary-foreground)", cursor: savingSchedule ? "not-allowed" : "pointer", fontWeight: "600", fontSize: "13px", opacity: savingSchedule ? 0.7 : 1 }}
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
