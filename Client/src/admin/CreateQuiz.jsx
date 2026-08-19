import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import DocxParser from "./components/DocxParser";
import MathRenderer from "../components/MathRenderer";
import "../css/admin/CreateQuiz.css";
import { saveSingleQuizModular } from "../utils/modularQuizApi";
import "../css/admin/AdminLayout.css";
import "../css/admin/CreateQuiz.css";
import PaidPlanDrawer from "./components/PaidPlanDrawer";

const emptyQuestion = () => ({
  questionEnglish: "",
  questionHindi: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  explanation: "",
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

function CreateQuiz() {
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
    enablePerQuestionTimer: false,
    timePerQuestion: 30,
    lockPreviousQuestions: false,
    publishAs: "exam",
    shuffleQuestions: false,
    shuffleOptions: false,
    randomSelection: false,
    questionsPerAttempt: 20,
    showResultAfterSubmission: true,
    showCorrectAnswers: true,
    showExplanations: true,
    showAnswerReview: true,
    practiceShowResultAfterSubmission: true,
    practiceShowCorrectAnswers: true,
    practiceShowExplanations: true,
    practiceShowAnswerReview: true,
    examSeriesId: "",
    isPracticePaid: false,
    practicePrice: 0,
    detailedDescription: "",
    plans: [],
    passPercentage: 50,
    resultReleaseMode: "immediate",
    resultReleaseDate: null,
    practiceResultReleaseMode: "immediate",
    practiceResultReleaseDate: null,
  });

  const [seriesList, setSeriesList] = useState([]);

  const [presetSelected, setPresetSelected] = useState("Custom");
  const [presets, setPresets] = useState([]);
  const [includeNegative, setIncludeNegative] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
  const [editingPlanIndex, setEditingPlanIndex] = useState(-1);

  const handleSavePlan = (planData) => {
    setQuizMeta(prev => {
      let updatedPlans = [...(prev.plans || [])];
      if (editingPlanIndex >= 0) {
        // Editing single plan
        updatedPlans[editingPlanIndex] = planData;
      } else if (Array.isArray(planData)) {
        // Creating multiple plans
        updatedPlans = planData;
      } else {
        updatedPlans.push(planData);
      }
      return { ...prev, plans: updatedPlans };
    });
    setIsPlanDrawerOpen(false);
    setEditingPlanIndex(-1);
  };

  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [expandedQuestions, setExpandedQuestions] = useState({ 0: true });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [quizConfigCollapsed, setQuizConfigCollapsed] = useState(false);
  const [questionsCollapsed, setQuestionsCollapsed] = useState(false);
  const [resultSettingsCollapsed, setResultSettingsCollapsed] = useState(false);

  const [durationMin, setDurationMin] = useState("");
  const [durationSec, setDurationSec] = useState("");

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledHour, setScheduledHour] = useState("12");
  const [scheduledMinute, setScheduledMinute] = useState("00");
  const [scheduledPeriod, setScheduledPeriod] = useState("AM");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Result Release Date/Time pickers states
  const [resultReleaseDateOnly, setResultReleaseDateOnly] = useState("");
  const [resultReleaseHour, setResultReleaseHour] = useState("12");
  const [resultReleaseMinute, setResultReleaseMinute] = useState("00");
  const [resultReleasePeriod, setResultReleasePeriod] = useState("AM");
  const [showResultReleaseDatePicker, setShowResultReleaseDatePicker] = useState(false);
  const [showResultReleaseTimePicker, setShowResultReleaseTimePicker] = useState(false);
  const [resultCalendarMonth, setResultCalendarMonth] = useState(new Date().getMonth());
  const [resultCalendarYear, setResultCalendarYear] = useState(new Date().getFullYear());

  // Practice Result Release Date/Time pickers states
  const [practiceResultReleaseDateOnly, setPracticeResultReleaseDateOnly] = useState("");
  const [practiceResultReleaseHour, setPracticeResultReleaseHour] = useState("12");
  const [practiceResultReleaseMinute, setPracticeResultReleaseMinute] = useState("00");
  const [practiceResultReleasePeriod, setPracticeResultReleasePeriod] = useState("AM");
  const [showPracticeResultReleaseDatePicker, setShowPracticeResultReleaseDatePicker] = useState(false);
  const [showPracticeResultReleaseTimePicker, setShowPracticeResultReleaseTimePicker] = useState(false);
  const [practiceCalendarMonth, setPracticeCalendarMonth] = useState(new Date().getMonth());
  const [practiceCalendarYear, setPracticeCalendarYear] = useState(new Date().getFullYear());

  const parseDateTimeToCustom = (dateTimeString) => {
    if (!dateTimeString) return { date: "", hour: "12", minute: "00", period: "AM" };
    const dateObj = new Date(dateTimeString);
    if (isNaN(dateObj.getTime())) return { date: "", hour: "12", minute: "00", period: "AM" };
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    let hr24 = dateObj.getHours();
    const minStr = String(dateObj.getMinutes()).padStart(2, "0");
    let periodStr = "AM";
    let hr12 = hr24;
    if (hr24 >= 12) {
      periodStr = "PM";
      if (hr24 > 12) hr12 = hr24 - 12;
    }
    if (hr12 === 0) hr12 = 12;
    const hrStr = String(hr12).padStart(2, "0");
    return { date: dateStr, hour: hrStr, minute: minStr, period: periodStr };
  };

  const generateCustomCalendarDays = (year, month) => {
    const days = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, month: prevMonth, year: prevMonthYear, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: month, year: year, isCurrentMonth: true });
    }
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ day: i, month: nextMonth, year: nextMonthYear, isCurrentMonth: false });
    }
    return days;
  };

  const updateResultReleaseDateTime = (dateVal, hrVal, minVal, periodVal) => {
    if (!dateVal) {
      setQuizMeta(prev => ({ ...prev, resultReleaseDate: null }));
      return;
    }
    let hr24 = parseInt(hrVal, 10);
    if (periodVal === "PM" && hr24 < 12) hr24 += 12;
    if (periodVal === "AM" && hr24 === 12) hr24 = 0;
    const hr24Str = String(hr24).padStart(2, "0");
    setQuizMeta(prev => ({ ...prev, resultReleaseDate: `${dateVal}T${hr24Str}:${minVal}` }));
  };

  const updatePracticeResultReleaseDateTime = (dateVal, hrVal, minVal, periodVal) => {
    if (!dateVal) {
      setQuizMeta(prev => ({ ...prev, practiceResultReleaseDate: null }));
      return;
    }
    let hr24 = parseInt(hrVal, 10);
    if (periodVal === "PM" && hr24 < 12) hr24 += 12;
    if (periodVal === "AM" && hr24 === 12) hr24 = 0;
    const hr24Str = String(hr24).padStart(2, "0");
    setQuizMeta(prev => ({ ...prev, practiceResultReleaseDate: `${dateVal}T${hr24Str}:${minVal}` }));
  };

  React.useEffect(() => {
    fetchPresets();
    fetchSeries();
  }, []);

  const fetchSeries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-series`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setSeriesList(res.data);
    } catch (err) {
      console.error("Error fetching series list:", err);
    }
  };

  const handleCreateNewSeriesShortcut = async () => {
    const title = window.prompt("Enter new Exam Series Title (e.g. UPTET):");
    if (!title || !title.trim()) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/exam-series`, {
        title: title.trim(),
        category: "General"
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("✅ Exam Series created successfully!");
      await fetchSeries();
      setQuizMeta(prev => ({ ...prev, examSeriesId: res.data._id }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create Exam Series.");
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/presets`);
      setPresets(res.data);
    } catch (err) {
      console.error("Error fetching presets:", err);
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const generateCalendarDays = () => {
    const days = [];
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();

    const prevMonthYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, month: prevMonth, year: prevMonthYear, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: calendarMonth, year: calendarYear, isCurrentMonth: true });
    }

    const nextMonthYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
    const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ day: i, month: nextMonth, year: nextMonthYear, isCurrentMonth: false });
    }

    return days;
  };

  const updateScheduledDateTime = (dateVal, hrVal, minVal, periodVal) => {
    if (!dateVal) return;
    let hr24 = parseInt(hrVal, 10);
    if (periodVal === "PM" && hr24 < 12) hr24 += 12;
    if (periodVal === "AM" && hr24 === 12) hr24 = 0;
    const hr24Str = String(hr24).padStart(2, "0");
    setScheduledDateTime(`${dateVal}T${hr24Str}:${minVal}`);
  };

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

  const handleMetaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizMeta((prev) => {
      const updated = { ...prev, [name]: type === "checkbox" ? checked : value };
      if (["duration", "marksPerQuestion", "negativeMarking", "examName"].includes(name)) {
        setPresetSelected("Custom");
      }
      return updated;
    });
  };

  const handlePresetChange = async (e) => {
    const presetId = e.target.value;
    setPresetSelected(presetId);

    if (presetId === "Custom") {
      setQuizMeta((prev) => ({ ...prev, examName: "", examSeriesId: "", duration: "", marksPerQuestion: 1, negativeMarking: 0 }));
      setDurationMin("");
      setDurationSec("");
      setIncludeNegative(false);
      return;
    }

    const selected = presets.find(p => p._id === presetId);
    if (selected) {
      // Find or create an Exam Series matching the preset's examName
      let matchingSeriesId = "";
      if (selected.examName) {
        const slug = selected.examName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const matched = seriesList.find(s => s.slug === slug || s.title?.toLowerCase() === selected.examName.toLowerCase());
        if (matched) {
          matchingSeriesId = matched._id;
        } else {
          try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/exam-series`, {
              title: selected.examName,
              category: "General"
            }, {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            matchingSeriesId = res.data._id;
            // Refresh seriesList locally
            setSeriesList(prev => [...prev, res.data]);
          } catch (err) {
            console.error("Error auto-creating series for preset:", err);
          }
        }
      }

      setQuizMeta((prev) => ({
        ...prev,
        examName: selected.examName,
        examSeriesId: matchingSeriesId,
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
        negativeMarking: quizMeta.negativeMarking,
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

  const handleQuestionsLoaded = (parsedSections) => {
    let flatQuestions = [];
    if (parsedSections && parsedSections.length > 0) {
      parsedSections.forEach(sec => {
        if (sec.questions) {
          const qsWithSection = sec.questions.map(q => ({ ...q, sectionName: sec.sectionTitle }));
          flatQuestions = flatQuestions.concat(qsWithSection);
        }
      });
    }

    const mapped = flatQuestions.map((q) => {
      let correctIdx = -1;
      if (q.correctAnswer === "A") correctIdx = 0;
      else if (q.correctAnswer === "B") correctIdx = 1;
      else if (q.correctAnswer === "C") correctIdx = 2;
      else if (q.correctAnswer === "D") correctIdx = 3;

      const optionsMapped = q.options.map(opt => {
        if (typeof opt === "object") {
          if (opt.english && opt.hindi) return `${opt.english} / ${opt.hindi}`;
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
        explanation: q.explanation || "",
        explanations: q.explanations || {
          correct: q.explanation || "",
          incorrect: {},
          conceptSummary: "",
          didYouKnow: ""
        },
        sectionName: q.sectionName,
      };
    });

    setQuestions(prev => {
      const isFirstEmpty = prev.length === 1 && 
                           !prev[0].questionEnglish.trim() && 
                           !prev[0].questionHindi.trim();
      const existingQs = isFirstEmpty ? [] : prev;
      return [...existingQs, ...mapped];
    });
    setExpandedQuestions({ 0: true });
    setMessage({
      text: `✅ ${mapped.length} questions imported from Word file. Review and submit below.`,
      type: "status-success",
    });
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
      updated[qIndex] = { ...updated[qIndex], options: newOptions, correctAnswer: newCorrectVal };
      return updated;
    });
  };

  const selectCorrectOption = (qIndex, optIndex) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const optVal = updated[qIndex].options[optIndex];
      updated[qIndex] = { ...updated[qIndex], correctOptionIndex: optIndex, correctAnswer: optVal };
      return updated;
    });
  };

  const addOptionToQuestion = (qIndex) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[qIndex].options.length < 6) {
        const newOptions = [...updated[qIndex].options, ""];
        updated[qIndex] = { ...updated[qIndex], options: newOptions };
      }
      return updated;
    });
  };

  const removeOptionFromQuestion = (qIndex) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[qIndex].options.length > 2) {
        const newOptions = [...updated[qIndex].options];
        const lastIndex = newOptions.length - 1;
        let newCorrectOptionIndex = updated[qIndex].correctOptionIndex;
        let newCorrectAnswer = updated[qIndex].correctAnswer;
        if (newCorrectOptionIndex === lastIndex) {
          newCorrectOptionIndex = -1;
          newCorrectAnswer = "";
        }
        newOptions.pop();
        updated[qIndex] = { 
          ...updated[qIndex], 
          options: newOptions, 
          correctOptionIndex: newCorrectOptionIndex, 
          correctAnswer: newCorrectAnswer 
        };
      }
      return updated;
    });
  };

  const toggleQuestionExpand = (index) => {
    setExpandedQuestions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setExpandedQuestions((prev) => ({ ...prev, [questions.length]: true }));
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setExpandedQuestions((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const keyVal = parseInt(k, 10);
        if (keyVal < index) next[keyVal] = prev[keyVal];
        else if (keyVal > index) next[keyVal - 1] = prev[keyVal];
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

  const validateForm = (isDraft = false) => {
    if (isDraft) {
      if (!quizMeta.subject || !quizMeta.title) {
        setMessage({ text: "Please fill in Subject and Title to save a draft.", type: "status-error" });
        return false;
      }
      return true;
    }
    if (!quizMeta.examName || !quizMeta.subject || !quizMeta.title || !quizMeta.duration) {
      setMessage({ text: "Please fill in Exam, Subject, Title, and Duration.", type: "status-error" });
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
      if (!q.options || q.options.length < 2 || q.options.length > 6) {
        setMessage({ text: `Question ${i + 1}: Must have between 2 and 6 options.`, type: "status-error" });
        return false;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j] || !String(q.options[j]).trim()) {
          const letter = String.fromCharCode(65 + j);
          setMessage({ text: `Question ${i + 1}, Option ${letter}: Option text cannot be blank.`, type: "status-error" });
          return false;
        }
      }
      if (q.correctOptionIndex === -1 || !q.correctAnswer) {
        setMessage({ text: `Question ${i + 1}: Please select a correct answer.`, type: "status-error" });
        return false;
      }
    }
    return true;
  };

  // ✅ FIXED: single clean handleSubmit — no duplicate scheduledDateVal
  const handleSubmit = async (submitType) => {
    setMessage({ text: "", type: "" });
    const isDraft = submitType === "draft";
    if (!validateForm(isDraft)) return;

    setLoading(true);
    try {
      if (quizMeta.quizType === "practice") {
        const payload = {
          title: quizMeta.title,
          subject: quizMeta.subject || quizMeta.examName || "General",
          description: quizMeta.description,
          questions: questions.map(q => ({
            questionEnglish: q.questionEnglish,
            questionHindi: q.questionHindi,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || "",
            explanations: q.explanations
              ? { ...q.explanations, correct: q.explanation || "" }
              : {
                  correct: q.explanation || "",
                  incorrect: {},
                  conceptSummary: "",
                  didYouKnow: ""
                }
          })),
          status: submitType === "publish" ? "Published" : "Draft"
        };
        await axios.post(`${import.meta.env.VITE_API_URL}/api/practice`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        
        setMessage({
          text: `✅ Practice Quiz successfully saved as ${submitType === "publish" ? "Published" : "Draft"}!`,
          type: "status-success",
        });
        setTimeout(() => navigate("/admin/practice"), 1200);
      } else {
        const isPublishing = submitType === "publish";
        const scheduledDateVal = submitType === "schedule" ? new Date(scheduledDateTime) : null;

        await saveSingleQuizModular({
          quizMeta: {
            ...quizMeta,
            status:
              submitType === "publish"
                ? "Published"
                : submitType === "schedule"
                ? "Scheduled"
                : "Draft",
          },
          questions,
          isPublishing,
          scheduledDate: scheduledDateVal,
        });

        setMessage({
          text: `✅ Quiz successfully saved as ${
            submitType === "publish" ? "Published" : submitType === "schedule" ? "Scheduled" : "Draft"
          }!`,
          type: "status-success",
        });
        setTimeout(() => navigate("/admin/manage-quizzes"), 1200);
      }
    } catch (error) {
      console.error("Create Quiz Error:", error);
      setMessage({
        text: error.response?.data?.message || "Failed to create quiz. Please try again.",
        type: "status-error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Create Quiz" />

        <div className="admin-content">
          <div className="create-quiz-page">

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", background: "var(--bg-input)", padding: "4px", borderRadius: "12px", border: "1.5px solid var(--border-input)" }}>
                <button
                  onClick={() => navigate('/admin/create-quiz')}
                  style={{ padding: "8px 24px", borderRadius: "8px", background: "var(--primary-color, #6E3FF3)", color: "#fff", fontWeight: "600", border: "none", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Single Quiz
                </button>
                <button
                  onClick={() => navigate('/admin/create-quiz-multi')}
                  style={{ padding: "8px 24px", borderRadius: "8px", background: "transparent", color: "var(--text-muted)", fontWeight: "600", border: "none", cursor: "pointer", transition: "all 0.2s" }}
                >
                  Multi-Section
                </button>
              </div>
            </div>

            {message.text && (
              <p className={`admin-status-message ${message.type}`}>{message.text}</p>
            )}

            <div className="quiz-two-column-layout">
              {/* ── LEFT PANEL ── */}
              <div className="quiz-left-panel">


                {/* Preset Selector */}
                <div className="form-card compact-card">
                  <h3 className="form-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    Exam Template Preset
                    {presetSelected !== "Custom" && (
                      <button
                        onClick={(e) => { e.preventDefault(); handleDeletePreset(presetSelected); }}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "14px", padding: 0 }}
                        title="Delete Preset"
                      >🗑️</button>
                    )}
                  </h3>
                  <div className="form-field">
                    <select value={presetSelected} onChange={handlePresetChange} className="preset-select">
                      <option value="Custom">Custom Settings</option>
                      {presets.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.presetName} ({p.duration}m, +{p.marksPerQuestion}/-{p.negativeMarking})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quiz Configuration */}
                <div className="form-card">
                  <div
                    className="form-card-title"
                    onClick={() => setQuizConfigCollapsed(!quizConfigCollapsed)}
                    style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: quizConfigCollapsed ? "none" : "1px solid var(--border-color)", paddingBottom: quizConfigCollapsed ? "0" : "10px" }}
                  >
                    <span>Quiz Configuration</span>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSavePreset(); }}
                        className="dashboard-view-all-btn"
                        style={{ padding: "4px 8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", background: "rgba(110, 63, 243, 0.1)", color: "#6E3FF3", border: "1px solid rgba(110, 63, 243, 0.2)" }}
                      >
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
                        <label>Exam</label>
                        <input 
                          type="text" 
                          name="examName" 
                          value={quizMeta.examName || ""} 
                          onChange={handleMetaChange} 
                          placeholder="e.g. UPTET / CTET / BPSC" 
                          required 
                        />
                      </div>
                      <div className="form-field">
                        <label>Subject</label>
                        <input type="text" name="subject" value={quizMeta.subject} onChange={handleMetaChange} placeholder="e.g. Physics / Chemistry / Math" required />
                      </div>
                      <div className="form-field">
                        <label>Quiz Title</label>
                        <input type="text" name="title" value={quizMeta.title} onChange={handleMetaChange} placeholder="e.g. Chapter 3 Practice Test" required />
                      </div>
                      <div className="form-field">
                        <label>Description (Optional)</label>
                        <textarea name="description" value={quizMeta.description} onChange={handleMetaChange} placeholder="Enter brief description of this quiz" rows={2} />
                      </div>
                      <div className="form-field">
                        <label>Create As</label>
                        <select
                          name="publishAs"
                          value={quizMeta.publishAs || "exam"}
                          onChange={handleMetaChange}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-panel)", color: "var(--text-primary)" }}
                        >
                          <option value="exam">Exam Only</option>
                          <option value="practice">Practice Only</option>
                          <option value="both">Both Exam & Practice</option>
                        </select>
                      </div>
                      <div className="form-field">
                        <label>Duration</label>
                        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                            <input type="number" value={durationMin} onChange={handleDurationMinChange} placeholder="Minutes" min="0" required />
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>min</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                            <input type="number" value={durationSec} onChange={handleDurationSecChange} placeholder="Seconds" min="0" max="59" required />
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>sec</span>
                          </div>
                        </div>
                      </div>
                      <div className="form-field">
                        <label>Marks Per Question</label>
                        <input type="number" name="marksPerQuestion" value={quizMeta.marksPerQuestion} onChange={handleMetaChange} min="1" step="1" />
                      </div>
                      <div className="form-field toggle-negative-field">
                        <label className="checkbox-toggle-label">
                          <input
                            type="checkbox"
                            checked={includeNegative}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setIncludeNegative(checked);
                              setPresetSelected("Custom");
                              if (!checked) setQuizMeta(prev => ({ ...prev, negativeMarking: 0 }));
                            }}
                          />
                          <span>Enable Negative Marking</span>
                        </label>
                        {includeNegative && (
                          <div className="negative-marking-input-wrapper" style={{ marginTop: "10px" }}>
                            <label style={{ fontSize: "10.5px" }}>Negative Marks (-value)</label>
                            <input type="number" name="negativeMarking" value={quizMeta.negativeMarking} onChange={handleMetaChange} min="0" step="0.25" placeholder="e.g. 1" />
                          </div>
                        )}
                      </div>
                      <div className="form-field toggle-negative-field">
                        <label className="checkbox-toggle-label">
                          <input
                            type="checkbox"
                            checked={quizMeta.enablePerQuestionTimer}
                            onChange={(e) => setQuizMeta(prev => ({ ...prev, enablePerQuestionTimer: e.target.checked }))}
                          />
                          <span>Enable Per Question Timer</span>
                        </label>
                        {quizMeta.enablePerQuestionTimer && (
                          <div className="negative-marking-input-wrapper" style={{ marginTop: "10px" }}>
                            <label style={{ fontSize: "10.5px" }}>Time Per Question (Seconds)</label>
                            <input type="number" name="timePerQuestion" value={quizMeta.timePerQuestion} onChange={handleMetaChange} min="1" step="1" />
                          </div>
                        )}
                      </div>
                      <div className="form-field toggle-negative-field">
                        <label className="checkbox-toggle-label">
                          <input
                            type="checkbox"
                            checked={quizMeta.lockPreviousQuestions}
                            onChange={(e) => setQuizMeta(prev => ({ ...prev, lockPreviousQuestions: e.target.checked }))}
                          />
                          <span>Lock Previous Questions</span>
                        </label>
                      </div>

                      <div className="form-field" style={{ marginTop: "10px" }}>
                        <label style={{ fontSize: "12px", display: "block", marginBottom: "4px", fontWeight: "600" }}>Passing Percentage (%)</label>
                        <input
                          type="number"
                          name="passPercentage"
                          value={quizMeta.passPercentage}
                          onChange={handleMetaChange}
                          min="0"
                          max="100"
                          placeholder="50"
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                        />
                      </div>
                      {quizMeta.publishAs !== "practice" && (
                        <div className="form-field toggle-negative-field">
                          <label className="checkbox-toggle-label">
                            <input
                              type="checkbox"
                              checked={quizMeta.isPaid || false}
                              onChange={(e) => setQuizMeta(prev => ({ ...prev, isPaid: e.target.checked }))}
                            />
                            <span>Paid Exam</span>
                          </label>
                        </div>
                      )}

                      {quizMeta.publishAs !== "exam" && (
                        <div className="form-field toggle-negative-field">
                          <label className="checkbox-toggle-label">
                            <input
                              type="checkbox"
                              checked={quizMeta.isPracticePaid || false}
                              onChange={(e) => setQuizMeta(prev => ({ ...prev, isPracticePaid: e.target.checked }))}
                            />
                            <span>Paid Practice Module</span>
                          </label>
                        </div>
                      )}

                        {/* Detailed Overview & Subscriptions Block */}
                        {quizMeta.isPaid && (
                          <div style={{ gridColumn: "1 / -1", marginTop: "20px", padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                            <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "700", color: "var(--violet)" }}>Overview & Plans</h4>
                            
                            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                              {/* Left Column: Description */}
                              <div className="form-field" style={{ flex: 1, margin: 0 }}>
                                <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>Detailed Description (Overview tab markdown details)</label>
                                <textarea 
                                  name="detailedDescription" 
                                  value={quizMeta.detailedDescription || ""} 
                                  onChange={handleMetaChange} 
                                  placeholder="Describe exam features, launch offers, and terms..." 
                                  rows={6}
                                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-panel)", color: "var(--text-primary)", boxSizing: "border-box" }}
                                />
                              </div>

                              {/* Right Column: Plans */}
                              <div className="form-field" style={{ flex: 1, margin: 0 }}>
                                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                                  <span>Subscription Duration Plans</span>
                                  <button 
                                    type="button"
                                    className="dashboard-view-all-btn"
                                    style={{ padding: "4px 8px", fontSize: "11px" }}
                                    onClick={() => {
                                      setEditingPlanIndex(-1);
                                      setIsPlanDrawerOpen(true);
                                    }}
                                  >
                                    ＋ Add Plan
                                  </button>
                                </label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "155px", overflowY: "auto", paddingRight: "4px" }}>
                                  {(quizMeta.plans || []).map((plan, index) => (
                                    <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-main)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)", fontSize: "13px" }}>
                                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditingPlanIndex(index); setIsPlanDrawerOpen(true); }}>
                                        <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{plan.planName || `${plan.durationMonths} Month${plan.durationMonths > 1 ? 's' : ''} Plan`}</div>
                                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                                          {plan.originalPrice > 0 ? <span style={{ textDecoration: "line-through", marginRight: "6px" }}>₹{plan.originalPrice}</span> : null}
                                          <strong style={{ color: "var(--violet)" }}>₹{plan.price}</strong>
                                          {plan.discountLabel && <span style={{ color: "var(--green)", marginLeft: "8px", fontWeight: "600" }}>({plan.discountLabel})</span>}
                                          <span style={{ marginLeft: "8px", padding: "1px 4px", borderRadius: "4px", background: plan.isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(107, 114, 128, 0.1)", color: plan.isActive ? "#10B981" : "#6B7280", fontSize: "9px" }}>
                                            {plan.isActive ? "Active" : "Inactive"}
                                          </span>
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", gap: "10px" }}>
                                        <button
                                          type="button"
                                          style={{ background: "transparent", border: "none", color: "var(--violet)", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                                          onClick={() => {
                                            setEditingPlanIndex(index);
                                            setIsPlanDrawerOpen(true);
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }}
                                          onClick={() => {
                                            const updated = [...quizMeta.plans];
                                            updated.splice(index, 1);
                                            setQuizMeta(prev => ({ ...prev, plans: updated }));
                                          }}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {(!quizMeta.plans || quizMeta.plans.length === 0) && (
                                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>No plans added. Defaulting to standard test price ({quizMeta.price ? `₹${quizMeta.price}` : 'Free'}).</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                     </div>
                  )}

                  <div className="form-field" style={{ marginTop: "16px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px", display: "block" }}>
                      Learning Settings
                    </label>
                    <div style={{ background: "var(--bg-panel)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontSize: '13.5px', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                          type="checkbox"
                          name="shuffleQuestions"
                          checked={quizMeta.shuffleQuestions}
                          onChange={(e) => setQuizMeta({ ...quizMeta, shuffleQuestions: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#8B5CF6' }}
                        />
                        Shuffle Questions
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontSize: '13.5px', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                          type="checkbox"
                          name="shuffleOptions"
                          checked={quizMeta.shuffleOptions}
                          onChange={(e) => setQuizMeta({ ...quizMeta, shuffleOptions: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#8B5CF6' }}
                        />
                        Shuffle Options
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', fontSize: '13.5px', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                          type="checkbox"
                          name="randomSelection"
                          checked={quizMeta.randomSelection}
                          onChange={(e) => setQuizMeta({ ...quizMeta, randomSelection: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#8B5CF6' }}
                        />
                        Random Question Selection (Optional)
                      </label>

                      {quizMeta.randomSelection && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                          <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500' }}>Questions per Attempt:</label>
                          <input 
                            type="number"
                            min="1"
                            value={quizMeta.questionsPerAttempt}
                            onChange={(e) => setQuizMeta({ ...quizMeta, questionsPerAttempt: parseInt(e.target.value, 10) || 20 })}
                            style={{ width: '70px', height: '36px', borderRadius: '8px', border: '1.5px solid var(--border-color)', padding: '0 8px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)', textAlign: 'center' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── RIGHT PANEL ── */}
              <div className="admin-quiz-right-panel">

                {/* DocxParser */}
                <div className="form-card compact-card">
                  <DocxParser onQuestionsLoaded={handleQuestionsLoaded} />
                </div>

                {/* Schedule Card */}
                <div className="form-card compact-card">
                  <h3 className="form-card-title">Publication Schedule</h3>
                  <div className="form-field">
                    <label className="checkbox-toggle-label">
                      <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} />
                      <span>Schedule for Later</span>
                    </label>

                    {isScheduled && (
                      <div className="scheduled-datetime-wrapper" style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>

                        {/* Date Picker */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                          <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-secondary)" }}>Publish Date</label>
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            style={{ background: "var(--bg-input)", border: "1.5px solid var(--border-input)", borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}
                          >
                            <span>{scheduledDate ? formatDateDisplay(scheduledDate) : "Select Date"}</span>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>📅</span>
                          </button>

                          {showDatePicker && (
                            <div style={{ position: "absolute", top: "105%", left: 0, zIndex: 1000, backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", width: "260px", boxSizing: "border-box" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <button type="button" onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else { setCalendarMonth(calendarMonth - 1); } }} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", cursor: "pointer", padding: "4px 8px", fontWeight: "bold" }}>&lt;</button>
                                <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>
                                  {["January","February","March","April","May","June","July","August","September","October","November","December"][calendarMonth]} {calendarYear}
                                </span>
                                <button type="button" onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else { setCalendarMonth(calendarMonth + 1); } }} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", cursor: "pointer", padding: "4px 8px", fontWeight: "bold" }}>&gt;</button>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
                                {["S","M","T","W","T","F","S"].map((d, idx) => (
                                  <span key={idx} style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)" }}>{d}</span>
                                ))}
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                                {generateCalendarDays().map((cell, idx) => {
                                  const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                                  const isSelected = cellDateStr === scheduledDate;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => { setScheduledDate(cellDateStr); updateScheduledDateTime(cellDateStr, scheduledHour, scheduledMinute, scheduledPeriod); setShowDatePicker(false); }}
                                      style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "28px", fontSize: "12px", fontWeight: isSelected ? "700" : "500", borderRadius: "50%", cursor: "pointer", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : cell.isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)", border: isSelected ? "2px solid rgba(110,63,243,0.2)" : "none", boxSizing: "border-box" }}
                                    >
                                      {cell.day}
                                    </div>
                                  );
                                })}
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px solid var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>
                                <button type="button" onClick={() => { setScheduledDate(""); setScheduledDateTime(""); setShowDatePicker(false); }} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Clear</button>
                                <button type="button" onClick={() => { const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth()+1).padStart(2,"0"); const dd = String(today.getDate()).padStart(2,"0"); const todayStr = `${yyyy}-${mm}-${dd}`; setScheduledDate(todayStr); setCalendarMonth(today.getMonth()); setCalendarYear(today.getFullYear()); updateScheduledDateTime(todayStr, scheduledHour, scheduledMinute, scheduledPeriod); setShowDatePicker(false); }} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Today</button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Time Picker */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                          <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-secondary)" }}>Publish Time</label>
                          <button
                            type="button"
                            onClick={() => setShowTimePicker(!showTimePicker)}
                            style={{ background: "var(--bg-input)", border: "1.5px solid var(--border-input)", borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}
                          >
                            <span>{`${scheduledHour}:${scheduledMinute} ${scheduledPeriod}`}</span>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>🕒</span>
                          </button>

                          {showTimePicker && (
                            <div style={{ position: "absolute", top: "105%", right: 0, zIndex: 1000, backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "16px", display: "flex", flexDirection: "column", gap: "14px", width: "240px" }}>
                              <div style={{ display: "flex", height: "180px", borderBottom: "1.5px solid var(--border-color)", paddingBottom: "12px" }}>

                                {/* Hours */}
                                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }} className="time-scroll-col">
                                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map(hr => {
                                    const isSelected = hr === scheduledHour;
                                    return (
                                      <div key={hr} onClick={() => { setScheduledHour(hr); updateScheduledDateTime(scheduledDate, hr, scheduledMinute, scheduledPeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-primary)", transition: "all 0.1s ease" }}>
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
                                      <div key={min} onClick={() => { setScheduledMinute(min); updateScheduledDateTime(scheduledDate, scheduledHour, min, scheduledPeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-primary)", transition: "all 0.1s ease" }}>
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
                                      <div key={p} onClick={() => { setScheduledPeriod(p); updateScheduledDateTime(scheduledDate, scheduledHour, scheduledMinute, p); }} style={{ padding: "10px 6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-secondary)", transition: "all 0.1s ease" }}>
                                        {p}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <button type="button" onClick={() => setShowTimePicker(false)} style={{ padding: "8px 12px", border: "1.5px solid var(--border-input)", borderRadius: "10px", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "13px", fontWeight: "700", cursor: "pointer", textAlign: "center" }}>
                                Select Time
                              </button>
                            </div>
                          )}
                        </div>

                        <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "inline-block" }}>
                          Quiz will automatically publish at this date & time.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Result Settings Card */}
                <div className="form-card compact-card" style={{ marginTop: "24px" }}>
                  <div 
                    onClick={() => setResultSettingsCollapsed(!resultSettingsCollapsed)}
                    style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: resultSettingsCollapsed ? "none" : "1px solid var(--border-color)", paddingBottom: resultSettingsCollapsed ? "0" : "10px", marginBottom: resultSettingsCollapsed ? "0" : "16px" }}
                  >
                    <h3 className="form-card-title" style={{ margin: 0, border: "none", padding: 0 }}>Result Settings</h3>
                    <span style={{ color: "var(--violet)", fontSize: "12px", fontWeight: "600" }}>
                      {resultSettingsCollapsed ? "＋ Expand" : "－ Collapse"}
                    </span>
                  </div>
                  
                  {!resultSettingsCollapsed && (
                    <>
                      {/* EXAM SETTINGS: Visible if publishAs is 'exam' or 'both' */}
                      {(quizMeta.publishAs === "exam" || quizMeta.publishAs === "both") && (
                        <div style={{ marginBottom: quizMeta.publishAs === "both" ? "32px" : 0 }}>
                          {quizMeta.publishAs === "both" && (
                            <h4 style={{ fontSize: "12px", color: "var(--violet)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", fontWeight: "700" }}>
                              Exam Mode Settings
                            </h4>
                          )}
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "-6px 0 16px 0", lineHeight: "1.4" }}>
                            Configure what students can see after submitting the **Exam** version.
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Result Release Mode Selector */}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: "12px", display: "block", marginBottom: "6px", fontWeight: "600", color: "var(--text-secondary)" }}>
                                Result Release Mode
                              </label>
                              <select
                                value={quizMeta.resultReleaseMode || "immediate"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuizMeta({
                                    ...quizMeta,
                                    resultReleaseMode: val,
                                    showResultAfterSubmission: val === "immediate",
                                    showCorrectAnswers: val === "immediate",
                                    showExplanations: val === "immediate",
                                    showAnswerReview: val === "immediate",
                                  });
                                }}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", outline: "none" }}
                              >
                                <option value="immediate">Show Immediately after Submission</option>
                                <option value="scheduled">Release on Scheduled Date & Time</option>
                                <option value="manual">Hide (Manual Release by Admin)</option>
                              </select>
                            </div>

                             {/* Scheduled Date Time Picker */}
                             {quizMeta.resultReleaseMode === "scheduled" && (
                               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px", marginBottom: "16px" }}>
                                 
                                 {/* Custom Date Picker */}
                                 <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                                   <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-secondary)" }}>Release Date</label>
                                   <button
                                     type="button"
                                     onClick={() => setShowResultReleaseDatePicker(!showResultReleaseDatePicker)}
                                     style={{ background: "var(--bg-input)", border: "1.5px solid var(--border-input)", borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}
                                   >
                                     <span>{resultReleaseDateOnly ? formatDateDisplay(resultReleaseDateOnly) : "Select Date"}</span>
                                     <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>📅</span>
                                   </button>

                                   {showResultReleaseDatePicker && (
                                     <div style={{ position: "absolute", top: "105%", left: 0, zIndex: 1000, backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", width: "260px", boxSizing: "border-box" }}>
                                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                         <button type="button" onClick={() => { if (resultCalendarMonth === 0) { setResultCalendarMonth(11); setResultCalendarYear(resultCalendarYear - 1); } else { setResultCalendarMonth(resultCalendarMonth - 1); } }} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", cursor: "pointer", padding: "4px 8px", fontWeight: "bold" }}>&lt;</button>
                                         <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>
                                           {["January","February","March","April","May","June","July","August","September","October","November","December"][resultCalendarMonth]} {resultCalendarYear}
                                         </span>
                                         <button type="button" onClick={() => { if (resultCalendarMonth === 11) { setResultCalendarMonth(0); setResultCalendarYear(resultCalendarYear + 1); } else { setResultCalendarMonth(resultCalendarMonth + 1); } }} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", cursor: "pointer", padding: "4px 8px", fontWeight: "bold" }}>&gt;</button>
                                       </div>

                                       <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
                                         {["S","M","T","W","T","F","S"].map((d, idx) => (
                                           <span key={idx} style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)" }}>{d}</span>
                                         ))}
                                       </div>

                                       <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                                         {generateCustomCalendarDays(resultCalendarYear, resultCalendarMonth).map((cell, idx) => {
                                           const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                                           const isSelected = cellDateStr === resultReleaseDateOnly;
                                           return (
                                             <div
                                               key={idx}
                                               onClick={() => { setResultReleaseDateOnly(cellDateStr); updateResultReleaseDateTime(cellDateStr, resultReleaseHour, resultReleaseMinute, resultReleasePeriod); setShowResultReleaseDatePicker(false); }}
                                               style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "28px", fontSize: "12px", fontWeight: isSelected ? "700" : "500", borderRadius: "50%", cursor: "pointer", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : cell.isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)", border: isSelected ? "2px solid rgba(110,63,243,0.2)" : "none", boxSizing: "border-box" }}
                                             >
                                               {cell.day}
                                             </div>
                                           );
                                         })}
                                       </div>

                                       <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px solid var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>
                                         <button type="button" onClick={() => { setResultReleaseDateOnly(""); updateResultReleaseDateTime("", resultReleaseHour, resultReleaseMinute, resultReleasePeriod); setShowResultReleaseDatePicker(false); }} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Clear</button>
                                         <button type="button" onClick={() => { const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth()+1).padStart(2,"0"); const dd = String(today.getDate()).padStart(2,"0"); const todayStr = `${yyyy}-${mm}-${dd}`; setResultReleaseDateOnly(todayStr); setResultCalendarMonth(today.getMonth()); setResultCalendarYear(today.getFullYear()); updateResultReleaseDateTime(todayStr, resultReleaseHour, resultReleaseMinute, resultReleasePeriod); setShowResultReleaseDatePicker(false); }} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Today</button>
                                       </div>
                                     </div>
                                   )}
                                 </div>

                                 {/* Custom Time Picker */}
                                 <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                                   <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-secondary)" }}>Release Time</label>
                                   <button
                                     type="button"
                                     onClick={() => setShowResultReleaseTimePicker(!showResultReleaseTimePicker)}
                                     style={{ background: "var(--bg-input)", border: "1.5px solid var(--border-input)", borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}
                                   >
                                     <span>{`${resultReleaseHour}:${resultReleaseMinute} ${resultReleasePeriod}`}</span>
                                     <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>🕒</span>
                                   </button>

                                   {showResultReleaseTimePicker && (
                                     <div style={{ position: "absolute", top: "105%", right: 0, zIndex: 1000, backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", width: "240px", height: "200px", boxSizing: "border-box" }}>
                                       <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
                                         {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((hr) => {
                                           const isSelected = hr === resultReleaseHour;
                                           return (
                                             <div key={hr} onClick={() => { setResultReleaseHour(hr); updateResultReleaseDateTime(resultReleaseDateOnly, hr, resultReleaseMinute, resultReleasePeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-primary)", transition: "all 0.1s ease" }}>{hr}</div>
                                           );
                                         })}
                                       </div>
                                       <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
                                         {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((min) => {
                                           const isSelected = min === resultReleaseMinute;
                                           return (
                                             <div key={min} onClick={() => { setResultReleaseMinute(min); updateResultReleaseDateTime(resultReleaseDateOnly, resultReleaseHour, min, resultReleasePeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-primary)", transition: "all 0.1s ease" }}>{min}</div>
                                           );
                                         })}
                                       </div>
                                       <div style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "center" }}>
                                         {["AM", "PM"].map((p) => {
                                           const isSelected = p === resultReleasePeriod;
                                           return (
                                             <div key={p} onClick={() => { setResultReleasePeriod(p); updateResultReleaseDateTime(resultReleaseDateOnly, resultReleaseHour, resultReleaseMinute, p); }} style={{ padding: "10px 6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-secondary)", transition: "all 0.1s ease" }}>{p}</div>
                                           );
                                         })}
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             )}

                            {/* Setting 2: showCorrectAnswers */}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label className="checkbox-toggle-label" style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                                <input 
                                  type="checkbox" 
                                  checked={quizMeta.showCorrectAnswers} 
                                  onChange={(e) => setQuizMeta({ ...quizMeta, showCorrectAnswers: e.target.checked })} 
                                  style={{ marginTop: "3px" }}
                                />
                                <div>
                                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                                    Show Correct Answers
                                  </span>
                                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                    Allow students to see the correct answers after the result is available.
                                  </p>
                                </div>
                              </label>
                            </div>

                            {/* Setting 3: showExplanations */}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label className="checkbox-toggle-label" style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                                <input 
                                  type="checkbox" 
                                  checked={quizMeta.showExplanations} 
                                  onChange={(e) => setQuizMeta({ ...quizMeta, showExplanations: e.target.checked })} 
                                  style={{ marginTop: "3px" }}
                                />
                                <div>
                                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                                    Show Answer Explanations
                                  </span>
                                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                    Allow students to view explanations for the questions after submission.
                                  </p>
                                </div>
                              </label>
                            </div>

                            {/* Setting 4: showAnswerReview */}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label className="checkbox-toggle-label" style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                                <input 
                                  type="checkbox" 
                                  checked={quizMeta.showAnswerReview} 
                                  onChange={(e) => setQuizMeta({ ...quizMeta, showAnswerReview: e.target.checked })} 
                                  style={{ marginTop: "3px" }}
                                />
                                <div>
                                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                                    Show Answer Review
                                  </span>
                                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                    Allow students to review their selected answers, correct answers, and unanswered questions.
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PRACTICE SETTINGS: Visible if publishAs is 'practice' or 'both' */}
                      {(quizMeta.publishAs === "practice" || quizMeta.publishAs === "both") && (
                        <div style={{ marginTop: quizMeta.publishAs === "both" ? "16px" : 0 }}>
                          {quizMeta.publishAs === "both" && (
                            <h4 style={{ fontSize: "12px", color: "var(--violet)", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px 0", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", fontWeight: "700" }}>
                              Practice Mode Settings
                            </h4>
                          )}
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "-6px 0 16px 0", lineHeight: "1.4" }}>
                            Configure what students can see when practicing this **Practice** module.
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {/* Practice Result Release Mode Selector */}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: "12px", display: "block", marginBottom: "6px", fontWeight: "600", color: "var(--text-secondary)" }}>
                                Result Release Mode
                              </label>
                              <select
                                value={quizMeta.practiceResultReleaseMode || "immediate"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuizMeta({
                                    ...quizMeta,
                                    practiceResultReleaseMode: val,
                                    practiceShowResultAfterSubmission: val === "immediate",
                                    practiceShowCorrectAnswers: val === "immediate",
                                    practiceShowExplanations: val === "immediate",
                                    practiceShowAnswerReview: val === "immediate",
                                  });
                                }}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", outline: "none" }}
                              >
                                <option value="immediate">Show Immediately after Submission</option>
                                <option value="scheduled">Release on Scheduled Date & Time</option>
                                <option value="manual">Hide (Manual Release by Admin)</option>
                              </select>
                            </div>

                             {/* Practice Scheduled Date Time Picker */}
                             {quizMeta.practiceResultReleaseMode === "scheduled" && (
                               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px", marginBottom: "16px" }}>
                                 
                                 {/* Custom Date Picker */}
                                 <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                                   <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-secondary)" }}>Release Date</label>
                                   <button
                                     type="button"
                                     onClick={() => setShowPracticeResultReleaseDatePicker(!showPracticeResultReleaseDatePicker)}
                                     style={{ background: "var(--bg-input)", border: "1.5px solid var(--border-input)", borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}
                                   >
                                     <span>{practiceResultReleaseDateOnly ? formatDateDisplay(practiceResultReleaseDateOnly) : "Select Date"}</span>
                                     <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>📅</span>
                                   </button>

                                   {showPracticeResultReleaseDatePicker && (
                                     <div style={{ position: "absolute", top: "105%", left: 0, zIndex: 1000, backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", width: "260px", boxSizing: "border-box" }}>
                                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                         <button type="button" onClick={() => { if (practiceCalendarMonth === 0) { setPracticeCalendarMonth(11); setPracticeCalendarYear(practiceCalendarYear - 1); } else { setPracticeCalendarMonth(practiceCalendarMonth - 1); } }} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", cursor: "pointer", padding: "4px 8px", fontWeight: "bold" }}>&lt;</button>
                                         <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>
                                           {["January","February","March","April","May","June","July","August","September","October","November","December"][practiceCalendarMonth]} {practiceCalendarYear}
                                         </span>
                                         <button type="button" onClick={() => { if (practiceCalendarMonth === 11) { setPracticeCalendarMonth(0); setPracticeCalendarYear(practiceCalendarYear + 1); } else { setPracticeCalendarMonth(practiceCalendarMonth + 1); } }} style={{ background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", cursor: "pointer", padding: "4px 8px", fontWeight: "bold" }}>&gt;</button>
                                       </div>

                                       <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", textAlign: "center" }}>
                                         {["S","M","T","W","T","F","S"].map((d, idx) => (
                                           <span key={idx} style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)" }}>{d}</span>
                                         ))}
                                       </div>

                                       <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                                         {generateCustomCalendarDays(practiceCalendarYear, practiceCalendarMonth).map((cell, idx) => {
                                           const cellDateStr = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                                           const isSelected = cellDateStr === practiceResultReleaseDateOnly;
                                           return (
                                             <div
                                               key={idx}
                                               onClick={() => { setPracticeResultReleaseDateOnly(cellDateStr); updatePracticeResultReleaseDateTime(cellDateStr, practiceResultReleaseHour, practiceResultReleaseMinute, practiceResultReleasePeriod); setShowPracticeResultReleaseDatePicker(false); }}
                                               style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "28px", fontSize: "12px", fontWeight: isSelected ? "700" : "500", borderRadius: "50%", cursor: "pointer", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : cell.isCurrentMonth ? "var(--text-primary)" : "var(--text-muted)", border: isSelected ? "2px solid rgba(110,63,243,0.2)" : "none", boxSizing: "border-box" }}
                                             >
                                               {cell.day}
                                             </div>
                                           );
                                         })}
                                       </div>

                                       <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px solid var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>
                                         <button type="button" onClick={() => { setPracticeResultReleaseDateOnly(""); updatePracticeResultReleaseDateTime("", practiceResultReleaseHour, practiceResultReleaseMinute, practiceResultReleasePeriod); setShowPracticeResultReleaseDatePicker(false); }} style={{ background: "transparent", border: "none", color: "var(--red)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Clear</button>
                                         <button type="button" onClick={() => { const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth()+1).padStart(2,"0"); const dd = String(today.getDate()).padStart(2,"0"); const todayStr = `${yyyy}-${mm}-${dd}`; setPracticeResultReleaseDateOnly(todayStr); setPracticeCalendarMonth(today.getMonth()); setPracticeCalendarYear(today.getFullYear()); updatePracticeResultReleaseDateTime(todayStr, practiceResultReleaseHour, practiceResultReleaseMinute, practiceResultReleasePeriod); setShowPracticeResultReleaseDatePicker(false); }} style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Today</button>
                                       </div>
                                     </div>
                                   )}
                                 </div>

                                 {/* Custom Time Picker */}
                                 <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative" }}>
                                   <label style={{ fontSize: "10.5px", fontWeight: "700", color: "var(--text-secondary)" }}>Release Time</label>
                                   <button
                                     type="button"
                                     onClick={() => setShowPracticeResultReleaseTimePicker(!showPracticeResultReleaseTimePicker)}
                                     style={{ background: "var(--bg-input)", border: "1.5px solid var(--border-input)", borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", boxSizing: "border-box" }}
                                   >
                                     <span>{`${practiceResultReleaseHour}:${practiceResultReleaseMinute} ${practiceResultReleasePeriod}`}</span>
                                     <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>🕒</span>
                                   </button>

                                   {showPracticeResultReleaseTimePicker && (
                                     <div style={{ position: "absolute", top: "105%", right: 0, zIndex: 1000, backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", padding: "12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", width: "240px", height: "200px", boxSizing: "border-box" }}>
                                       <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
                                         {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((hr) => {
                                           const isSelected = hr === practiceResultReleaseHour;
                                           return (
                                             <div key={hr} onClick={() => { setPracticeResultReleaseHour(hr); updatePracticeResultReleaseDateTime(practiceResultReleaseDateOnly, hr, practiceResultReleaseMinute, practiceResultReleasePeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-primary)", transition: "all 0.1s ease" }}>{hr}</div>
                                           );
                                         })}
                                       </div>
                                       <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", paddingRight: "4px" }}>
                                         {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((min) => {
                                           const isSelected = min === practiceResultReleaseMinute;
                                           return (
                                             <div key={min} onClick={() => { setPracticeResultReleaseMinute(min); updatePracticeResultReleaseDateTime(practiceResultReleaseDateOnly, practiceResultReleaseHour, min, practiceResultReleasePeriod); }} style={{ padding: "6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: isSelected ? "700" : "500", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-primary)", transition: "all 0.1s ease" }}>{min}</div>
                                           );
                                         })}
                                       </div>
                                       <div style={{ display: "flex", flexDirection: "column", gap: "6px", justifyContent: "center" }}>
                                         {["AM", "PM"].map((p) => {
                                           const isSelected = p === practiceResultReleasePeriod;
                                           return (
                                             <div key={p} onClick={() => { setPracticeResultReleasePeriod(p); updatePracticeResultReleaseDateTime(practiceResultReleaseDateOnly, practiceResultReleaseHour, practiceResultReleaseMinute, p); }} style={{ padding: "10px 6px", textAlign: "center", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "700", backgroundColor: isSelected ? "var(--violet)" : "transparent", color: isSelected ? "#ffffff" : "var(--text-secondary)", transition: "all 0.1s ease" }}>{p}</div>
                                           );
                                         })}
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             )}

                            {/* Practice Setting 2: practiceShowCorrectAnswers */}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label className="checkbox-toggle-label" style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                                <input 
                                  type="checkbox" 
                                  checked={quizMeta.practiceShowCorrectAnswers} 
                                  onChange={(e) => setQuizMeta({ ...quizMeta, practiceShowCorrectAnswers: e.target.checked })} 
                                  style={{ marginTop: "3px" }}
                                />
                                <div>
                                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                                    Show Correct Answers
                                  </span>
                                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                    Allow students to see the correct answers after the result is available.
                                  </p>
                                </div>
                              </label>
                            </div>

                            {/* Practice Setting 3: practiceShowExplanations */}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label className="checkbox-toggle-label" style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                                <input 
                                  type="checkbox" 
                                  checked={quizMeta.practiceShowExplanations} 
                                  onChange={(e) => setQuizMeta({ ...quizMeta, practiceShowExplanations: e.target.checked })} 
                                  style={{ marginTop: "3px" }}
                                />
                                <div>
                                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                                    Show Answer Explanations
                                  </span>
                                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                    Allow students to view explanations for the questions after submission.
                                  </p>
                                </div>
                              </label>
                            </div>

                            {/* Practice Setting 4: practiceShowAnswerReview */}
                            <div className="form-field" style={{ marginBottom: 0 }}>
                              <label className="checkbox-toggle-label" style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                                <input 
                                  type="checkbox" 
                                  checked={quizMeta.practiceShowAnswerReview} 
                                  onChange={(e) => setQuizMeta({ ...quizMeta, practiceShowAnswerReview: e.target.checked })} 
                                  style={{ marginTop: "3px" }}
                                />
                                <div>
                                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                                    Show Answer Review
                                  </span>
                                  <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                                    Allow students to review their selected answers, correct answers, and unanswered questions.
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                </div>

              </div>
              {/* Questions Builder */}
              <div className="form-card header-questions-card">
                  <div
                    className="questions-title-row"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1.5px solid var(--border-color)", paddingBottom: "12px", flexWrap: "wrap", gap: "12px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h3 className="form-card-title" style={{ margin: 0, border: "none", padding: 0 }}>Assessment Questions</h3>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }} onClick={(e) => e.stopPropagation()}>
                      {questions.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllQuestions}
                          className="btn-danger-compact"
                          style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--red)", border: "1.5px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                        >
                          🗑️ Delete All Questions
                        </button>
                      )}
                      {questions.length > 0 && (
                        <span style={{ fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)" }}>{questions.length} Question{questions.length !== 1 ? 's' : ''}</span>
                      )}
                      <span
                        onClick={(e) => { e.stopPropagation(); setQuestionsCollapsed(!questionsCollapsed); }}
                        style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "normal", cursor: "pointer", userSelect: "none" }}
                      >
                        {questionsCollapsed ? "＋ Expand All" : "－ Collapse All"}
                      </span>
                    </div>
                  </div>

                  {!questionsCollapsed && (
                    <>
                      <div className="questions-scrollable-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
                        {questions.map((q, qIndex) => {
                          const isExpanded = !!expandedQuestions[qIndex];
                          const isFirstInSection = qIndex === 0 || questions[qIndex - 1].sectionName !== q.sectionName;
                          const hasSection = q.sectionName && q.sectionName !== "Default";

                          return (
                            <React.Fragment key={qIndex}>
                              {hasSection && isFirstInSection && (
                                <div style={{ margin: "24px 0 12px 0", fontSize: "14px", fontWeight: "bold", color: "var(--violet)", display: "flex", alignItems: "center", gap: "12px", gridColumn: "1 / -1" }}>
                                  <span style={{ height: "1px", flex: 1, backgroundColor: "var(--border-color)" }}></span>
                                  <span style={{ padding: "4px 12px", borderRadius: "12px", backgroundColor: "rgba(110, 63, 243, 0.1)", border: "1px solid rgba(110, 63, 243, 0.2)" }}>
                                    {q.sectionName.toUpperCase()}
                                  </span>
                                  <span style={{ height: "1px", flex: 1, backgroundColor: "var(--border-color)" }}></span>
                                </div>
                              )}

                              <div className="question-block-enhanced" style={{ gridColumn: isExpanded ? "1 / -1" : "auto", minWidth: 0 }}>
                                <div
                                  className="question-block-header"
                                  onClick={() => toggleQuestionExpand(qIndex)}
                                  style={{ cursor: "pointer", userSelect: "none" }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                                    <span className="question-number">Question {qIndex + 1}</span>
                                    {!isExpanded && q.questionEnglish && (
                                      <span style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500", flex: 1 }}>
                                        {q.questionEnglish}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }} onClick={(e) => e.stopPropagation()}>
                                    {questions.length > 1 && (
                                      <button type="button" className="remove-btn-compact" onClick={() => removeQuestion(qIndex)} title="Delete Question">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                          <line x1="18" y1="6" x2="6" y2="18"></line>
                                          <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        <span>Delete</span>
                                      </button>
                                    )}
                                      <span 
                                        style={{ fontSize: "13px", color: "var(--primary)", padding: "0 4px", fontWeight: "600", cursor: "pointer" }}
                                        onClick={() => toggleQuestionExpand(qIndex)}
                                      >
                                        {isExpanded ? "- Collapse" : "+ Expand"}
                                      </span>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="question-expanded-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '14px', alignItems: 'start' }}>
                                    <div className="question-inputs-left">

                                      <div className="question-inputs-fields">
                                        <div className="form-field full-width">
                                          <textarea value={q.questionEnglish} onChange={(e) => handleQuestionChange(qIndex, "questionEnglish", e.target.value)} rows={4} style={{ minHeight: "90px", height: "auto", resize: "vertical" }} placeholder="Enter question in English..." />
                                        </div>
                                        <div className="form-field full-width">
                                          <textarea value={q.questionHindi} onChange={(e) => handleQuestionChange(qIndex, "questionHindi", e.target.value)} rows={4} style={{ minHeight: "90px", height: "auto", resize: "vertical" }} placeholder="हिंदी में प्रश्न लिखें (वैकल्पिक)..." />
                                        </div>

                                        <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>
                                          Options (Select correct answer using checkmark ✓ on the right)
                                        </label>

                                        <div className="options-grid-enhanced">
                                          {q.options.map((optionValue, optIndex) => {
                                            const label = String.fromCharCode(65 + optIndex);
                                            const isCorrect = q.correctOptionIndex === optIndex;
                                            return (
                                              <div className={`option-input-card-enhanced ${isCorrect ? "correct-answer-highlighted" : ""}`} key={optIndex}>
                                                <div className={`option-letter-badge ${isCorrect ? "badge-correct" : ""}`}>{label}</div>
                                                <input
                                                  type="text"
                                                  value={optionValue}
                                                  onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                                  placeholder="English Option / हिंदी विकल्प"
                                                  className="option-text-field"
                                                />
                                                <div
                                                  className={`option-select-tick ${isCorrect ? "tick-selected" : ""}`}
                                                  onClick={() => selectCorrectOption(qIndex, optIndex)}
                                                  title="Mark as correct answer"
                                                  style={{
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    width: "22px", height: "22px", borderRadius: "50%",
                                                    border: isCorrect ? "1.5px solid #10B981" : "1.5px solid var(--border-input)",
                                                    backgroundColor: isCorrect ? "#10B981" : "transparent",
                                                    color: isCorrect ? "#ffffff" : "transparent",
                                                    cursor: "pointer", fontSize: "12px", fontWeight: "bold",
                                                    transition: "all 0.15s ease", userSelect: "none", flexShrink: 0
                                                  }}
                                                >✓</div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Dynamic Add/Remove Option Buttons */}
                                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                          {q.options.length < 6 && (
                                            <button 
                                              type="button" 
                                              onClick={() => addOptionToQuestion(qIndex)}
                                              style={{
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: "bold",
                                                backgroundColor: "rgba(110, 63, 243, 0.1)",
                                                border: "1px solid rgba(110, 63, 243, 0.2)",
                                                color: "var(--violet, #6E3FF3)",
                                                cursor: "pointer"
                                              }}
                                            >
                                              ＋ Add Option
                                            </button>
                                          )}
                                          {q.options.length > 2 && (
                                            <button 
                                              type="button" 
                                              onClick={() => removeOptionFromQuestion(qIndex)}
                                              style={{
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                fontSize: "12px",
                                                fontWeight: "bold",
                                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                                color: "#EF4444",
                                                cursor: "pointer"
                                              }}
                                            >
                                              － Remove Option
                                            </button>
                                          )}
                                        </div>

                                        <div className="form-field full-width" style={{ marginTop: "14px" }}>
                                          <textarea value={q.explanation || ""} onChange={(e) => handleQuestionChange(qIndex, "explanation", e.target.value)} rows={4} style={{ minHeight: "90px", height: "auto", resize: "vertical" }} placeholder="Answer Explanation (Optional)..." />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="question-preview-right" style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '14px', lineHeight: '1.6' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>Live Preview</div>
                                      <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Question:</div>
                                        <div><MathRenderer text={q.questionEnglish || "..."} /></div>
                                        {q.questionHindi && <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}><MathRenderer text={q.questionHindi} /></div>}
                                      </div>
                                      <div style={{ marginBottom: '16px' }}>
                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Options:</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {q.options.map((optionValue, optIndex) => {
                                            const label = String.fromCharCode(65 + optIndex);
                                            const isCorrect = q.correctOptionIndex === optIndex;
                                            if (!optionValue) return null;
                                            return (
                                              <div key={optIndex} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 'bold', color: isCorrect ? '#10B981' : 'var(--text-secondary)' }}>{label}.</span>
                                                <MathRenderer text={optionValue} />
                                                {isCorrect && <span style={{ color: '#10B981', fontSize: '12px', marginLeft: '4px' }}>✓</span>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      {q.explanation && (
                                        <div>
                                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Explanation:</div>
                                          <div><MathRenderer text={q.explanation} /></div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </React.Fragment>
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

            {/* Bottom Actions */}
            <div className="quiz-bottom-actions-row">
              <div className="quiz-status-summary">
                <span className="status-dot" style={{ backgroundColor: isScheduled ? "var(--gold)" : "var(--text-muted)" }}></span>
                <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-secondary)" }}>
                  {isScheduled
                    ? `Status: Scheduled for ${scheduledDateTime ? new Date(scheduledDateTime).toLocaleDateString('en-GB').replace(/\//g, '-') + ', ' + new Date(scheduledDateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : "..."}`
                    : "Status: Ready (Draft / Publish)"
                  }
                </span>
              </div>
              <div className="action-buttons-group">
                <button type="button" className="btn-save-draft" disabled={loading} onClick={() => handleSubmit("draft")}>
                  Save to Drafts
                </button>
                <button type="button" className="btn-submit-publish" disabled={loading} onClick={() => handleSubmit(isScheduled ? "schedule" : "publish")}>
                  {loading ? "Processing..." : isScheduled ? "Schedule Quiz" : "Publish Immediately"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Paid Plan Slide-in Drawer */}
      <PaidPlanDrawer
        isOpen={isPlanDrawerOpen}
        onClose={() => {
          setIsPlanDrawerOpen(false);
          setEditingPlanIndex(-1);
        }}
        onSave={handleSavePlan}
        plan={editingPlanIndex >= 0 ? quizMeta.plans[editingPlanIndex] : null}
        existingPlans={quizMeta.plans || []}
        currency={quizMeta.currency}
      />
    </div>
  );
}

export default CreateQuiz;