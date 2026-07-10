import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminNavbar from "./components/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar";
import { Plus, Eye, Edit2, Trash2, Bot, Loader, X } from "lucide-react";

function PracticeQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingAiFor, setGeneratingAiFor] = useState(null); // id of quiz being generated
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null); // null means creating
  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
    questions: []
  });

  const emptyQuestion = {
    questionEnglish: "",
    questionHindi: "",
    options: ["", "", "", ""],
    correctAnswer: ""
  };

  const openCreateModal = () => {
    setEditingQuizId(null);
    setForm({
      title: "",
      subject: "",
      description: "",
      questions: [{ ...emptyQuestion, options: ["", "", "", ""] }]
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
      })) : []
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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
      
      if (editingQuizId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/practice/${editingQuizId}`, form, { headers });
        alert("Practice quiz updated successfully");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/practice`, form, { headers });
        alert("Practice quiz created successfully");
      }
      
      setIsModalOpen(false);
      fetchQuizzes();
    } catch (error) {
      console.error("Save Quiz Error:", error);
      alert(error.response?.data?.message || "Failed to save practice quiz");
    }
  };

  const fetchQuizzes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/practice`, {
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
    fetchQuizzes();
  }, []);

  const filteredQuizzes = quizzes.filter(q => {
    return q.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           q.subject?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/practice/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(quizzes.filter((q) => q._id !== id));
      } catch (error) {
        console.error("Delete Error:", error);
        alert("Failed to delete practice quiz");
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

  const calculateAiProgress = (quiz) => {
    if (!quiz.questions || quiz.questions.length === 0) return 0;
    const generatedCount = quiz.questions.filter(q => q.aiGenerated).length;
    return Math.round((generatedCount / quiz.questions.length) * 100);
  };

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, backgroundColor: "var(--bg-page)" }}>
        <AdminNavbar title="Manage Practice Quizzes" />
        
        <div className="admin-content" style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
          
          <div className="dashboard-header-modern" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div>
              <h1 style={{ color: "var(--text-main)", fontSize: "28px", margin: "0 0 8px 0" }}>AI Practice Modules</h1>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>Manage interactive practice tests with AI-generated explanations.</p>
            </div>
            
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <input 
                type="text" 
                placeholder="Search practice modules..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-primary)",
                  width: "250px"
                }}
              />
              
              {/* Note: In a real app we'd have a Create/Edit page, but we'll navigate to a simplified builder */}
              <button 
                onClick={openCreateModal}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "var(--primary-color)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "500",
                  transition: "all 0.2s"
                }}
              >
                <Plus size={18} /> Create Practice Quiz
              </button>
            </div>
          </div>

          <div style={{ 
            backgroundColor: "var(--bg-card)", 
            borderRadius: "16px", 
            border: "1px solid var(--border-color)",
            boxShadow: "var(--card-shadow)",
            overflow: "hidden" 
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
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ 
                    borderBottom: "1px solid var(--border-color)", 
                    backgroundColor: "var(--bg-input)" 
                  }}>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>Title</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>Subject</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>Questions</th>
                    <th style={{ padding: "16px", textAlign: "left", color: "var(--text-muted)", fontWeight: "500" }}>AI Status</th>
                    <th style={{ padding: "16px", textAlign: "right", color: "var(--text-muted)", fontWeight: "500" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuizzes.map((quiz) => {
                    const aiProgress = calculateAiProgress(quiz);
                    return (
                      <tr key={quiz._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "16px", color: "var(--text-primary)" }}>
                          <div style={{ fontWeight: "500" }}>{quiz.title}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Created: {new Date(quiz.createdAt).toLocaleDateString()}
                          </div>
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
                        <td style={{ padding: "16px", color: "var(--text-main)" }}>
                          {quiz.questions?.length || 0}
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
                        <td style={{ padding: "16px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            
                            <button 
                              onClick={() => handleGenerateAI(quiz._id)}
                              disabled={aiProgress === 100 || generatingAiFor === quiz._id}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: aiProgress === 100 ? "rgba(74, 222, 128, 0.1)" : "rgba(108, 93, 211, 0.1)",
                                color: aiProgress === 100 ? "#4ade80" : "var(--primary-color)",
                                border: aiProgress === 100 ? "1px solid rgba(74, 222, 128, 0.2)" : "1px solid rgba(108, 93, 211, 0.2)",
                                borderRadius: "6px",
                                cursor: aiProgress === 100 || generatingAiFor === quiz._id ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "13px"
                              }}
                            >
                              {generatingAiFor === quiz._id ? (
                                <><Loader size={14} className="spin" /> Generating...</>
                              ) : (
                                <><Bot size={14} /> {aiProgress === 100 ? "AI Ready" : "Gen AI"}</>
                              )}
                            </button>

                            <button 
                              onClick={() => openEditModal(quiz)}
                              style={{
                                padding: "6px",
                                backgroundColor: "rgba(108, 93, 211, 0.1)",
                                color: "var(--primary-color)",
                                border: "1px solid rgba(108, 93, 211, 0.2)",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              <Edit2 size={16} />
                            </button>

                            <button 
                              onClick={() => handleDelete(quiz._id, quiz.title)}
                              style={{
                                padding: "6px",
                                backgroundColor: "rgba(255, 68, 68, 0.1)",
                                color: "#ff4444",
                                border: "1px solid rgba(255, 68, 68, 0.2)",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
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
      />

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default PracticeQuizzes;

// Modal Overlay component rendered when open
function PracticeQuizModal({ isOpen, setIsOpen, editingQuizId, form, setForm, handleSubmit, addQuestion, removeQuestion, handleQuestionChange, handleOptionChange }) {
  if (!isOpen) return null;
  return (
    <div className="ticket-modal-overlay center-overlay" onClick={() => setIsOpen(false)} style={{ zIndex: 1100 }}>
      <div 
        className="ticket-modal center-modal" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '850px', 
          width: '95%', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column' 
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

            <div style={{ display: 'flex', alignItems: 'center', justifySpace: 'space-between', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Questions ({form.questions.length})</h4>
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
              style={{
                padding: "10px 20px",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              style={{
                padding: "10px 24px",
                backgroundColor: "var(--primary-color)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              {editingQuizId ? "Save Changes" : "Create Quiz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
