import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import DocxParser from "./components/DocxParser";
import SectionPickerModal from "./components/SectionPickerModal";
import MathRenderer from "../components/MathRenderer";

import { saveModularQuiz } from "../utils/modularQuizApi";
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

const defaultSection = (index) => ({
  id: Date.now().toString() + index,
  title: `Section ${index + 1}`,
  description: "",
  type: "standard",
  durationMin: "",
  durationSec: "",
  marksPerQuestion: 1,
  negativeMarking: 0,
  questionLimit: 0,
  randomizeOptions: false,
  questions: [emptyQuestion()],
  subsections: {
    easy: [],
    medium: [],
    hard: []
  }
});

function CreateQuizMulti() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [quizMeta, setQuizMeta] = useState({
    examName: "",
    subject: "",
    title: "",
    description: "",
    durationMin: "",
    durationSec: "",
    published: false,
    status: "Draft",
    enablePerQuestionTimer: false,
    timePerQuestion: 30,
    lockPreviousQuestions: false,
    breakBetweenSections: 0,
    publishAs: "exam",
    shuffleQuestions: false,
    shuffleOptions: false,
    randomSelection: false,
    questionsPerAttempt: 20,
    isPaid: false,
    price: 0,
    isPracticePaid: false,
    practicePrice: 0,
    currency: "INR",
    plans: [],
    detailedDescription: "",
    examSeriesId: "",
    passPercentage: 50,
  });

  const [sections, setSections] = useState([defaultSection(0)]);
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id);
  const [activeDifficulty, setActiveDifficulty] = useState("easy");

  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSectionPickerOpen, setIsSectionPickerOpen] = useState(false);
  const [isQuestionsVisible, setIsQuestionsVisible] = useState(true);
  const [isGlobalSettingsCollapsed, setIsGlobalSettingsCollapsed] = useState(false);
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
  const [editingPlanIndex, setEditingPlanIndex] = useState(-1);

  const handleSavePlan = (planData) => {
    setQuizMeta(prev => {
      let updatedPlans = [...(prev.plans || [])];
      if (editingPlanIndex >= 0) {
        updatedPlans[editingPlanIndex] = planData;
      } else if (Array.isArray(planData)) {
        updatedPlans = planData;
      } else {
        updatedPlans.push(planData);
      }
      return { ...prev, plans: updatedPlans };
    });
    setIsPlanDrawerOpen(false);
    setEditingPlanIndex(-1);
  };

  useEffect(() => {
    if (id) {
      const fetchQuiz = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          });
          const dbQuiz = res.data;

          const durationMins = Math.floor((dbQuiz.duration || 0) / 60);
          const durationSecs = (dbQuiz.duration || 0) % 60;

          setQuizMeta({
            examName: dbQuiz.examName || "",
            subject: dbQuiz.subject || "",
            title: dbQuiz.title || "",
            description: dbQuiz.description || "",
            durationMin: durationMins > 0 ? String(durationMins) : "",
            durationSec: durationSecs > 0 ? String(durationSecs) : "",
            published: dbQuiz.published || false,
            status: dbQuiz.status || "Draft",
            enablePerQuestionTimer: dbQuiz.enablePerQuestionTimer || false,
            timePerQuestion: dbQuiz.timePerQuestion || 30,
            lockPreviousQuestions: dbQuiz.lockPreviousQuestions || false,
            breakBetweenSections: dbQuiz.breakBetweenSections || 0,
            shuffleQuestions: dbQuiz.shuffleQuestions || false,
            shuffleOptions: dbQuiz.shuffleOptions || false,
            randomSelection: dbQuiz.randomSelection || false,
            questionsPerAttempt: dbQuiz.questionsPerAttempt || 20,
            isPaid: dbQuiz.isPaid || false,
            price: dbQuiz.price || 0,
            isPracticePaid: dbQuiz.isPracticePaid || false,
            practicePrice: dbQuiz.practicePrice || 0,
            currency: dbQuiz.currency || "INR",
            plans: dbQuiz.plans || [],
            detailedDescription: dbQuiz.detailedDescription || "",
            examSeriesId: dbQuiz.examSeriesId || "",
          });

          if (dbQuiz.sections && dbQuiz.sections.length > 0) {
            const parsedSections = [];
            for (const secRef of dbQuiz.sections) {
              const secId = typeof secRef === "object" ? (secRef._id || secRef.sectionId?._id || secRef.sectionId) : secRef;
              const linkMode = typeof secRef === "object" ? secRef.mode || "clone" : "clone";
              
              if (typeof secRef === "object" && secRef.title) {
                  const secDurationMins = Math.floor((secRef.duration || 0) / 60);
                  const secDurationSecs = (secRef.duration || 0) % 60;
                  parsedSections.push({
                    ...secRef,
                    sectionId: secRef._id,
                    id: secRef._id || Date.now().toString() + Math.random(),
                    durationMin: secDurationMins > 0 ? String(secDurationMins) : "",
                    durationSec: secDurationSecs > 0 ? String(secDurationSecs) : "",
                    isExternal: true,
                    mode: linkMode,
                  });
              } else if (secId) {
                try {
                  const secRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/sections/${secId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                  });
                  const secData = secRes.data;
                  const secDurationMins = Math.floor((secData.duration || 0) / 60);
                  const secDurationSecs = (secData.duration || 0) % 60;
                  parsedSections.push({
                    ...secData,
                    sectionId: secData._id,
                    id: secData._id || Date.now().toString() + Math.random(),
                    durationMin: secDurationMins > 0 ? String(secDurationMins) : "",
                    durationSec: secDurationSecs > 0 ? String(secDurationSecs) : "",
                    isExternal: true,
                    mode: linkMode,
                  });
                } catch (e) {
                  console.error("Failed to load referenced section info:", secId, e);
                }
              }
            }
            if (parsedSections.length > 0) {
              setSections(parsedSections);
              setActiveSectionId(parsedSections[0].id);
            }
          } else if (dbQuiz.questions && dbQuiz.questions.length > 0) {
            const legacySec = defaultSection(0);
            legacySec.title = "Legacy Questions";
            legacySec.questions = dbQuiz.questions;
            
            const durMins = Math.floor((dbQuiz.duration || 0) / 60);
            const durSecs = (dbQuiz.duration || 0) % 60;
            legacySec.durationMin = durMins > 0 ? String(durMins) : "";
            legacySec.durationSec = durSecs > 0 ? String(durSecs) : "";
            
            legacySec.marksPerQuestion = dbQuiz.marksPerQuestion !== undefined ? dbQuiz.marksPerQuestion : 1;
            legacySec.negativeMarking = dbQuiz.negativeMarking !== undefined ? dbQuiz.negativeMarking : 0;
            legacySec.questionLimit = dbQuiz.questionLimit !== undefined ? dbQuiz.questionLimit : 0;
            
            setSections([legacySec]);
            setActiveSectionId(legacySec.id);
          }
        } catch (err) {
          console.error("Error fetching quiz for edit", err);
          setMessage({ text: "Failed to load quiz data.", type: "error" });
        }
        setLoading(false);
      };
      fetchQuiz();
    }
  }, [id]);

  const handleMetaChange = (e) => setQuizMeta({ ...quizMeta, [e.target.name]: e.target.value });

  const handleAddSection = () => {
    const newSec = defaultSection(sections.length);
    setSections([...sections, newSec]);
    setActiveSectionId(newSec.id);
  };

  const moveSection = (index, direction) => {
    const newSections = [...sections];
    if (direction === 'up' && index > 0) {
      const temp = newSections[index - 1];
      newSections[index - 1] = newSections[index];
      newSections[index] = temp;
    } else if (direction === 'down' && index < newSections.length - 1) {
      const temp = newSections[index + 1];
      newSections[index + 1] = newSections[index];
      newSections[index] = temp;
    }
    setSections(newSections);
  };

  const activeSectionIndex = sections.findIndex(s => s.id === activeSectionId);
  const activeSection = sections[activeSectionIndex] || sections[0];

  const updateActiveSection = (updates) => {
    const newSections = [...sections];
    newSections[activeSectionIndex] = { ...activeSection, ...updates };
    setSections(newSections);
  };

  const handleSectionMetaChange = (e) => {
    updateActiveSection({ [e.target.name]: e.target.value });
  };

  const getActiveQuestions = () => {
    if (activeSection.type === "coding") {
      return activeSection.subsections[activeDifficulty] || [];
    }
    return activeSection.questions || [];
  };

  const setActiveQuestions = (newQuestions) => {
    if (activeSection.type === "coding") {
      updateActiveSection({
        subsections: {
          ...activeSection.subsections,
          [activeDifficulty]: newQuestions
        }
      });
    } else {
      updateActiveSection({ questions: newQuestions });
    }
  };

  const addQuestion = () => {
    const qs = getActiveQuestions();
    setActiveQuestions([...qs, emptyQuestion()]);
    setExpandedQuestions({ ...expandedQuestions, [qs.length]: true });
  };

  const removeQuestion = (qIndex) => {
    const qs = getActiveQuestions();
    const newQs = qs.filter((_, i) => i !== qIndex);
    setActiveQuestions(newQs);
  };

  const handleQuestionChange = (qIndex, field, value) => {
    const qs = [...getActiveQuestions()];
    qs[qIndex][field] = value;
    setActiveQuestions(qs);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const qs = [...getActiveQuestions()];
    qs[qIndex].options[oIndex] = value;
    setActiveQuestions(qs);
  };

  const setCorrectOption = (qIndex, oIndex) => {
    const qs = [...getActiveQuestions()];
    qs[qIndex].correctOptionIndex = oIndex;
    qs[qIndex].correctAnswer = qs[qIndex].options[oIndex] || `Option ${oIndex + 1}`;
    setActiveQuestions(qs);
  };

  const toggleQuestionExpand = (qIndex) => {
    setExpandedQuestions({ ...expandedQuestions, [qIndex]: !expandedQuestions[qIndex] });
  };

  const mapParsedQuestions = (questions) => {
    return questions.map((q) => {
      let correctIdx = -1;
      if (q.correctAnswer === "A") correctIdx = 0;
      else if (q.correctAnswer === "B") correctIdx = 1;
      else if (q.correctAnswer === "C") correctIdx = 2;
      else if (q.correctAnswer === "D") correctIdx = 3;

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
        explanation: q.explanation || "",
        explanations: q.explanations || {
          correct: q.explanation || "",
          incorrect: {},
          conceptSummary: "",
          didYouKnow: ""
        },
      };
    });
  };

  const handleDocxImport = (parsedSections) => {
    if (!parsedSections || parsedSections.length === 0) return;

    if (parsedSections.length === 1 && parsedSections[0].sectionTitle === "Default") {
      const mappedQs = mapParsedQuestions(parsedSections[0].questions);
      const activeQs = getActiveQuestions();
      const isFirstEmpty = activeQs.length === 1 && 
                           !activeQs[0].questionEnglish.trim() && 
                           !activeQs[0].questionHindi.trim();
      const existingQs = isFirstEmpty ? [] : activeQs;
      setActiveQuestions([...existingQs, ...mappedQs]);
      setMessage({ text: `Imported ${mappedQs.length} questions into the active section.`, type: "success" });
      return;
    }

    const newSections = [...sections];
    let totalImported = 0;

    const isFreshSection =
      newSections.length === 1 &&
      newSections[0].questions.length === 1 &&
      newSections[0].questions[0].questionEnglish === "";

    parsedSections.forEach((parsedSec, index) => {
      const mappedQs = mapParsedQuestions(parsedSec.questions);
      totalImported += mappedQs.length;

      if (index === 0 && parsedSec.sectionTitle === "Default") {
        const activeSecIndex = newSections.findIndex(s => s.id === activeSectionId);
        if (activeSecIndex !== -1) {
          const currentQs = newSections[activeSecIndex].questions.filter(q => q.questionEnglish.trim() !== "");
          newSections[activeSecIndex].questions = [...currentQs, ...mappedQs];
        }
      } else {
        const existingSecIndex = newSections.findIndex(
          s => s.title.toLowerCase() === parsedSec.sectionTitle.toLowerCase()
        );

        if (existingSecIndex !== -1) {
          const currentQs = newSections[existingSecIndex].questions.filter(q => q.questionEnglish.trim() !== "");
          newSections[existingSecIndex].questions = [...currentQs, ...mappedQs];
        } else if (isFreshSection && index === 0) {
          newSections[0].title = parsedSec.sectionTitle;
          newSections[0].questions = mappedQs;
        } else {
          const newSec = defaultSection(newSections.length);
          newSec.title = parsedSec.sectionTitle;
          newSec.questions = mappedQs;
          newSections.push(newSec);
        }
      }
    });

    setSections(newSections);
    setActiveSectionId(newSections[newSections.length - 1].id);
    setMessage({
      text: `Imported ${totalImported} questions across ${parsedSections.length} section(s).`,
      type: "success"
    });
  };

  const handleAddExistingSection = (picked, mode) => {
    const secDurMin = picked.duration ? String(Math.floor(picked.duration / 60)) : "0";
    const secDurSec = picked.duration ? String(picked.duration % 60) : "0";
    const newSec = {
      id: Date.now().toString() + Math.random(),
      sectionId: picked._id,
      title: picked.title,
      description: picked.description || "",
      type: picked.type || "standard",
      durationMin: secDurMin,
      durationSec: secDurSec,
      marksPerQuestion: picked.marksPerQuestion ?? 1,
      negativeMarking: picked.negativeMarking ?? 0,
      questionLimit: picked.questionLimit ?? 0,
      randomizeOptions: picked.randomizeOptions || false,
      questions: picked.questions || [],
      subsections: picked.subsections || { easy: [], medium: [], hard: [] },
      isExternal: true,
      mode,
    };
    setSections((prev) => [...prev, newSec]);
    setActiveSectionId(newSec.id);
  };

  const handleSave = async (isPublishing = false) => {
    setLoading(true);
    setMessage({ text: "", type: "" });
    try {
      if (!quizMeta.title?.trim() || !quizMeta.subject?.trim()) {
        setMessage({
          text: "Please provide an Assessment Title and Subject Category before saving.",
          type: "error"
        });
        setLoading(false);
        return;
      }

      await saveModularQuiz({
        quizMeta,
        sections,
        quizId: id || null,
        isPublishing,
      });

      setMessage({ text: "Quiz saved successfully!", type: "success" });
      setTimeout(() => navigate("/admin/manage-quizzes"), 1500);
    } catch (err) {
      console.error(err);
      setMessage({
        text: err?.response?.data?.message || "Failed to save quiz.",
        type: "error"
      });
    }
    setLoading(false);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div
        className="admin-main"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden"
        }}
      >
        <AdminNavbar
          title={id ? "Edit Multi-Section Assessment" : "Create Multi-Section Assessment"}
          parentText={id ? "Manage Quizzes" : "Dashboard"}
          parentLink={id ? "/admin/manage-quizzes" : "/admin/dashboard"}
        />

        <div className="admin-content create-quiz-page">
          <div
            className="create-quiz-container animate-fade-in"
            style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}
          >
            {!id && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    background: "var(--bg-input)",
                    padding: "4px",
                    borderRadius: "12px",
                    border: "1.5px solid var(--border-input)"
                  }}
                >
                  <button
                    onClick={() => navigate('/admin/create-quiz')}
                    style={{
                      padding: "8px 24px",
                      borderRadius: "8px",
                      background: "transparent",
                      color: "var(--text-muted)",
                      fontWeight: "600",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    Single Quiz
                  </button>
                  <button
                    style={{
                      padding: "8px 24px",
                      borderRadius: "8px",
                      background: "var(--violet)",
                      color: "white",
                      fontWeight: "600",
                      border: "none",
                      boxShadow: "0 2px 8px rgba(110, 63, 243, 0.25)"
                    }}
                  >
                    Multi-Section
                  </button>
                </div>
              </div>
            )}

            {message.text && (
              <div
                className={`message-banner ${message.type === 'error' ? 'error' : 'success'}`}
                style={{
                  marginBottom: "20px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: message.type === 'error' ? '#fecaca' : '#bbf7d0',
                  color: message.type === 'error' ? '#991b1b' : '#166534'
                }}
              >
                {message.text}
              </div>
            )}

            <div className="create-multi-layout">
              {/* LEFT SIDEBAR */}
              <div className="create-multi-sidebar">

                {/* Sections List */}
                <div className="form-card" style={{ padding: "20px", marginBottom: 0 }}>
                  <h3 style={{ margin: "0 0 16px 0", color: "var(--text-primary)", fontSize: "16px" }}>Sections</h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {sections.map((sec, i) => (
                      <div
                        key={sec.id}
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          background: activeSectionId === sec.id ? "var(--primary-color)" : "var(--bg-input)",
                          color: activeSectionId === sec.id ? "#fff" : "var(--text-main)",
                          border: "1px solid var(--border-input)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}
                      >
                        <div
                          onClick={() => setActiveSectionId(sec.id)}
                          style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }}
                        >
                          <span style={{ fontWeight: 600 }}>{sec.title || `Section ${i + 1}`}</span>
                          <span style={{ fontSize: "12px", opacity: 0.8 }}>{sec.type}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          {i > 0 && (
                            <button
                              onClick={() => moveSection(i, 'up')}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
                            >↑</button>
                          )}
                          {i < sections.length - 1 && (
                            <button
                              onClick={() => moveSection(i, 'down')}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
                            >↓</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleAddSection}
                    style={{
                      marginTop: "16px",
                      padding: "10px",
                      width: "100%",
                      background: "transparent",
                      border: "1.5px dashed var(--primary-color)",
                      color: "var(--primary-color)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    + Add New Section
                  </button>
                  <SectionPickerModal
                    isOpen={isSectionPickerOpen}
                    onClose={() => setIsSectionPickerOpen(false)}
                    onSelect={handleAddExistingSection}
                  />
                  <button
                    onClick={() => setIsSectionPickerOpen(true)}
                    style={{
                      marginTop: "8px",
                      padding: "10px",
                      width: "100%",
                      background: "transparent",
                      border: "1.5px dashed var(--accent-teal, #10B981)",
                      color: "var(--accent-teal, #10B981)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    🔗 Add Existing Section
                  </button>
                </div>

                {/* Global Settings */}
                <div className="form-card" style={{ padding: "20px", marginBottom: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 16px 0" }}>
                    <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: "16px" }}>Global Settings</h3>
                    <button 
                      type="button" 
                      onClick={() => setIsGlobalSettingsCollapsed(!isGlobalSettingsCollapsed)}
                      style={{ 
                        background: "none", 
                        border: "none", 
                        color: "var(--primary-color, #8B5CF6)", 
                        cursor: "pointer", 
                        fontSize: "13.5px", 
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      {isGlobalSettingsCollapsed ? "+ Expand" : "- Collapse"}
                    </button>
                  </div>

                  {!isGlobalSettingsCollapsed && (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div className="form-field">
                          <label>Assessment Title</label>
                          <input
                            type="text"
                            name="title"
                            value={quizMeta.title}
                            onChange={handleMetaChange}
                            placeholder="e.g. TCS NQT 2026"
                            className="force-quiz-input"
                          />
                        </div>
                        <div className="form-field">
                          <label>Subject Category</label>
                          <input
                            type="text"
                            name="subject"
                            value={quizMeta.subject}
                            onChange={handleMetaChange}
                            placeholder="e.g. Aptitude"
                            className="force-quiz-input"
                          />
                        </div>
                        <div className="form-field">
                          <label>Exam Name</label>
                          <input
                            type="text"
                            name="examName"
                            value={quizMeta.examName}
                            onChange={handleMetaChange}
                            placeholder="e.g. TCS NQT"
                            className="force-quiz-input"
                          />
                        </div>
                        <div className="form-field">
                          <label>Description (Optional)</label>
                          <input
                            type="text"
                            name="description"
                            value={quizMeta.description}
                            onChange={handleMetaChange}
                            placeholder="Brief info..."
                            className="force-quiz-input"
                          />
                        </div>
                        <div className="form-field">
                          <label>Create As</label>
                          <select
                            name="publishAs"
                            value={quizMeta.publishAs || "exam"}
                            onChange={handleMetaChange}
                            className="force-quiz-input"
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-panel)", color: "var(--text-primary)" }}
                          >
                            <option value="exam">Exam Only</option>
                            <option value="practice">Practice Only</option>
                            <option value="both">Both Exam & Practice</option>
                          </select>
                        </div>
                        <div className="form-field">
                          <label>Global Duration (Optional)</label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <input
                              type="number"
                              name="durationMin"
                              value={quizMeta.durationMin}
                              onChange={handleMetaChange}
                              placeholder="Min"
                              className="force-quiz-input"
                            />
                            <input
                              type="number"
                              name="durationSec"
                              value={quizMeta.durationSec}
                              onChange={handleMetaChange}
                              placeholder="Sec"
                              className="force-quiz-input"
                            />
                          </div>
                        </div>

                        {quizMeta.publishAs !== "practice" && (
                          <div className="form-field" style={{ marginTop: "8px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-primary)", fontSize: "13.5px", cursor: "pointer", userSelect: "none" }}>
                              <input
                                type="checkbox"
                                checked={quizMeta.isPaid || false}
                                onChange={(e) => setQuizMeta(prev => ({ ...prev, isPaid: e.target.checked }))}
                                style={{ width: "16px", height: "16px", accentColor: "#8B5CF6" }}
                              />
                              Paid Exam
                            </label>
                          </div>
                        )}

                        {quizMeta.publishAs !== "exam" && (
                          <div className="form-field" style={{ marginTop: "8px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-primary)", fontSize: "13.5px", cursor: "pointer", userSelect: "none" }}>
                              <input
                                type="checkbox"
                                checked={quizMeta.isPracticePaid || false}
                                onChange={(e) => setQuizMeta(prev => ({ ...prev, isPracticePaid: e.target.checked }))}
                                style={{ width: "16px", height: "16px", accentColor: "#8B5CF6" }}
                              />
                              Paid Practice Module
                            </label>
                          </div>
                        )}

                        {(quizMeta.isPaid || quizMeta.isPracticePaid) && (
                          <div style={{ gridColumn: "1 / -1", marginTop: "16px", padding: "20px", background: "var(--bg-panel)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                            <h4 style={{ margin: "0 0 16px 0", fontSize: "13.5px", fontWeight: "700", color: "#8B5CF6" }}>Overview & Plans</h4>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                              {/* Left Column: Description */}
                              <div className="form-field" style={{ margin: 0 }}>
                                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>Detailed Description (Markdown details)</label>
                                <textarea 
                                  name="detailedDescription" 
                                  value={quizMeta.detailedDescription || ""} 
                                  onChange={handleMetaChange} 
                                  placeholder="Describe exam features, launch offers, and terms..." 
                                  rows={6}
                                  className="force-quiz-input"
                                  style={{ width: "100%", fontFamily: "inherit", boxSizing: "border-box" }}
                                />
                              </div>

                              {/* Right Column: Plans */}
                              <div className="form-field" style={{ margin: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                  <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Subscription Duration Plans</label>
                                  <button 
                                    type="button"
                                    className="dashboard-view-all-btn"
                                    style={{ padding: "4px 8px", fontSize: "11px", background: "rgba(139, 92, 246, 0.1)", color: "#8B5CF6", border: "1px solid rgba(139, 92, 246, 0.2)" }}
                                    onClick={() => {
                                      setEditingPlanIndex(-1);
                                      setIsPlanDrawerOpen(true);
                                    }}
                                  >
                                    ＋ Add Plan
                                  </button>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "155px", overflowY: "auto", paddingRight: "4px" }}>
                                  {(quizMeta.plans || []).map((plan, index) => (
                                    <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-main)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)", fontSize: "13px" }}>
                                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditingPlanIndex(index); setIsPlanDrawerOpen(true); }}>
                                        <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{plan.planName || `${plan.durationMonths} Month${plan.durationMonths > 1 ? 's' : ''} Plan`}</div>
                                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                                          {plan.originalPrice > 0 ? <span style={{ textDecoration: "line-through", marginRight: "6px" }}>₹{plan.originalPrice}</span> : null}
                                          <strong style={{ color: "var(--violet)" }}>₹{plan.price}</strong>
                                          {plan.discountLabel && <span style={{ color: "#10B981", marginLeft: "8px", fontWeight: "600" }}>({plan.discountLabel})</span>}
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
                                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>No plans added. Defaulting to standard price.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {true && (
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
                      )}
                    </>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                    <button
                      onClick={() => handleSave(false)}
                      disabled={loading}
                      style={{
                        padding: "12px",
                        background: "var(--bg-input)",
                        color: "var(--text-main)",
                        border: "1px solid var(--border-input)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "600"
                      }}
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => handleSave(true)}
                      disabled={loading}
                      className="btn-primary"
                      style={{ padding: "12px", borderRadius: "8px", cursor: "pointer", width: "100%", justifyContent: "center" }}
                    >
                      Publish Assessment
                    </button>
                  </div>
                </div>
              </div>

              {/* MAIN AREA */}
              <div className="create-multi-main">

                {/* Section Config */}
                <div
                  className="form-card"
                  style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-color)" }}
                >
                  <h3 style={{ margin: "0 0 16px 0", color: "var(--text-primary)" }}>Section Configuration</h3>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                    <div className="form-field">
                      <label>Section Title</label>
                      <input
                        type="text"
                        name="title"
                        value={activeSection.title}
                        onChange={handleSectionMetaChange}
                        className="force-quiz-input"
                      />
                    </div>
                    <div className="form-field">
                      <label>Section Type</label>
                      <select
                        name="type"
                        value={activeSection.type}
                        onChange={handleSectionMetaChange}
                        className="force-quiz-input"
                      >
                        <option value="standard">Standard (MCQ)</option>
                        <option value="coding">Coding (Multi-Difficulty)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "16px" }}>
                    <div className="form-field">
                      <label>Marks Per Question</label>
                      <input
                        type="number"
                        name="marksPerQuestion"
                        value={activeSection.marksPerQuestion}
                        onChange={handleSectionMetaChange}
                        className="force-quiz-input"
                      />
                    </div>
                    <div className="form-field">
                      <label>Negative Marking</label>
                      <input
                        type="number"
                        name="negativeMarking"
                        value={activeSection.negativeMarking}
                        onChange={handleSectionMetaChange}
                        className="force-quiz-input"
                      />
                    </div>
                    <div className="form-field">
                      <label>Question Limit (0=All)</label>
                      <input
                        type="number"
                        name="questionLimit"
                        value={activeSection.questionLimit}
                        onChange={handleSectionMetaChange}
                        className="force-quiz-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "16px" }}>
                    <div className="form-field">
                      <label>Duration (Minutes)</label>
                      <input
                        type="number"
                        name="durationMin"
                        value={activeSection.durationMin}
                        onChange={handleSectionMetaChange}
                        className="force-quiz-input"
                      />
                    </div>
                    <div className="form-field">
                      <label>Duration (Seconds)</label>
                      <input
                        type="number"
                        name="durationSec"
                        value={activeSection.durationSec}
                        onChange={handleSectionMetaChange}
                        className="force-quiz-input"
                      />
                    </div>
                  </div>

                  {/* NEW FEATURES: Per Question Timer, Lock Previous Questions, Break Time */}
                  <div className="form-field" style={{ marginTop: "16px" }}>
                    <label style={{ marginBottom: "12px", display: "block", color: "var(--text-secondary)" }}>Advanced Settings</label>
                    
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", color: "var(--text-primary)", margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={quizMeta.enablePerQuestionTimer}
                          onChange={(e) => setQuizMeta(prev => ({ ...prev, enablePerQuestionTimer: e.target.checked }))}
                          style={{ accentColor: "var(--primary-color)", width: "16px", height: "16px" }}
                        />
                        <span>Enable Per Question Timer</span>
                      </label>
                      
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", color: "var(--text-primary)", margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={quizMeta.lockPreviousQuestions}
                          onChange={(e) => setQuizMeta(prev => ({ ...prev, lockPreviousQuestions: e.target.checked }))}
                          style={{ accentColor: "var(--primary-color)", width: "16px", height: "16px" }}
                        />
                        <span>Lock Previous Questions</span>
                      </label>
                    </div>

                    {quizMeta.enablePerQuestionTimer && (
                      <div style={{ marginTop: "16px", maxWidth: "300px" }}>
                        <label>Time per question (Seconds)</label>
                        <input
                          type="number"
                          className="force-quiz-input"
                          value={quizMeta.timePerQuestion}
                          onChange={(e) => setQuizMeta(prev => ({ ...prev, timePerQuestion: e.target.value }))}
                          min="1"
                          placeholder="30"
                        />
                      </div>
                    )}

                    <div style={{ marginTop: "16px", maxWidth: "300px" }}>
                      <label>Break Between Sections (Seconds)</label>
                      <input
                        type="number"
                        className="force-quiz-input"
                        value={quizMeta.breakBetweenSections}
                        onChange={(e) => setQuizMeta(prev => ({ ...prev, breakBetweenSections: e.target.value }))}
                        min="0"
                        placeholder="0 (No break)"
                      />
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", display: "block", width: "max-content" }}>
                        Time students must wait between finishing one section and starting the next.
                      </span>
                    </div>

                    <div style={{ marginTop: "16px", maxWidth: "300px" }}>
                      <label>Passing Percentage (%)</label>
                      <input
                        type="number"
                        className="force-quiz-input"
                        value={quizMeta.passPercentage}
                        onChange={(e) => setQuizMeta(prev => ({ ...prev, passPercentage: parseInt(e.target.value, 10) || 0 }))}
                        min="0"
                        max="100"
                        placeholder="50"
                      />
                    </div>
                  </div>
                </div>

                {/* Section Questions */}
                <div
                  className="form-card"
                  style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-color)" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "16px",
                      flexWrap: "wrap",
                      gap: "16px"
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <h3 style={{ margin: 0, color: "var(--text-main)" }}>Questions</h3>
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500' }}>
                        {getActiveQuestions().length} {getActiveQuestions().length === 1 ? 'Question' : 'Questions'}
                      </span>
                      <button
                        onClick={() => setIsQuestionsVisible(!isQuestionsVisible)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--primary-color)",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          padding: "4px 8px",
                          borderRadius: "4px"
                        }}
                      >
                        {isQuestionsVisible ? "Hide Questions" : "Show Questions"}
                      </button>
                      <button
                        onClick={() => {
                          const allExpanded = Object.keys(expandedQuestions).length === getActiveQuestions().length && getActiveQuestions().length > 0;
                          if (allExpanded) {
                            setExpandedQuestions({});
                          } else {
                            const newExpanded = {};
                            getActiveQuestions().forEach((_, i) => newExpanded[i] = true);
                            setExpandedQuestions(newExpanded);
                          }
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-secondary)",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        {Object.keys(expandedQuestions).length === getActiveQuestions().length && getActiveQuestions().length > 0 ? "- Collapse All" : "+ Expand All"}
                      </button>
                    </div>
                    <div style={{ width: "350px", flexShrink: 0 }}>
                      <DocxParser onQuestionsLoaded={handleDocxImport} />
                    </div>
                  </div>

                  {isQuestionsVisible && (
                    <>
                      {activeSection.type === "coding" && (
                        <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                          {["easy", "medium", "hard"].map(diff => (
                            <button
                              key={diff}
                              onClick={() => setActiveDifficulty(diff)}
                              style={{
                                padding: "8px 16px",
                                borderRadius: "20px",
                                border: "1px solid",
                                borderColor: activeDifficulty === diff ? "var(--primary-color)" : "var(--border-input)",
                                background: activeDifficulty === diff ? "rgba(108, 93, 211, 0.1)" : "transparent",
                                color: activeDifficulty === diff ? "var(--primary-color)" : "var(--text-muted)",
                                cursor: "pointer",
                                textTransform: "capitalize"
                              }}
                            >
                              {diff} Questions
                            </button>
                          ))}
                        </div>
                      )}

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
                    {getActiveQuestions().map((q, qIndex) => {
                      const isExpanded = !!expandedQuestions[qIndex];
                      return (
                        <React.Fragment key={qIndex}>
                          {qIndex === 0 && (
                            <div
                              style={{
                                margin: "10px 0 20px 0",
                                fontSize: "14px",
                                fontWeight: "bold",
                                color: "var(--violet)",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                gridColumn: "1 / -1"
                              }}
                            >
                              <span style={{ height: "1px", flex: 1, backgroundColor: "var(--border-color)" }}></span>
                              <span
                                style={{
                                  padding: "4px 12px",
                                  borderRadius: "12px",
                                  backgroundColor: "rgba(110, 63, 243, 0.1)",
                                  border: "1px solid rgba(110, 63, 243, 0.2)"
                                }}
                              >
                                SECTION: {activeSection.title.toUpperCase()}
                              </span>
                              <span style={{ height: "1px", flex: 1, backgroundColor: "var(--border-color)" }}></span>
                            </div>
                          )}

                          <div
                            className="question-block-enhanced"
                            style={{ gridColumn: isExpanded ? "1 / -1" : "auto", minWidth: 0 }}
                          >
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
                                      flex: 1,
                                      minWidth: 0,
                                      display: "block"
                                    }}
                                  >
                                    {q.questionEnglish}
                                  </span>
                                )}
                              </div>

                              <div
                                style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}
                                onClick={(e) => e.stopPropagation()}
                              >
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
                                  <span 
                                    style={{ fontSize: "13px", color: "var(--primary)", padding: "0 4px", fontWeight: "600", cursor: "pointer" }}
                                    onClick={() => toggleQuestionExpand(qIndex)}
                                  >
                                    {isExpanded ? "- Collapse" : "+ Expand"}
                                  </span>
                              </div>
                            </div>

                            {/* Collapsible Question Inputs */}
                            {isExpanded && (
                              <div className="question-expanded-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '14px', alignItems: 'start' }}>
                                <div className="question-inputs-left">

                                  <div className="question-inputs-fields">
                                    <div className="form-field full-width">
                                      <textarea
                                        value={q.questionEnglish}
                                        onChange={(e) => handleQuestionChange(qIndex, "questionEnglish", e.target.value)}
                                        rows={2}
                                        placeholder="Enter question in English..."
                                      />
                                    </div>

                                    <div className="form-field full-width">
                                      <textarea
                                        value={q.questionHindi || ""}
                                        onChange={(e) => handleQuestionChange(qIndex, "questionHindi", e.target.value)}
                                        rows={2}
                                        placeholder="हिंदी में प्रश्न लिखें (वैकल्पिक)..."
                                      />
                                    </div>

                                    <label
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        color: "var(--text-secondary)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        marginBottom: "8px",
                                        display: "block"
                                      }}
                                    >
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
                                              value={q.options[optIndex] || ""}
                                              onChange={(e) => {
                                                const newOpts = [...(q.options || ["", "", "", ""])];
                                                newOpts[optIndex] = e.target.value;
                                                handleQuestionChange(qIndex, "options", newOpts);
                                              }}
                                              placeholder="English Option / हिंदी विकल्प"
                                              className="option-text-field"
                                            />
                                            <div
                                              className={`option-select-tick ${isCorrect ? "tick-selected" : ""}`}
                                              onClick={() => handleQuestionChange(qIndex, "correctOptionIndex", optIndex)}
                                              title="Mark as correct answer"
                                            >
                                              ✓
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="form-field full-width" style={{ marginTop: "16px" }}>
                                      <textarea
                                        value={q.explanation || ""}
                                        onChange={(e) => handleQuestionChange(qIndex, "explanation", e.target.value)}
                                        rows={2}
                                        placeholder="Answer Explanation (Optional)..."
                                        style={{ backgroundColor: "var(--bg-input)" }}
                                      />
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
                                      {["A", "B", "C", "D"].map((label, optIndex) => {
                                        const isCorrect = q.correctOptionIndex === optIndex;
                                        if (!q.options[optIndex]) return null;
                                        return (
                                          <div key={label} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 'bold', color: isCorrect ? '#10B981' : 'var(--text-secondary)' }}>{label}.</span>
                                            <MathRenderer text={q.options[optIndex]} />
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

                    <button
                      onClick={addQuestion}
                      style={{
                        padding: "12px",
                        background: "rgba(108, 93, 211, 0.1)",
                        color: "var(--primary-color)",
                        border: "1px dashed var(--primary-color)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        gridColumn: "1 / -1"
                      }}
                    >
                      + Add Question
                    </button>
                  </div>
                  </>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionPickerModal
        isOpen={isSectionPickerOpen}
        onClose={() => setIsSectionPickerOpen(false)}
        onAdd={handleAddExistingSection}
        excludeSectionIds={sections.filter(s => s.sectionId).map(s => s.sectionId)}
      />

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

export default CreateQuizMulti;