import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
  correctOptionIndex: -1, // helper for highlighting correct answer in UI
});

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
  });

  const [presetSelected, setPresetSelected] = useState("Custom");
  const [includeNegative, setIncludeNegative] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [expandedQuestions, setExpandedQuestions] = useState({ 0: true });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleMetaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizMeta((prev) => {
      const updated = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // If user edits preset-controlled values manually, reset preset to Custom
      if (["duration", "marksPerQuestion", "negativeMarking", "examName"].includes(name)) {
        setPresetSelected("Custom");
      }
      return updated;
    });
  };

  const handlePresetChange = (e) => {
    const presetName = e.target.value;
    setPresetSelected(presetName);

    if (presetName === "JEE Main") {
      setQuizMeta((prev) => ({
        ...prev,
        examName: "JEE Main",
        duration: "180",
        marksPerQuestion: 4,
        negativeMarking: 1,
      }));
      setIncludeNegative(true);
    } else if (presetName === "NEET") {
      setQuizMeta((prev) => ({
        ...prev,
        examName: "NEET",
        duration: "200",
        marksPerQuestion: 4,
        negativeMarking: 1,
      }));
      setIncludeNegative(true);
    } else if (presetName === "Custom") {
      setQuizMeta((prev) => ({
        ...prev,
        examName: "",
        duration: "",
        marksPerQuestion: 1,
        negativeMarking: 0,
      }));
      setIncludeNegative(false);
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
    setExpandedQuestions({ 0: true });
    setMessage({
      text: `✅ ${parsedQuestions.length} questions imported from Word file. Review and submit below.`,
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
      // If we edited the option that is currently selected as correct, update correctAnswer string
      if (updated[qIndex].correctOptionIndex === optIndex) {
        newCorrectVal = value;
      }

      updated[qIndex] = { 
        ...updated[qIndex], 
        options: newOptions,
        correctAnswer: newCorrectVal
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

  const handleSubmit = async (submitType) => {
    setMessage({ text: "", type: "" });
    const isDraft = submitType === "draft";
    if (!validateForm(isDraft)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Build payload based on button pressed:
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

      const sanitizedQuestions = questions.map(q => ({
        questionEnglish: q.questionEnglish.trim(),
        questionHindi: q.questionHindi.trim(),
        options: q.options.map(opt => String(opt).trim()),
        correctAnswer: q.correctAnswer.trim()
      }));

      const payload = { 
        ...quizMeta, 
        published: publishedVal,
        status: statusVal,
        scheduledDate: scheduledDateVal,
        questions: sanitizedQuestions 
      };

      console.log("Submitting payload...", payload);

      await axios.post(
        "http://localhost:5000/api/quizzes",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ 
        text: `✅ Quiz successfully saved as ${statusVal}!`, 
        type: "status-success" 
      });
      setTimeout(() => navigate("/admin/manage-quizzes"), 1200);
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
            {message.text && (
              <p className={`admin-status-message ${message.type}`}>
                {message.text}
              </p>
            )}

            <div className="quiz-two-column-layout">
              {/* ── LEFT PANEL: QUIZ DETAILS ── */}
              <div className="quiz-left-panel">
                {/* 1. Preset Selector Card */}
                <div className="form-card compact-card">
                  <h3 className="form-card-title">Exam Template Preset</h3>
                  <div className="form-field">
                    <select
                      value={presetSelected}
                      onChange={handlePresetChange}
                      className="preset-select"
                    >
                      <option value="Custom">Custom Settings</option>
                      <option value="JEE Main">JEE Main Preset (180m, +4/-1)</option>
                      <option value="NEET">NEET Preset (200m, +4/-1)</option>
                    </select>
                  </div>
                </div>

                {/* 2. Details Card */}
                <div className="form-card">
                  <h3 className="form-card-title">Quiz Configuration</h3>
                  <div className="details-vertical-fields">
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
                      <label>Duration (Minutes)</label>
                      <input
                        type="number"
                        name="duration"
                        value={quizMeta.duration}
                        onChange={handleMetaChange}
                        placeholder="180"
                        min="1"
                        required
                      />
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
                </div>

                {/* 3. Schedule Card */}
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
                      <div className="scheduled-datetime-wrapper" style={{ marginTop: "12px" }}>
                        <input
                          type="datetime-local"
                          value={scheduledDateTime}
                          onChange={(e) => setScheduledDateTime(e.target.value)}
                          className="datetime-picker-input"
                          required
                        />
                        <span className="info-text-sm" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "inline-block" }}>
                          Quiz will automatically publish at this date & time.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Docx Parser Card */}
                <div className="form-card compact-card">
                  <DocxParser onQuestionsLoaded={handleQuestionsLoaded} />
                </div>
              </div>

              {/* ── RIGHT PANEL: QUESTIONS BUILDER ── */}
              <div className="quiz-right-panel">
                <div className="form-card header-questions-card">
                  <div className="questions-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 className="form-card-title" style={{ margin: 0 }}>Assessment Questions</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                                Options (Click option letter to select the correct answer)
                              </label>
                              
                              <div className="options-grid-enhanced">
                                {["A", "B", "C", "D"].map((label, optIndex) => {
                                  const isCorrect = q.correctOptionIndex === optIndex;
                                  return (
                                    <div 
                                      className={`option-input-card-enhanced ${isCorrect ? "correct-answer-highlighted" : ""}`}
                                      key={label}
                                    >
                                      <div 
                                        className={`option-letter-badge ${isCorrect ? "badge-correct" : ""}`}
                                        onClick={() => selectCorrectOption(qIndex, optIndex)}
                                        title="Click to mark as correct answer"
                                      >
                                        {isCorrect ? "✓" : label}
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
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="quiz-bottom-actions-row">
              <div className="quiz-status-summary">
                <span className="status-dot" style={{ backgroundColor: isScheduled ? "var(--gold)" : "var(--text-muted)" }}></span>
                <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-secondary)" }}>
                  {isScheduled 
                    ? `Status: Scheduled for ${scheduledDateTime ? new Date(scheduledDateTime).toLocaleString() : "..."}`
                    : "Status: Ready (Draft / Publish)"
                  }
                </span>
              </div>
              <div className="action-buttons-group">
                <button 
                  type="button" 
                  className="btn-save-draft" 
                  disabled={loading}
                  onClick={() => handleSubmit("draft")}
                >
                  Save to Drafts
                </button>
                <button 
                  type="button" 
                  className="btn-submit-publish" 
                  disabled={loading}
                  onClick={() => handleSubmit(isScheduled ? "schedule" : "publish")}
                >
                  {loading 
                    ? "Processing..." 
                    : isScheduled 
                      ? "Schedule Quiz" 
                      : "Publish Immediately"
                  }
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateQuiz;