import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/CreateQuiz.css"; // Re-using CreateQuiz CSS because the HTML is identical!

const emptyQuestion = () => ({
  questionEnglish: "",
  questionHindi: "",
  options: ["", "", "", ""],
  correctAnswer: "",
});

function EditQuiz() {
  const { id } = useParams(); // 🪝 THE HOOK: Grabs the MongoDB ID out of the URL bar
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

  const [questions, setQuestions] = useState([]);
  const [pageLoading, setPageLoading] = useState(true); // Spinner for the DB fetch
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // 🔄 THE REVERSE ENGINE: Fetch existing quiz data on load
  useEffect(() => {
    const fetchQuizToEdit = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/quizzes/${id}`);
        const dbQuiz = response.data;

        setQuizMeta({
          title: dbQuiz.title || "",
          subject: dbQuiz.subject || "",
          description: dbQuiz.description || "",
          duration: dbQuiz.duration || "",
          marksPerQuestion: dbQuiz.marksPerQuestion || 1,
          negativeMarking: dbQuiz.negativeMarking || 0,
          published: dbQuiz.published || false,
        });

        // Map the questions safely (Preserving MongoDB _id sub-keys!)
        const loadedQuestions = (dbQuiz.questions || []).map((q) => ({
          _id: q._id, // Critical for Mongoose to know we are UPDATING an existing question, not making a new one
          questionEnglish: q.questionEnglish || "",
          questionHindi: q.questionHindi || "",
          options: q.options?.length === 4 ? q.options : ["", "", "", ""],
          correctAnswer: q.correctAnswer || "",
        }));

        setQuestions(loadedQuestions.length > 0 ? loadedQuestions : [emptyQuestion()]);
      } catch (error) {
        console.error("Fetch Quiz Error:", error);
        setMessage({
          text: "Failed to load quiz data. This quiz may have been deleted.",
          type: "status-error",
        });
      } finally {
        setPageLoading(false);
      }
    };

    fetchQuizToEdit();
  }, [id]);

  const handleMetaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuizMeta((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
      if (!q.questionEnglish || !q.questionEnglish.trim()) {
        setMessage({ text: `Question ${i + 1}: English text is required.`, type: "status-error" });
        return false;
      }
      if (!q.options || q.options.some((opt) => !opt.trim())) {
        setMessage({ text: `Question ${i + 1}: All four options must be filled.`, type: "status-error" });
        return false;
      }
      if (!q.correctAnswer) {
        setMessage({ text: `Question ${i + 1}: Select a correct answer.`, type: "status-error" });
        return false;
      }
    }
    return true;
  };

  // 🚀 THE HTTP PUT: Overwrites the MongoDB record
  const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    if (!validateForm()) return;

    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Auto-Sanitizer
      const cleanQuestions = questions.map((q) => ({
        ...(q._id ? { _id: q._id } : {}),
        questionEnglish: q.questionEnglish,
        questionHindi: q.questionHindi,
        options: q.options.map((opt) => String(opt).trim()),
        correctAnswer: q.correctAnswer,
      }));

      const payload = { ...quizMeta, questions: cleanQuestions };

      await axios.put(`http://localhost:5000/api/quizzes/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ text: "✅ Quiz updated successfully!", type: "status-success" });
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
              <div style={{ textAlign: "center", padding: "50px", fontSize: "18px" }}>
                ⏳ Pulling quiz record from MongoDB...
              </div>
            ) : (
              <>
                {message.text && (
                  <p className={`admin-status-message ${message.type}`}>{message.text}</p>
                )}

                <form onSubmit={handleUpdate}>
                  {/* ── QUIZ DETAILS ── */}
                  <div className="form-card">
                    <h3 className="form-card-title">Quiz Meta</h3>
                    <div className="form-grid">
                      <div className="form-field">
                        <label>Quiz Title</label>
                        <input
                          type="text"
                          name="title"
                          value={quizMeta.title}
                          onChange={handleMetaChange}
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
                          required
                        />
                      </div>

                      <div className="form-field full-width">
                        <label>Description</label>
                        <textarea
                          name="description"
                          value={quizMeta.description}
                          onChange={handleMetaChange}
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
                          required
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
                          Published (Visible to Students)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* ── QUESTION BUILDER ── */}
                  <div className="form-card">
                    <h3 className="form-card-title">
                      Questions ({questions.length})
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
                            />
                          </div>

                          <div className="form-field full-width">
                            <label>Question (Hindi)</label>
                            <textarea
                              value={q.questionHindi}
                              onChange={(e) =>
                                handleQuestionChange(qIndex, "questionHindi", e.target.value)
                              }
                              rows={2}
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
                              <option value="">Select answer</option>
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

                  <button type="submit" className="submit-quiz-btn" disabled={submitLoading}>
                    {submitLoading ? "Updating Database..." : "💾 Save Changes & Update Quiz"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditQuiz;