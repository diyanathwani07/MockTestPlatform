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
});

function CreateQuiz() {
  const navigate = useNavigate();

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

  const handleMetaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizMeta((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleQuestionsLoaded = (parsedQuestions) => {
    setQuestions(parsedQuestions);
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
      updated[qIndex] = { ...updated[qIndex], options: newOptions };
      return updated;
    });
  };

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

  const removeQuestion = (index) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index));

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
      if (q.options.some((opt) => !opt.trim())) {
        setMessage({ text: `Question ${i + 1}: All four options must be filled.`, type: "status-error" });
        return false;
      }
      if (!q.correctAnswer) {
        setMessage({ text: `Question ${i + 1}: Please select the correct answer.`, type: "status-error" });
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
      setMessage({ text: "✅ Quiz created successfully!", type: "status-success" });
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

            <form onSubmit={handleSubmit}>

              {/* ── QUIZ DETAILS ── */}
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
                      rows={2}
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

              {/* ── IMPORT FROM WORD ── */}
              <div className="form-card">
                <h3 className="form-card-title">Import Questions from Word</h3>
                <DocxParser onQuestionsLoaded={handleQuestionsLoaded} />
              </div>

              {/* ── QUESTION BUILDER ── */}
              <div className="form-card">
                <h3 className="form-card-title">
                  Questions
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

                      {["A", "B", "C", "D"].map((label, optIndex) => (
                        <div className="form-field" key={label}>
                          <label>Option {label}</label>
                          <input
                            type="text"
                            value={q.options[optIndex]}
                            onChange={(e) =>
                              handleOptionChange(qIndex, optIndex, e.target.value)
                            }
                            placeholder={`Option ${label}`}
                          />
                        </div>
                      ))}

                      <div className="form-field">
                        <label>Correct Answer</label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) =>
                            handleQuestionChange(qIndex, "correctAnswer", e.target.value)
                          }
                        >
                          <option value="">Select correct answer</option>
                          {q.options.map((opt, i) =>
                            opt ? (
                              <option key={i} value={opt}>
                                {["A", "B", "C", "D"][i]}. {opt}
                              </option>
                            ) : null
                          )}
                        </select>
                      </div>

                    </div>
                  </div>
                ))}

                <button type="button" className="add-question-btn" onClick={addQuestion}>
                  + Add Question Manually
                </button>
              </div>

              <button type="submit" className="submit-quiz-btn" disabled={loading}>
                {loading
                  ? "Creating quiz…"
                  : `Create Quiz (${questions.length} Question${questions.length !== 1 ? "s" : ""})`}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateQuiz;