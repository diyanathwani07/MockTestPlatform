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
  });

  const [sections, setSections] = useState([defaultSection(0)]);
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id);
  const [activeDifficulty, setActiveDifficulty] = useState("easy");

  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSectionPickerOpen, setIsSectionPickerOpen] = useState(false);

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
          });

          if (dbQuiz.sections && dbQuiz.sections.length > 0) {
            const parsedSections = [];
            for (const secRef of dbQuiz.sections) {
              const secId = typeof secRef === "object" ? secRef.sectionId?._id || secRef.sectionId : secRef;
              const linkMode = typeof secRef === "object" ? secRef.mode || "clone" : "clone";
              if (secId) {
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
                  <h3 style={{ margin: "0 0 16px 0", color: "var(--text-primary)", fontSize: "16px" }}>Global Settings</h3>

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
                  </div>

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
                    <h3 style={{ margin: 0, color: "var(--text-main)" }}>Questions</h3>
                    <div style={{ width: "350px", flexShrink: 0 }}>
                      <DocxParser onQuestionsLoaded={handleDocxImport} />
                    </div>
                  </div>

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
    </div>
  );
}

export default CreateQuizMulti;