import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import DocxParser from "./components/DocxParser";
import "../css/admin/AdminLayout.css";
import "../css/admin/CreateQuiz.css";

const emptyQuestion = () => ({
  questionEnglish: "",
  questionHindi: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  correctOptionIndex: -1,
});

const formatDateTimeLocal = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

function EditQuiz() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quizMeta, setQuizMeta] = useState({
    examName: "",
    subject: "",
    title: "",
    description: "",
    duration: "",
    marksPerQuestion: 1,
    negativeMarking: 0,
    published: false,
    status: "Draft",
    scheduledDate: null,
  });

  const [presetSelected, setPresetSelected] = useState("Custom");
  const [presets, setPresets] = useState([]);
  const [includeNegative, setIncludeNegative] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  // Publication schedule fields
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledHour, setScheduledHour] = useState("12");
  const [scheduledMinute, setScheduledMinute] = useState("00");
  const [scheduledPeriod, setScheduledPeriod] = useState("AM");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
  };

  const generateCalendarDays = () => {
    const days = [];
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sunday, 6 = Saturday
    
    // Trailing days from previous month
    const prevMonthYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({
        day: d,
        month: prevMonth,
        year: prevMonthYear,
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        month: calendarMonth,
        year: calendarYear,
        isCurrentMonth: true
      });
    }
    
    // Leading days of next month to complete 42 cells (6 weeks grid)
    const nextMonthYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
    const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        month: nextMonth,
        year: nextMonthYear,
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const updateScheduledDateTime = (dateVal, hrVal, minVal, periodVal) => {
    if (!dateVal) return;
    let hr24 = parseInt(hrVal, 10);
    if (periodVal === "PM" && hr24 < 12) hr24 += 12;
    if (periodVal === "AM" && hr24 === 12) hr24 = 0;
    const hr24Str = String(hr24).padStart(2, "0");
    const formatted = `${dateVal}T${hr24Str}:${minVal}`;
    setScheduledDateTime(formatted);
  };

  const [questions, setQuestions] = useState([]);
  const [expandedQuestions, setExpandedQuestions] = useState({ 0: true });
  const [pageLoading, setPageLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Collapse states for builder sections
  const [quizConfigCollapsed, setQuizConfigCollapsed] = useState(false);
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false);

  // Minutes and seconds inputs for duration
  const [durationMin, setDurationMin] = useState("");
  const [durationSec, setDurationSec] = useState("");

  const handleDurationMinChange = (e) => {
    const val = e.target.value;
    setDurationMin(val);
    setPresetSelected("Custom");
    const m = parseFloat(val) || 0;
    const s = parseFloat(durationSec) || 0;
    setQuizMeta((prev) => ({ ...prev, duration: m + s / 60 }));
  };

  const handleDurationSecChange = (e) => {
    const val = e.target.value;
    setDurationSec(val);
    setPresetSelected("Custom");
    const m = parseFloat(durationMin) || 0;
    const s = parseFloat(val) || 0;
    setQuizMeta((prev) => ({ ...prev, duration: m + s / 60 }));
  };

  useEffect(() => {
    console.log("EditQuiz component mounted with ID parameter:", id);
    const fetchQuizToEdit = async () => {
      try {
        if (!id) {
          console.warn("No ID parameter found in route!");
          return;
        }
        const url = `${import.meta.env.VITE_API_URL}/api/quizzes/${id}`;
        console.log("Fetching quiz from:", url);
        const response = await axios.get(url);
        const dbQuiz = response.data;
        console.log("Fetch successful. Database Quiz data:", dbQuiz);

        setQuizMeta({
          examName: dbQuiz.examName || "",
          subject: dbQuiz.subject || "",
          title: dbQuiz.title || "",
          description: dbQuiz.description || "",
          duration: dbQuiz.duration || "",
          marksPerQuestion: dbQuiz.marksPerQuestion || 1,
          negativeMarking: dbQuiz.negativeMarking || 0,
          published: dbQuiz.published || false,
          status: dbQuiz.status || "Draft",
          scheduledDate: dbQuiz.scheduledDate || null,
        });

        const durationVal = dbQuiz.duration || 0;
        const minVal = Math.floor(durationVal);
        const secVal = Math.round((durationVal - minVal) * 60);
        setDurationMin(durationVal > 0 ? String(minVal) : "");
        setDurationSec(durationVal > 0 ? String(secVal) : "");

        let fetchedPresets = [];
        try {
          const presetRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/presets`);
          fetchedPresets = presetRes.data;
          setPresets(fetchedPresets);
        } catch (err) {
          console.error("Error fetching presets:", err);
        }

        // Resolve Preset option on load
        const matchedPreset = fetchedPresets.find(p => 
          p.examName === dbQuiz.examName && 
          p.duration == dbQuiz.duration && 
          p.marksPerQuestion == dbQuiz.marksPerQuestion && 
          p.negativeMarking == dbQuiz.negativeMarking
        );
        if (matchedPreset) {
          setPresetSelected(matchedPreset._id);
        } else {
          setPresetSelected("Custom");
        }

        setIncludeNegative(dbQuiz.negativeMarking > 0);
        const schedDateTimeStr = formatDateTimeLocal(dbQuiz.scheduledDate);
        setScheduledDateTime(schedDateTimeStr);
        setIsScheduled(dbQuiz.status === "Scheduled" || !!dbQuiz.scheduledDate);

        if (dbQuiz.scheduledDate) {
          const d = new Date(dbQuiz.scheduledDate);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            setScheduledDate(`${yyyy}-${mm}-${dd}`);

            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, "0");
            const period = hours >= 12 ? "PM" : "AM";
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hoursStr = String(hours).padStart(2, "0");

            setScheduledHour(hoursStr);
            setScheduledMinute(minutes);
            setScheduledPeriod(period);
            setCalendarMonth(d.getMonth());
            setCalendarYear(d.getFullYear());
          }
        } else {
          setScheduledDate("");
          setScheduledHour("12");
          setScheduledMinute("00");
          setScheduledPeriod("AM");
          const today = new Date();
          setCalendarMonth(today.getMonth());
          setCalendarYear(today.getFullYear());
        }

        const loadedQuestions = (dbQuiz.questions || []).map((q) => {
          const options = q.options?.length === 4 ? q.options : ["", "", "", ""];
          const correctIdx = options.indexOf(q.correctAnswer);
          return {
            _id: q._id,
            questionEnglish: q.questionEnglish || "",
            questionHindi: q.questionHindi || "",
            options,
            correctOptionIndex: correctIdx,
            correctAnswer: q.correctAnswer || "",
          };
        });

        console.log("Mapped questions list on edit load:", loadedQuestions);
        setQuestions(loadedQuestions.length > 0 ? loadedQuestions : [emptyQuestion()]);
        
        // Build expanded object: first question is expanded (0: true), rest collapsed
        const expandedState = { 0: true };
        loadedQuestions.forEach((_, idx) => {
          if (idx > 0) expandedState[idx] = false;
        });
        setExpandedQuestions(expandedState);
      } catch (error) {
        console.error("Fetch Quiz Error details:", error);
        setMessage({
          text: `Failed to load quiz data: ${error.response?.data?.message || error.message}. This quiz may have been deleted.`,
          type: "status-error",
        });
        alert(`Failed to load quiz data:\n${error.response?.data?.message || error.message}`);
      } finally {
        setPageLoading(false);
      }
    };

    fetchQuizToEdit();
  }, [id]);

  const handleMetaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizMeta((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (["duration", "marksPerQuestion", "negativeMarking", "examName"].includes(name)) {
        setPresetSelected("Custom");
      }
      return updated;
    });
  };

  const handlePresetChange = (e) => {
    const presetId = e.target.value;
    setPresetSelected(presetId);

    if (presetId === "Custom") {
      setQuizMeta((prev) => ({
        ...prev,
        examName: "",
        duration: "",
        marksPerQuestion: 1,
        negativeMarking: 0,
      }));
      setDurationMin("");
      setDurationSec("");
      setIncludeNegative(false);
      return;
    }

    const selected = presets.find(p => p._id === presetId);
    if (selected) {
      setQuizMeta((prev) => ({
        ...prev,
        examName: selected.examName,
        duration: selected.duration,
        marksPerQuestion: selected.marksPerQuestion,
        negativeMarking: selected.negativeMarking,
      }));
      const mins = Math.floor(selected.duration);
      const secs = Math.round((selected.duration - mins) * 60);
      setDurationMin(mins.toString());
      setDurationSec(secs.toString());
      setIncludeNegative(selected.negativeMarking > 0);
    }
  };

  const handleSavePreset = async () => {
    const presetName = prompt("Enter a name for this new Exam Template Preset:");
    if (!presetName) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/presets`, {
        presetName,
        examName: quizMeta.examName,
        duration: quizMeta.duration || 60,
        marksPerQuestion: quizMeta.marksPerQuestion,
        negativeMarking: quizMeta.negativeMarking
      });
      setPresets([res.data, ...presets]);
      setPresetSelected(res.data._id);
      setMessage({ text: "Preset saved successfully!", type: "status-success" });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to save preset.", type: "status-error" });
    }
  };

  const handleDeletePreset = async (presetId) => {
    if (!window.confirm("Are you sure you want to delete this preset?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/presets/${presetId}`);
      setPresets(presets.filter(p => p._id !== presetId));
      if (presetSelected === presetId) setPresetSelected("Custom");
      setMessage({ text: "Preset deleted.", type: "status-success" });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Failed to delete preset.", type: "status-error" });
    }
  };

  const handleQuestionChange = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const newOptions = [...updated[qIndex].options];
      newOptions[optIndex] = value;

      let newCorrectVal = updated[qIndex].correctAnswer;
      if (updated[qIndex].correctOptionIndex === optIndex) {
        newCorrectVal = value;
      }

      updated[qIndex] = {
        ...updated[qIndex],
        options: newOptions,
        correctAnswer: newCorrectVal,
      };
      return updated;
    });
  };

  const selectCorrectOption = (qIndex, optIndex) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const optVal = updated[qIndex].options[optIndex];
      updated[qIndex] = {
        ...updated[qIndex],
        correctOptionIndex: optIndex,
        correctAnswer: optVal,
      };
      return updated;
    });
  };

  const toggleQuestionExpand = (index) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setExpandedQuestions((prev) => ({
      ...prev,
      [questions.length]: true,
    }));
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setExpandedQuestions((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const keyVal = parseInt(k, 10);
        if (keyVal < index) {
          next[keyVal] = prev[keyVal];
        } else if (keyVal > index) {
          next[keyVal - 1] = prev[keyVal];
        }
      });
      return next;
    });
  };

  const clearAllQuestions = () => {
    if (window.confirm("Are you sure you want to delete all questions? This cannot be undone.")) {
      setQuestions([emptyQuestion()]);
      setExpandedQuestions({ 0: true });
    }
  };

  const handleQuestionsLoaded = (parsedQuestions) => {
    // Map parsed questions to fit our inline-option layout
    const mapped = parsedQuestions.map((q) => {
      let correctIdx = -1;
      if (q.correctAnswer === "A") correctIdx = 0;
      else if (q.correctAnswer === "B") correctIdx = 1;
      else if (q.correctAnswer === "C") correctIdx = 2;
      else if (q.correctAnswer === "D") correctIdx = 3;

      // Extract options text array
      const optionsMapped = q.options.map(opt => {
        if (typeof opt === "object") {
          if (opt.english && opt.hindi) {
            return `${opt.english} / ${opt.hindi}`;
          }
          return opt.english || opt.hindi || "";
        }
        return String(opt).trim();
      });

      let correctText = "";
      if (correctIdx !== -1) {
        correctText = optionsMapped[correctIdx] || "";
      } else {
        correctIdx = optionsMapped.indexOf(q.correctAnswer);
        correctText = q.correctAnswer;
      }

      return {
        questionEnglish: q.questionEnglish,
        questionHindi: q.questionHindi,
        options: optionsMapped,
        correctOptionIndex: correctIdx,
        correctAnswer: correctText,
      };
    });

    setQuestions(mapped);
    
    // Build expanded object: first question is expanded (0: true), rest collapsed
    const expandedState = { 0: true };
    mapped.forEach((_, idx) => {
      if (idx > 0) expandedState[idx] = false;
    });
    setExpandedQuestions(expandedState);

    setMessage({
      text: `✅ ${parsedQuestions.length} questions imported from Word file. Review and submit below.`,
      type: "status-success",
    });
  };

  const validateForm = (isDraft = false) => {
    if (isDraft) {
      if (!quizMeta.subject || !quizMeta.title) {
        setMessage({ text: "Please fill in Subject and Title to save a draft.", type: "status-error" });
        return false;
      }
      return true;
    }

    if (!quizMeta.examName || !quizMeta.subject || !quizMeta.title || !quizMeta.duration) {
      setMessage({ text: "Please fill in Exam Name, Subject, Title, and Duration.", type: "status-error" });
      return false;
    }
    if (isScheduled && !scheduledDateTime) {
      setMessage({ text: "Please select a Date and Time for scheduling.", type: "status-error" });
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionEnglish || !q.questionEnglish.trim()) {
        setMessage({ text: `Question ${i + 1}: English question text is required.`, type: "status-error" });
        return false;
      }
      if (!q.options || q.options.length !== 4) {
        setMessage({ text: `Question ${i + 1}: Must have exactly 4 options.`, type: "status-error" });
        return false;
      }
      for (let j = 0; j < q.options.length; j++) {
        const opt = q.options[j];
        if (!opt || !String(opt).trim()) {
          setMessage({ text: `Question ${i + 1}, Option ${["A","B","C","D"][j]}: Option text cannot be blank.`, type: "status-error" });
          return false;
        }
      }
      if (q.correctOptionIndex === -1 || !q.correctAnswer) {
        setMessage({ text: `Question ${i + 1}: Please select a correct answer by clicking on one of the option letters (A, B, C, or D).`, type: "status-error" });
        return false;
      }
    }
    return true;
  };

  const handleUpdate = async (submitType) => {
    setMessage({ text: "", type: "" });
    const isDraft = submitType === "draft";
    if (!validateForm(isDraft)) return;

    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");

      let publishedVal = false;
      let statusVal = "Draft";
      let scheduledDateVal = null;

      if (submitType === "publish") {
        publishedVal = true;
        statusVal = "Published";
      } else if (submitType === "schedule") {
        publishedVal = false;
        statusVal = "Scheduled";
        scheduledDateVal = new Date(scheduledDateTime);
      } else {
        publishedVal = false;
        statusVal = "Draft";
      }

      const cleanQuestions = questions.map((q) => ({
        ...(q._id ? { _id: q._id } : {}),
        questionEnglish: q.questionEnglish.trim(),
        questionHindi: q.questionHindi.trim(),
        options: q.options.map((opt) => String(opt).trim()),
        correctAnswer: q.correctAnswer.trim(),
      }));

      const payload = {
        ...quizMeta,
        published: publishedVal,
        status: statusVal,
        scheduledDate: scheduledDateVal,
        questions: cleanQuestions,
      };

      await axios.put(`${import.meta.env.VITE_API_URL}/api/quizzes/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ text: `✅ Quiz successfully updated as ${statusVal}!`, type: "status-success" });
      setTimeout(() => navigate("/admin/manage-quizzes"), 1200);
    } catch (error) {
      console.error("Update Error:", error);
      setMessage({
        text: error.response?.data?.message || "Failed to update quiz.",
        type: "status-error",
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Edit Quiz" />

        <div className="admin-content">
          <div className="create-quiz-page">
            {pageLoading ? (
              <div style={{ textAlign: "center", padding: "50px", fontSize: "16px", color: "var(--text-secondary)" }}>
                ⏳ Pulling quiz record from MongoDB...
              </div>
            ) : (
              <>
                {message.text && (
                  <p className={`admin-status-message ${message.type}`}>{message.text}</p>
                )}

                <div className="quiz-two-column-layout">
                  {/* ── LEFT PANEL: QUIZ DETAILS & QUESTIONS ── */}
                  <div className="quiz-left-panel">
                    {/* 1. Preset Selector */}
                    <div className="form-card compact-card">
                      <h3 className="form-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        Exam Template Preset
                        {presetSelected !== "Custom" && (
                          <button onClick={(e) => { e.preventDefault(); handleDeletePreset(presetSelected); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", padding: 0 }} title="Delete Preset">🗑️</button>
                        )}
                      </h3>
                      <div className="form-field">
                        <select
                          value={presetSelected}
                          onChange={handlePresetChange}
                          className="preset-select"
                        >
                          <option value="Custom">Custom Settings</option>
                          {presets.map(p => (
                            <option key={p._id} value={p._id}>
                              {p.presetName} ({p.duration}m, +{p.marksPerQuestion}/-{p.negativeMarking})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 2. Details Card */}
                    <div className="form-card">
                      <div 
                        className="form-card-title" 
                        onClick={() => setQuizConfigCollapsed(!quizConfigCollapsed)}
                        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: quizConfigCollapsed ? "none" : "1px solid var(--border-color)", paddingBottom: quizConfigCollapsed ? "0" : "10px" }}
                      >
                        <span>Quiz Configuration</span>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          <button onClick={(e) => { e.stopPropagation(); handleSavePreset(); }} className="dashboard-view-all-btn" style={{ padding: "4px 8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", background: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3", border: "1px solid rgba(110, 63, 243, 0.2)" }}>
                            💾 Save as Preset
                          </button>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "normal" }}>
                            {quizConfigCollapsed ? "＋ Expand" : "－ Collapse"}
                          </span>
                        </div>
                      </div>
                      
                      {!quizConfigCollapsed && (
                        <div className="details-vertical-fields" style={{ marginTop: "16px" }}>
                          <div className="form-field">
                            <label>Exam Name</label>
                            <input
                              type="text"
                              name="examName"
                              value={quizMeta.examName}
                              onChange={handleMetaChange}
                              placeholder="e.g. JEE Main / NEET / BPSC"
                              required
                            />
                          </div>

                          <div className="form-field">
                            <label>Subject</label>
                            <input
                              type="text"
                              name="subject"
                              value={quizMeta.subject}
                              onChange={handleMetaChange}
                              placeholder="e.g. Physics / Chemistry / Math"
                              required
                            />
                          </div>

                          <div className="form-field">
                            <label>Quiz Title</label>
                            <input
                              type="text"
                              name="title"
                              value={quizMeta.title}
                              onChange={handleMetaChange}
                              placeholder="e.g. Chapter 3 Practice Test"
                              required
                            />
                          </div>

                          <div className="form-field">
                            <label>Description (Optional)</label>
                            <textarea
                              name="description"
                              value={quizMeta.description}
                              onChange={handleMetaChange}
                              placeholder="Enter brief description of this quiz"
                              rows={2}
                            />
                          </div>

                          <div className="form-field">
                            <label>Duration</label>
                            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                <input
                                  type="number"
                                  value={durationMin}
                                  onChange={handleDurationMinChange}
                                  placeholder="Minutes"
                                  min="0"
                                  required
                                />
                                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>min</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                <input
                                  type="number"
                                  value={durationSec}
                                  onChange={handleDurationSecChange}
                                  placeholder="Seconds"
                                  min="0"
                                  max="59"
                                  required
                                />
                                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>sec</span>
                              </div>
                            </div>
                          </div>

                          <div className="form-field">
                            <label>Marks Per Question</label>
                            <input
                              type="number"
                              name="marksPerQuestion"
                              value={quizMeta.marksPerQuestion}
                              onChange={handleMetaChange}
                              min="1"
                              step="1"
                            />
                          </div>

                          {/* Negative Marking Toggle and Field */}
                          <div className="form-field toggle-negative-field">
                            <label className="checkbox-toggle-label">
                              <input
                                type="checkbox"
                                checked={includeNegative}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setIncludeNegative(checked);
                                  setPresetSelected("Custom");
                                  if (!checked) {
                                    setQuizMeta(prev => ({ ...prev, negativeMarking: 0 }));
                                  }
                                }}
                              />
                              <span>Enable Negative Marking</span>
                            </label>
                            
                            {includeNegative && (
                              <div className="negative-marking-input-wrapper" style={{ marginTop: "10px" }}>
                                <label style={{ fontSize: "10.5px" }}>Negative Marks (-value)</label>
                                <input
                                  type="number"
                                  name="negativeMarking"
                                  value={quizMeta.negativeMarking}
                                  onChange={handleMetaChange}
                                  min="0"
                                  step="0.25"
                                  placeholder="e.g. 1"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Questions Builder */}
                    <div className="form-card header-questions-card">
                      <div 
                        className="questions-title-row" 
                        onClick={() => setQuestionsCollapsed(!questionsCollapsed)}
                        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: questionsCollapsed ? "none" : "1.5px solid var(--border-color)", paddingBottom: questionsCollapsed ? "0" : "12px" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h3 className="form-card-title" style={{ margin: 0, border: "none", padding: 0 }}>Assessment Questions</h3>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "normal" }}>
                            {questionsCollapsed ? "＋ Expand" : "－ Collapse"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }} onClick={(e) => e.stopPropagation()}>
                          {questions.length > 0 && (
                            <button 
                              type="button" 
                              onClick={clearAllQuestions} 
                              className="btn-danger-compact"
                              style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                color: "var(--red)",
                                border: "1.5px solid rgba(239, 68, 68, 0.2)",
                                borderRadius: "8px",
                                padding: "6px 12px",
                                fontSize: "12px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.15s ease"
                              }}
                            >
                              🗑️ Delete All Questions
                            </button>
                          )}
                          <span className="question-count-badge">
                            {questions.length} Question{questions.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {!questionsCollapsed && (
                        <>
                          <div className="questions-scrollable-container">
                            {questions.map((q, qIndex) => {
                              const isExpanded = !!expandedQuestions[qIndex];
                              return (
                                <div className="question-block-enhanced" key={qIndex}>
                                  {/* Question Block Header */}
                                  <div 
                                    className="question-block-header"
                                    onClick={() => toggleQuestionExpand(qIndex)}
                                    style={{ cursor: "pointer", userSelect: "none" }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                                      <span className="question-number">Question {qIndex + 1}</span>
                                      {!isExpanded && q.questionEnglish && (
                                        <span 
                                          style={{ 
                                            fontSize: "12px", 
                                            color: "var(--text-muted)", 
                                            whiteSpace: "nowrap", 
                                            overflow: "hidden", 
                                            textOverflow: "ellipsis",
                                            fontWeight: "500",
                                            flex: 1
                                          }}
                                        >
                                          {q.questionEnglish}
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }} onClick={(e) => e.stopPropagation()}>
                                      {questions.length > 1 && (
                                        <button
                                          type="button"
                                          className="remove-btn-compact"
                                          onClick={() => removeQuestion(qIndex)}
                                          title="Delete Question"
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                          </svg>
                                          <span>Delete</span>
                                        </button>
                                      )}
                                      <span style={{ fontSize: "12px", color: "var(--text-muted)", padding: "0 2px" }}>
                                        {isExpanded ? "▲" : "▼"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Collapsible Question Inputs */}
                                  {isExpanded && (
                                    <div className="question-inputs-fields" style={{ marginTop: "14px" }}>
                                      <div className="form-field full-width">
                                        <textarea
                                          value={q.questionEnglish}
                                          onChange={(e) =>
                                            handleQuestionChange(qIndex, "questionEnglish", e.target.value)
                                          }
                                          rows={2}
                                          placeholder="Enter question in English..."
                                        />
                                      </div>

                                      <div className="form-field full-width">
                                        <textarea
                                          value={q.questionHindi}
                                          onChange={(e) =>
                                            handleQuestionChange(qIndex, "questionHindi", e.target.value)
                                          }
                                          rows={2}
                                          placeholder="हिंदी में प्रश्न लिखें (वैकल्पिक)..."
                                        />
                                      </div>

                                      <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>
                                        Options (Select correct answer using checkmark ✓ on the right)
                                      </label>
                                      
                                      <div className="options-grid-enhanced">
                                        {["A", "B", "C", "D"].map((label, optIndex) => {
                                          const isCorrect = q.correctOptionIndex === optIndex;
                                          return (
                                            <div 
                                              className={`option-input-card-enhanced ${isCorrect ? "correct-answer-highlighted" : ""}`}
                                              key={label}
                                            >
                                              <div className={`option-letter-badge ${isCorrect ? "badge-correct" : ""}`}>
                                                {label}
                                              </div>
                                              <input
                                                type="text"
                                                value={q.options[optIndex]}
                                                onChange={(e) =>
                                                  handleOptionChange(qIndex, optIndex, e.target.value)
                                                }
                                                placeholder="English Option / हिंदी विकल्प"
                                                className="option-text-field"
                                              />
                                              <div 
                                                className={`option-select-tick ${isCorrect ? "tick-selected" : ""}`}
                                                onClick={() => selectCorrectOption(qIndex, optIndex)}
                                                title="Mark as correct answer"
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  width: "22px",
                                                  height: "22px",
                                                  borderRadius: "50%",
                                                  border: isCorrect ? "1.5px solid #10B981" : "1.5px solid var(--border-input)",
                                                  backgroundColor: isCorrect ? "#10B981" : "transparent",
                                                  color: isCorrect ? "#ffffff" : "transparent",
                                                  cursor: "pointer",
                                                  fontSize: "12px",
                                                  fontWeight: "bold",
                                                  transition: "all 0.15s ease",
                                                  userSelect: "none",
                                                  flexShrink: 0
                                                }}
                                              >
                                                ✓
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

                          <button type="button" className="add-question-btn" onClick={addQuestion}>
                            + Add Question Manually
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── RIGHT PANEL: PUBLICATION & TOOLS ── */}
                  <div className="quiz-right-panel">
                    {/* 4. Docx Parser Card */}
                    <div className="form-card compact-card">
                      <DocxParser onQuestionsLoaded={handleQuestionsLoaded} />
                    </div>

                    {/* 5. Schedule Card */}
                    <div className="form-card compact-card">
                      <h3 className="form-card-title">Publication Schedule</h3>
                      <div className="form-field">
                        <label className="checkbox-toggle-label">
                          <input
                            type="checkbox"
                            checked={isScheduled}
                            onChange={(e) => setIsScheduled(e.target.checked)}
                          />
                          <span>Schedule for Later</span>
                        </label>

                        {isScheduled && (
                          <div className="scheduled-datetime-wrapper" style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                            {/* Date Input */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                              <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-secondary)" }}>Publish Date</label>
                              <button
                                type="button"
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                style={{
                                  background: "var(--bg-input)",
                                  border: "1.5px solid var(--border-input)",
                                  borderRadius: "10px",
                                  padding: "10px 14px",
                                  fontSize: "13.5px",
                                  color: "var(--text-primary)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  width: "100%",
                                  boxSizing: "border-box"
                                }}
                              >
                                <span>{scheduledDate ? formatDateDisplay(scheduledDate) : "Select Date"}</span>
                                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>📅</span>
                              </button>

                              {showDatePicker && (
                                <div 
                                  style={{
                                    position: "absolute",
                                    top: "105%",
                                    left: 0,
                                    zIndex: 1000,
                                    backgroundColor: "var(--bg-card)",
                                    border: "1.5px solid var(--border-color)",
                                    borderRadius: "16px",
                                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                                    padding: "16px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px",
                                    width: "260px",
                                    boxSizing: "border-box"
                                  }}
                                >
                                  {/* Header: < Month Year > */}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (calendarMonth === 0) {
                                          setCalendarMonth(11);
                                          setCalendarYear(calendarYear - 1);
                                        } else {
                                          setCalendarMonth(calendarMonth - 1);
                                        }
                                      }}
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text-primary)",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        padding: "4px 8px",
                                        fontWeight: "bold"
                                      }}
                                    >
                                      &lt;
                                    </button>
                                    <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>
                                      {`${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][calendarMonth]} ${calendarYear}`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (calendarMonth === 11) {
                                          setCalendarMonth(0);
                                          setCalendarYear(calendarYear + 1);
                                        } else {
                                          setCalendarMonth(calendarMonth + 1);
                                        }
                                      }}
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text-primary)",
                                        fontSize: "14px",
                                        cursor: "pointer",
                                        padding: "4px 8px",
                                        fontWeight: "bold"
                                      }}
                                    >
                                      &gt;
                                    </button>
                                  </div>

                                  {/* Days labels S M T W T F S */}
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
                                    {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                                      <span key={idx} style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)" }}>
                                        {d}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Days Grid */}
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                                    {generateCalendarDays().map((cell, idx) => {
                                      const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                                      const isSelected = cellDateStr === scheduledDate;
                                      
                                      return (
                                        <div
                                          key={idx}
                                          onClick={() => {
                                            setScheduledDate(cellDateStr);
                                            updateScheduledDateTime(cellDateStr, scheduledHour, scheduledMinute, scheduledPeriod);
                                            setShowDatePicker(false);
                                          }}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            height: "28px",
                                            fontSize: "12px",
                                            fontWeight: isSelected ? "700" : "500",
                                            borderRadius: "50%",
                                            cursor: "pointer",
                                            backgroundColor: isSelected ? "var(--violet)" : "transparent",
                                            color: isSelected 
                                              ? "#ffffff" 
                                              : cell.isCurrentMonth 
                                                ? "var(--text-primary)" 
                                                : "var(--text-muted)",
                                            border: isSelected ? "2px solid rgba(110, 63, 243, 0.2)" : "none",
                                            boxSizing: "border-box"
                                          }}
                                          className={isSelected ? "calendar-day-cell selected-day-cell" : "calendar-day-cell"}
                                        >
                                          {cell.day}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Actions footer */}
                                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px solid var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setScheduledDate("");
                                        setScheduledDateTime("");
                                        setShowDatePicker(false);
                                      }}
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--red)",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                      }}
                                    >
                                      Clear
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const today = new Date();
                                        const yyyy = today.getFullYear();
                                        const mm = String(today.getMonth() + 1).padStart(2, "0");
                                        const dd = String(today.getDate()).padStart(2, "0");
                                        const todayStr = `${yyyy}-${mm}-${dd}`;
                                        setScheduledDate(todayStr);
                                        setCalendarMonth(today.getMonth());
                                        setCalendarYear(today.getFullYear());
                                        updateScheduledDateTime(todayStr, scheduledHour, scheduledMinute, scheduledPeriod);
                                        setShowDatePicker(false);
                                      }}
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--violet)",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                      }}
                                    >
                                      Today
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Custom Time Selector Dropdown */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                              <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-secondary)" }}>Publish Time</label>
                              <button
                                type="button"
                                onClick={() => setShowTimePicker(!showTimePicker)}
                                style={{
                                  background: "var(--bg-input)",
                                  border: "1.5px solid var(--border-input)",
                                  borderRadius: "10px",
                                  padding: "10px 14px",
                                  fontSize: "13.5px",
                                  color: "var(--text-primary)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  width: "100%",
                                  boxSizing: "border-box"
                                }}
                              >
                                <span>{`${scheduledHour}:${scheduledMinute} ${scheduledPeriod}`}</span>
                                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>🕒</span>
                              </button>

                              {showTimePicker && (
                                <div 
                                  style={{
                                    position: "absolute",
                                    top: "105%",
                                    right: 0,
                                    zIndex: 1000,
                                    backgroundColor: "var(--bg-card)",
                                    border: "1.5px solid var(--border-color)",
                                    borderRadius: "16px",
                                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                                    padding: "16px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "14px",
                                    width: "240px"
                                  }}
                                >
                                  <div style={{ display: "flex", height: "180px", borderBottom: "1.5px solid var(--border-color)", paddingBottom: "12px" }}>
                                    {/* Hour Column */}
                                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }} className="time-scroll-col">
                                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(hr => {
                                        const isSelected = hr === scheduledHour;
                                        return (
                                          <div
                                            key={hr}
                                            onClick={() => {
                                              setScheduledHour(hr);
                                              updateScheduledDateTime(scheduledDate, hr, scheduledMinute, scheduledPeriod);
                                            }}
                                            style={{
                                              padding: "6px",
                                              textAlign: "center",
                                              borderRadius: "8px",
                                              cursor: "pointer",
                                              fontSize: "13px",
                                              fontWeight: isSelected ? "700" : "500",
                                              backgroundColor: isSelected ? "var(--violet)" : "transparent",
                                              color: isSelected ? "#ffffff" : "var(--text-primary)",
                                              transition: "all 0.1s ease"
                                            }}
                                          >
                                            {hr}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div style={{ width: "1px", backgroundColor: "var(--border-color)" }}></div>

                                    {/* Minute Column */}
                                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", padding: "0 4px" }} className="time-scroll-col">
                                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map(min => {
                                        const isSelected = min === scheduledMinute;
                                        return (
                                          <div
                                            key={min}
                                            onClick={() => {
                                              setScheduledMinute(min);
                                              updateScheduledDateTime(scheduledDate, scheduledHour, min, scheduledPeriod);
                                            }}
                                            style={{
                                              padding: "6px",
                                              textAlign: "center",
                                              borderRadius: "8px",
                                              cursor: "pointer",
                                              fontSize: "13px",
                                              fontWeight: isSelected ? "700" : "500",
                                              backgroundColor: isSelected ? "var(--violet)" : "transparent",
                                              color: isSelected ? "#ffffff" : "var(--text-primary)",
                                              transition: "all 0.1s ease"
                                            }}
                                          >
                                            {min}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div style={{ width: "1px", backgroundColor: "var(--border-color)" }}></div>

                                    {/* Period Column */}
                                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "4px", justifyContent: "center" }}>
                                      {["AM", "PM"].map(p => {
                                        const isSelected = p === scheduledPeriod;
                                        return (
                                          <div
                                            key={p}
                                            onClick={() => {
                                              setScheduledPeriod(p);
                                              updateScheduledDateTime(scheduledDate, scheduledHour, scheduledMinute, p);
                                            }}
                                            style={{
                                              padding: "10px 6px",
                                              textAlign: "center",
                                              borderRadius: "8px",
                                              cursor: "pointer",
                                              fontSize: "13px",
                                              fontWeight: "700",
                                              backgroundColor: isSelected ? "var(--violet)" : "transparent",
                                              color: isSelected ? "#ffffff" : "var(--text-secondary)",
                                              transition: "all 0.15s ease"
                                            }}
                                          >
                                            {p}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setShowTimePicker(false)}
                                    style={{
                                      padding: "8px 12px",
                                      border: "1.5px solid var(--border-input)",
                                      borderRadius: "10px",
                                      background: "var(--bg-card)",
                                      color: "var(--text-primary)",
                                      fontSize: "13px",
                                      fontWeight: "700",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      textAlign: "center"
                                    }}
                                  >
                                    Select Time
                                  </button>
                                </div>
                              )}
                            </div>

                            <span className="info-text-sm" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "inline-block" }}>
                              Quiz will automatically publish at this date & time.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="quiz-bottom-actions-row">
                  <div className="quiz-status-summary">
                    <span className="status-dot" style={{ backgroundColor: isScheduled ? "var(--gold)" : "var(--text-muted)" }}></span>
                    <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-secondary)" }}>
                      {isScheduled
                        ? `Status: Scheduled for ${scheduledDateTime ? new Date(scheduledDateTime).toLocaleDateString('en-GB').split('/').join('-') + ', ' + new Date(scheduledDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : "..."}`
                        : `Status: Ready (${quizMeta.status})`
                      }
                    </span>
                  </div>
                  <div className="action-buttons-group">
                    <button
                      type="button"
                      className="btn-save-draft"
                      disabled={submitLoading}
                      onClick={() => handleUpdate("draft")}
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      className="btn-submit-publish"
                      disabled={submitLoading}
                      onClick={() => handleUpdate(isScheduled ? "schedule" : "publish")}
                    >
                      {submitLoading
                        ? "Updating..."
                        : isScheduled
                          ? "Schedule Update"
                          : "Publish Changes"
                      }
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditQuiz;