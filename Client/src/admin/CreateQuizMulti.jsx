import React, { useState, useEffect } from "react";
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
  explanation: "",
  correctOptionIndex: -1,
});

const defaultSection = (index) => ({
  id: Date.now().toString() + index,
  title: `Section ${index + 1}`,
  description: "",
  type: "standard", // or "coding"
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
  });

  const [sections, setSections] = useState([defaultSection(0)]);
  const [activeSectionId, setActiveSectionId] = useState(sections[0].id);
  const [activeDifficulty, setActiveDifficulty] = useState("easy"); // For coding sections

  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  // Handlers for Meta
  const handleMetaChange = (e) => setQuizMeta({ ...quizMeta, [e.target.name]: e.target.value });

  // Handlers for Sections
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

  // Question Handlers
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

  // Import Docx
  const handleDocxImport = (parsedQs) => {
    setActiveQuestions([...getActiveQuestions(), ...parsedQs]);
    setMessage({ text: `Imported ${parsedQs.length} questions into the active section.`, type: "success" });
  };

  // Save
  const handleSave = async (isPublishing = false) => {
    setLoading(true);
    setMessage({ text: "", type: "" });
    try {
       // calculate global duration if empty
       const globalDuration = (parseInt(quizMeta.durationMin || 0) * 60) + parseInt(quizMeta.durationSec || 0);
       
       const payloadSections = sections.map(sec => {
          return {
             ...sec,
             duration: (parseInt(sec.durationMin || 0) * 60) + parseInt(sec.durationSec || 0),
          };
       });

       const payload = {
         ...quizMeta,
         duration: globalDuration,
         published: isPublishing,
         status: isPublishing ? "Published" : "Draft",
         sections: payloadSections,
         questions: [] // legacy
       };

       await axios.post(`${import.meta.env.VITE_API_URL}/api/quizzes`, payload, {
         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
       });

       setMessage({ text: "Quiz saved successfully!", type: "success" });
       setTimeout(() => navigate("/admin/manage-quizzes"), 1500);
    } catch(err) {
       console.error(err);
       setMessage({ text: "Failed to save quiz.", type: "error" });
    }
    setLoading(false);
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main-content">
        <AdminNavbar title="Create Multi-Section Assessment" />
        
        <div className="create-quiz-container animate-fade-in" style={{ padding: "24px" }}>
          
          {message.text && (
            <div className={`message-banner ${message.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: "20px", padding: "12px", borderRadius: "8px", background: message.type === 'error' ? '#fecaca' : '#bbf7d0', color: message.type === 'error' ? '#991b1b' : '#166534' }}>
              {message.text}
            </div>
          )}

          <div style={{ display: "flex", gap: "24px" }}>
             {/* LEFT SIDEBAR: Sections List */}
             <div style={{ width: "250px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "16px" }}>Sections</h3>
                
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
                       <span style={{ fontWeight: 600 }}>{sec.title || `Section ${i+1}`}</span>
                       <span style={{ fontSize: "12px", opacity: 0.8 }}>{sec.type}</span>
                     </div>
                     <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        {i > 0 && (
                          <button onClick={() => moveSection(i, 'up')} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}>↑</button>
                        )}
                        {i < sections.length - 1 && (
                          <button onClick={() => moveSection(i, 'down')} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}>↓</button>
                        )}
                     </div>
                   </div>
                ))}

                <button 
                  onClick={handleAddSection}
                  style={{ padding: "10px", background: "transparent", border: "1px dashed var(--primary-color)", color: "var(--primary-color)", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                >
                  + Add Section
                </button>

                <hr style={{ borderColor: "var(--border-input)", margin: "16px 0" }} />
                
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "16px" }}>Global Settings</h3>
                <input type="text" name="title" value={quizMeta.title} onChange={handleMetaChange} placeholder="Assessment Title" className="admin-input" />
                <input type="text" name="subject" value={quizMeta.subject} onChange={handleMetaChange} placeholder="Subject Category" className="admin-input" />
                <input type="text" name="examName" value={quizMeta.examName} onChange={handleMetaChange} placeholder="Exam Name (e.g. TCS NQT)" className="admin-input" />
                <input type="text" name="description" value={quizMeta.description} onChange={handleMetaChange} placeholder="Description" className="admin-input" />
                
                <label style={{ color: "var(--text-muted)", fontSize: "12px" }}>Global Duration (Optional)</label>
                <div style={{ display: "flex", gap: "8px" }}>
                   <input type="number" name="durationMin" value={quizMeta.durationMin} onChange={handleMetaChange} placeholder="Min" className="admin-input" />
                   <input type="number" name="durationSec" value={quizMeta.durationSec} onChange={handleMetaChange} placeholder="Sec" className="admin-input" />
                </div>
                
                <button 
                  onClick={() => handleSave(false)} 
                  disabled={loading}
                  style={{ padding: "12px", background: "var(--bg-input)", color: "var(--text-main)", border: "1px solid var(--border-input)", borderRadius: "8px", cursor: "pointer", marginTop: "20px" }}
                >
                  Save as Draft
                </button>
                <button 
                  onClick={() => handleSave(true)} 
                  disabled={loading}
                  style={{ padding: "12px", background: "var(--primary-color)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "8px" }}
                >
                  Publish Assessment
                </button>
             </div>

             {/* MAIN AREA: Active Section Editor */}
             <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Section Config */}
                <div className="form-card" style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                   <h3 style={{ margin: "0 0 16px 0", color: "var(--primary-color)" }}>Section Configuration</h3>
                   
                   <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                         <label>Section Title</label>
                         <input type="text" name="title" value={activeSection.title} onChange={handleSectionMetaChange} className="admin-input" />
                      </div>
                      <div>
                         <label>Section Type</label>
                         <select name="type" value={activeSection.type} onChange={handleSectionMetaChange} className="admin-input">
                            <option value="standard">Standard (MCQ)</option>
                            <option value="coding">Coding (Multi-Difficulty)</option>
                         </select>
                      </div>
                   </div>

                   <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "16px" }}>
                      <div>
                         <label>Marks Per Question</label>
                         <input type="number" name="marksPerQuestion" value={activeSection.marksPerQuestion} onChange={handleSectionMetaChange} className="admin-input" />
                      </div>
                      <div>
                         <label>Negative Marking</label>
                         <input type="number" name="negativeMarking" value={activeSection.negativeMarking} onChange={handleSectionMetaChange} className="admin-input" />
                      </div>
                      <div>
                         <label>Question Limit (0=All)</label>
                         <input type="number" name="questionLimit" value={activeSection.questionLimit} onChange={handleSectionMetaChange} className="admin-input" />
                      </div>
                      <div>
                         <label>Duration (Minutes)</label>
                         <input type="number" name="durationMin" value={activeSection.durationMin} onChange={handleSectionMetaChange} className="admin-input" />
                      </div>
                      <div>
                         <label>Duration (Seconds)</label>
                         <input type="number" name="durationSec" value={activeSection.durationSec} onChange={handleSectionMetaChange} className="admin-input" />
                      </div>
                   </div>
                </div>

                {/* Section Questions */}
                <div className="form-card" style={{ padding: "20px", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={{ margin: 0, color: "var(--text-main)" }}>Questions</h3>
                      <div style={{ width: "300px" }}>
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

                   <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {getActiveQuestions().map((q, qIndex) => {
                         const isExpanded = !!expandedQuestions[qIndex];
                         return (
                            <div key={qIndex} style={{ border: "1px solid var(--border-input)", borderRadius: "8px", overflow: "hidden" }}>
                               <div 
                                 onClick={() => toggleQuestionExpand(qIndex)}
                                 style={{ padding: "12px 16px", background: "var(--bg-input)", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                               >
                                  <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Question {qIndex + 1}</span>
                                  <div style={{ display: "flex", gap: "12px" }}>
                                    <button onClick={(e) => { e.stopPropagation(); removeQuestion(qIndex); }} style={{ color: "red", background: "none", border: "none", cursor: "pointer" }}>Delete</button>
                                    <span style={{ color: "var(--text-muted)" }}>{isExpanded ? "▲" : "▼"}</span>
                                  </div>
                               </div>

                               {isExpanded && (
                                  <div style={{ padding: "16px", background: "var(--bg-main)" }}>
                                     <label>Question text (English)</label>
                                     <textarea 
                                       value={q.questionEnglish}
                                       onChange={(e) => handleQuestionChange(qIndex, 'questionEnglish', e.target.value)}
                                       className="admin-input" 
                                       style={{ minHeight: "80px", marginBottom: "12px" }}
                                     />

                                     <label>Options (Select correct one)</label>
                                     <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                                        {q.options.map((opt, oIndex) => (
                                           <div key={oIndex} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                              <input 
                                                type="radio" 
                                                name={`correct-${activeSectionId}-${activeDifficulty}-${qIndex}`} 
                                                checked={q.correctOptionIndex === oIndex}
                                                onChange={() => setCorrectOption(qIndex, oIndex)}
                                              />
                                              <input 
                                                type="text"
                                                value={opt}
                                                onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                className="admin-input"
                                                placeholder={`Option ${oIndex + 1}`}
                                              />
                                           </div>
                                        ))}
                                     </div>
                                     
                                     <label>Explanation (Optional)</label>
                                     <textarea 
                                       value={q.explanation}
                                       onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                                       className="admin-input" 
                                       style={{ minHeight: "60px" }}
                                     />
                                  </div>
                               )}
                            </div>
                         );
                      })}

                      <button 
                        onClick={addQuestion}
                        style={{ padding: "12px", background: "rgba(108, 93, 211, 0.1)", color: "var(--primary-color)", border: "1px dashed var(--primary-color)", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
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
  );
}

export default CreateQuizMulti;
