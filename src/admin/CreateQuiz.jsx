import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import DocxParser from "./components/DocxParser";
import "../css/admin/AdminLayout.css";
import "../css/admin/CreateQuiz.css";

// Helper to initialize a pristine bilingual question object
const emptyQuestion = () => ({
  questionEnglish: "",
  questionHindi: "",
  options: [
    { english: "", hindi: "" }, // Option A
    { english: "", hindi: "" }, // Option B
    { english: "", hindi: "" }, // Option C
    { english: "", hindi: "" }, // Option D
  ],
  correctAnswer: "", // Stores "A", "B", "C", or "D"
});

function CreateQuiz() {
  const navigate = useNavigate();

  // Quiz Metadata State
  const [quizMeta, setQuizMeta] = useState({
    title: "",
    subject: "",
    description: "",
    duration: "",
    marksPerQuestion: 1,
    negativeMarking: 0,
    published: false,
  });

  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Handle updates for general quiz metadata fields
  const handleMetaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizMeta((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Callback triggered when Word file is parsed successfully
  const handleQuestionsLoaded = (parsedQuestions) => {
    if (parsedQuestions && parsedQuestions.length > 0) {
      setQuestions(parsedQuestions);
      setMessage({
        text: `✅ ${parsedQuestions.length} questions successfully imported from Word file.`,
        type: "status-success",
      });
    }
  };

  // Handle core question field text changes (English or Hindi strings)
  const handleQuestionChange = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Handle specific changes inside our new bilingual options nested state structure
  const handleOptionChange = (qIndex, optIndex, lang, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const newOptions = [...updated[qIndex].options];
      newOptions[optIndex] = { ...newOptions[optIndex], [lang]: value };
      updated[qIndex] = { ...updated[qIndex], options: newOptions };
      return updated;
    });
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Validates form compliance before server submission
  const validateForm = () => {
    if (!quizMeta.title || !quizMeta.subject || !quizMeta.duration) {
      setMessage({ text: "Please fill in Title, Subject, and Duration.", type: "status-error" });
      return false;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionEnglish.trim()) {
        setMessage({ text: `Question ${i + 1}: English question text is required.`, type: "status-error" });
        return false;
      }
      if (q.options.some((opt) => !opt.english.trim())) {
        setMessage({ text: `Question ${i + 1}: All four English options must be filled.`, type: "status-error" });
        return false;
      }
      if (!q.correctAnswer) {
        setMessage({ text: `Question ${i + 1}: Please select a correct answer option.`, type: "status-error" });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/quizzes",
        { ...quizMeta, questions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ text: "Quiz created successfully!", type: "status-success" });
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
              <div className={`form-card admin-status-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              
              {/* ── SECTION 1: QUIZ DETAILS ── */}
              <div className="form-card">
                <h3 className="form-card-title">Quiz Details</h3>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Quiz Title</label>
                    <input
                      type="text"
                      name="title"
                      value={quizMeta.title}
                      onChange={handleMetaChange}
                      placeholder="e.g. BPSC Test 5"
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
                      placeholder="e.g. Quantitative Aptitude"
                      required
                    />
                  </div>

                  <div className="form-field full-width">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={quizMeta.description}
                      onChange={handleMetaChange}
                      placeholder="Brief description of this quiz"
                      rows={3}
                    />
                  </div>

                  <div className="form-field">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      name="duration"
                      value={quizMeta.duration}
                      onChange={handleMetaChange}
                      placeholder="60"
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
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div className="form-field">
                    <label>Negative Marking</label>
                    <input
                      type="number"
                      name="negativeMarking"
                      value={quizMeta.negativeMarking}
                      onChange={handleMetaChange}
                      min="0"
                      step="0.25"
                    />
                  </div>

                  <div className="form-field checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        name="published"
                        checked={quizMeta.published}
                        onChange={handleMetaChange}
                      />
                      Publish immediately
                    </label>
                  </div>
                </div>
              </div>

              {/* ── SECTION 2: BULK IMPORT ── */}
              <div className="form-card">
                <h3 className="form-card-title">Import Questions from Word</h3>
                <DocxParser onQuestionsLoaded={handleQuestionsLoaded} />
              </div>

              {/* ── SECTION 3: QUESTION BUILDER ── */}
              <div className="form-card">
                <h3 className="form-card-title" style={{ justifyContent: "space-between" }}>
                  <span>Questions</span>
                  <span className="question-count-badge">
                    {questions.length} question{questions.length !== 1 ? "s" : ""}
                  </span>
                </h3>

                {questions.map((q, qIndex) => (
                  <div className="question-block" key={qIndex}>
                    
                    <div className="question-block-header">
                      <span className="question-number">Question {qIndex + 1}</span>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          className="remove-question-btn"
                          onClick={() => removeQuestion(qIndex)}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="form-grid">
                      <div className="form-field full-width">
                        <label>Question (English)</label>
                        <textarea
                          value={q.questionEnglish}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, "questionEnglish", e.target.value)
                          }
                          rows={2}
                          placeholder="Enter question in English"
                        />
                      </div>

                      <div className="form-field full-width">
                        <label>Question (Hindi) — optional</label>
                        <textarea
                          value={q.questionHindi}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, "questionHindi", e.target.value)
                          }
                          rows={2}
                          placeholder="हिंदी में प्रश्न लिखें"
                        />
                      </div>

                      {/* ── BILINGUAL 2x2 OPTIONS LAYOUT BLOCK ── */}
                      <div className="options-grid">
                        {["A", "B", "C", "D"].map((label, optIndex) => (
                          <div className="bilingual-option-card" key={label}>
                            <span className="option-label-tag">Option {label}</span>
                            <div className="bilingual-inputs-wrapper">
                              <input
                                type="text"
                                value={q.options[optIndex]?.english || ""}
                                onChange={(e) =>
                                  handleOptionChange(qIndex, optIndex, "english", e.target.value)
                                }
                                placeholder="English Text"
                                className="bilingual-opt-input"
                              />
                              <input
                                type="text"
                                value={q.options[optIndex]?.hindi || ""}
                                onChange={(e) =>
                                  handleOptionChange(qIndex, optIndex, "hindi", e.target.value)
                                }
                                placeholder="हिंदी पाठ (वैकल्पिक)"
                                className="bilingual-opt-input"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="form-field full-width">
                        <label>Correct Answer</label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, "correctAnswer", e.target.value)
                          }
                        >
                          <option value="">Select correct answer</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>

                    </div>
                  </div>
                ))}

                <button type="button" className="add-question-btn" onClick={addQuestion}>
                  + Add Question Manually
                </button>
              </div>

              {/* ── SUBMIT QUIZ ACTION ── */}
              <button type="submit" className="submit-quiz-btn" disabled={loading}>
                {loading ? "Creating quiz…" : "Create Quiz"}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateQuiz;