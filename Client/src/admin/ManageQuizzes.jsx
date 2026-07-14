import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminNavbar from "./components/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar";
import { Eye, Edit2, Calendar, Trash2, Copy, Search, EyeOff, UploadCloud } from "lucide-react";

function ManageQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedExportQuiz, setSelectedExportQuiz] = useState(null);
  const navigate = useNavigate();

  const fetchQuizzes = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes`);
      setQuizzes(response.data);
    } catch (error) {
      console.error("Fetch Quizzes Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const filteredQuizzes = quizzes.filter(q => {
    const matchesSearch = q.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          q.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (filterDate && q.createdAt) {
      const qDate = new Date(q.createdAt).toISOString().split('T')[0];
      matchesDate = qDate === filterDate;
    }

    return matchesSearch && matchesDate;
  });

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/quizzes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setQuizzes(quizzes.filter(q => q._id !== id));
      } catch (error) {
        console.error("Delete Quiz Error:", error);
        alert("Failed to delete quiz.");
      }
    }
  };

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <AdminSidebar />

      <div className="admin-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-page)" }}>
        <AdminNavbar title="Manage Quizzes" />

        <div className="admin-content" style={{ flex: 1, textAlign: "left" }}>

          {/* ─── APEX COMMAND BAR ─── */}
          <div className="armored-admin-card manage-command-bar-card" style={{ 
            backgroundColor: "var(--bg-card)", 
            border: "1.5px solid var(--border-color)", 
            borderRadius: "16px", 
            marginBottom: "28px", 
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            textAlign: "left"
          }}>
            
            <div style={{ marginBottom: "16px", textAlign: "left" }}>
              <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", fontFamily: "'Fraunces', serif", margin: "0 0 4px 0" }}>
                Active Assessment Modules
              </h2>
              <span style={{ fontSize: "13px", color: "var(--violet)", fontWeight: "600" }}>
                Total Quizzes in Bank: {filteredQuizzes.length}
              </span>
            </div>

            <div style={{ display: "flex", gap: "16px", width: "100%", maxWidth: "600px", flexWrap: "wrap" }}>
              {/* Sleek Rounded Search Bar */}
              <div style={{ 
                flex: 1,
                display: "flex", alignItems: "center", gap: "10px", 
                backgroundColor: "var(--bg-card)", border: "2px solid var(--violet)", 
                borderRadius: "100px", padding: "8px 16px",
                boxShadow: "0 4px 12px rgba(110, 63, 243, 0.1)", position: "relative"
              }}>
                <Search size={16} style={{ color: "var(--violet)", flexShrink: 0 }} />
                <input 
                  type="text" 
                  placeholder="Search quiz or subject..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "13px", color: "var(--text-primary)", fontWeight: "500", paddingRight: "24px" }}
                />
                {searchTerm && (
                  <span 
                    onClick={() => setSearchTerm("")}
                    style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", fontWeight: "bold" }}
                    title="Clear search"
                  >
                    ✕
                  </span>
                )}
              </div>

              {/* Date Filter */}
              <div style={{ 
                display: "flex", alignItems: "center", gap: "8px", 
                backgroundColor: "var(--bg-card)", border: "2px solid var(--border-color)", 
                borderRadius: "100px", padding: "8px 16px",
                position: "relative"
              }}>
                <span style={{ fontSize: "14px", color: "var(--text-secondary)", userSelect: "none" }}>📅</span>
                <input 
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ 
                    border: "none", 
                    background: "transparent", 
                    outline: "none", 
                    boxShadow: "none",
                    fontSize: "13px", 
                    color: "var(--text-primary)", 
                    fontWeight: "500", 
                    fontFamily: "inherit", 
                    paddingRight: filterDate ? "16px" : "0",
                    WebkitAppearance: "none"
                  }}
                />
                {filterDate && (
                  <span 
                    onClick={() => setFilterDate("")}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", fontWeight: "bold", background: "var(--bg-card)", paddingLeft: "4px" }}
                    title="Clear date filter"
                  >
                    ✕
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* ─── DATA TABLE ─── */}
          <div className="armored-admin-card" style={{ backgroundColor: "var(--bg-card)", border: "1.5px solid var(--border-color)", borderRadius: "16px", padding: 0, overflowX: "auto", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" }}>
            {loading ? (
              <div style={{ padding: "64px 20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "15px" }}>
                ⏳ Loading quizzes from database...
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-page)", borderBottom: "1.5px solid var(--border-color)", fontSize: "11px", color: "var(--text-primary)", textTransform: "uppercase" }}>
                    <th style={{ padding: "18px 28px", fontWeight: "700" }}>Exam</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Subject</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Title</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Duration</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Questions</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Date Created</th>
                    <th style={{ padding: "18px 24px", fontWeight: "700" }}>Status</th>
                    <th style={{ padding: "18px 28px", fontWeight: "700", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="report-table-body">
                  {filteredQuizzes.length > 0 ? (
                    filteredQuizzes.map((quiz) => (
                      <tr key={quiz._id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "14px" }}>
                        
                        <td style={{ padding: "18px 28px", fontWeight: "700", color: "var(--violet)", whiteSpace: "nowrap" }}>
                          {quiz.examName || "—"}
                        </td>
                        
                        <td style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: "600", whiteSpace: "nowrap" }}>
                          {quiz.subject}
                        </td>
                        
                        <td style={{ padding: "18px 24px", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                          {quiz.title}
                        </td>
                        
                        <td style={{ padding: "18px 24px", fontFamily: "'JetBrains Mono', monospace", fontWeight: "600", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {quiz.sections && quiz.sections.length > 0
                            ? Math.round((Number(quiz.duration) || 0) / 60)
                            : Math.round(Number(quiz.duration) || 0)} min
                        </td>
                        
                        <td style={{ padding: "18px 24px", fontWeight: "700", color: "var(--violet)", whiteSpace: "nowrap" }}>
                          {(() => {
                            if (quiz.sections && quiz.sections.length > 0) {
                              return quiz.sections.reduce((sum, sec) => {
                                const sectionData = sec.sectionId;
                                if (!sectionData) return sum;
                                let count = sectionData.questions?.length || 0;
                                if (sectionData.type === 'coding' && sectionData.subsections) {
                                  count += (sectionData.subsections.easy?.length || 0) +
                                           (sectionData.subsections.medium?.length || 0) +
                                           (sectionData.subsections.hard?.length || 0);
                                }
                                return sum + count;
                              }, 0);
                            }
                            return quiz.questions?.length || 0;
                          })()}
                        </td>

                        <td style={{ padding: "18px 24px", color: "var(--text-secondary)", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" }}>
                          {new Date(quiz.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                        </td>
                        
                        <td style={{ padding: "18px 24px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{
                              backgroundColor: 
                                quiz.status === "Published" ? "#E4F8F0" : 
                                quiz.status === "Scheduled" ? "#EFF6FF" : "#F1F5F9",
                              color: 
                                quiz.status === "Published" ? "#10B981" : 
                                quiz.status === "Scheduled" ? "#3B82F6" : "#475569",
                              padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "700", display: "inline-block", width: "max-content"
                            }}>
                              {quiz.status || "Draft"}
                            </span>
                            {quiz.scheduledDate && (
                              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600" }}>
                                {new Date(quiz.scheduledDate).toLocaleDateString('en-GB').replace(/\//g, '-')}, {new Date(quiz.scheduledDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: "18px 28px", textAlign: "right", overflow: "visible", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", position: "relative" }}>
                            <button 
                              onClick={() => setActiveDropdown(activeDropdown === quiz._id ? null : quiz._id)}
                              style={{ 
                                background: "transparent", 
                                border: "none", 
                                color: "var(--text-primary)", 
                                fontSize: "18px", 
                                fontWeight: "bold",
                                cursor: "pointer", 
                                padding: "4px 12px",
                                outline: "none"
                              }}
                              title="Quiz Actions"
                            >
                              ⋮
                            </button>
                            
                            {activeDropdown === quiz._id && (
                              <>
                                {/* Global backdrop to dismiss dropdown on outer click */}
                                <div 
                                  onClick={() => setActiveDropdown(null)}
                                  style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: "transparent" }}
                                />
                                
                                {/* Floating context dropdown menu */}
                                <div style={{ 
                                  position: "absolute", 
                                  right: 0, 
                                  top: "28px", 
                                  backgroundColor: "var(--bg-card)", 
                                  border: "1.5px solid var(--border-color)", 
                                  borderRadius: "10px", 
                                  padding: "6px 0", 
                                  minWidth: "130px", 
                                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)", 
                                  zIndex: 100,
                                  textAlign: "left"
                                }}>
                                  <div 
                                    onClick={() => { setActiveDropdown(null); navigate(`/quiz/${quiz._id}?preview=true`, { state: { subject: quiz.subject, title: quiz.title, duration: quiz.duration, examName: quiz.examName } }); }}
                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                  >
                                    <Eye size={15} /> Preview
                                  </div>
                                  <div 
                                    onClick={() => { 
                                      setActiveDropdown(null); 
                                      if (quiz.sections && quiz.sections.length > 1) {
                                        navigate(`/admin/edit-quiz-multi/${quiz._id}`);
                                      } else {
                                        navigate(`/admin/edit-quiz/${quiz._id}`); 
                                      }
                                    }}
                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                  >
                                    <Edit2 size={15} /> Edit
                                  </div>
                                    <div 
                                      onClick={() => { 
                                        setActiveDropdown(null); 
                                        if (quiz.sections && quiz.sections.length > 1) {
                                          navigate(`/admin/edit-quiz-multi/${quiz._id}`);
                                        } else {
                                          navigate(`/admin/edit-quiz/${quiz._id}`); 
                                        }
                                      }}
                                      style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                      <Calendar size={15} /> Schedule
                                    </div>
                                    {quiz.status === "Published" || quiz.published ? (
                                      <div 
                                        onClick={async () => {
                                          setActiveDropdown(null);
                                          if (window.confirm(`Are you sure you want to unpublish "${quiz.title}"? Students will no longer see it.`)) {
                                            try {
                                              const token = localStorage.getItem("token");
                                              await axios.put(`${import.meta.env.VITE_API_URL}/api/quizzes/${quiz._id}`, { published: false, status: "Draft" }, { headers: { Authorization: `Bearer ${token}` }});
                                              fetchQuizzes();
                                            } catch (error) { console.error("Failed to unpublish", error); }
                                          }
                                        }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                      >
                                        <EyeOff size={15} /> Unpublish
                                      </div>
                                    ) : (
                                      <div 
                                        onClick={async () => {
                                          setActiveDropdown(null);
                                          try {
                                            const token = localStorage.getItem("token");
                                            await axios.put(`${import.meta.env.VITE_API_URL}/api/quizzes/${quiz._id}`, { published: true, status: "Published", scheduledDate: null }, { headers: { Authorization: `Bearer ${token}` }});
                                            fetchQuizzes();
                                          } catch (error) { console.error("Failed to publish", error); }
                                        }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                      >
                                        <UploadCloud size={15} /> Publish
                                      </div>
                                    )}
                                  {quiz.sections && quiz.sections.length > 0 && (
                                    <div 
                                      onClick={() => { setActiveDropdown(null); setSelectedExportQuiz(quiz); }}
                                      style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = "var(--option-hover)"}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                    >
                                      <Copy size={15} /> Duplicate Section
                                    </div>
                                  )}
                                  <div 
                                    onClick={() => { setActiveDropdown(null); handleDelete(quiz._id, quiz.title); }}
                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--red)", transition: "background 0.15s", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(226, 67, 107, 0.08)"}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = "transparent"}
                                  >
                                    <Trash2 size={15} /> Delete
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ padding: "64px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>
                        No examination modules match "{searchTerm}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Export Section Modal */}
          {selectedExportQuiz && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                borderRadius: "16px",
                padding: "24px",
                width: "90%",
                maxWidth: "500px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
              }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>Create Standalone Quiz from Section</h3>
                <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                  Select a section from <strong>{selectedExportQuiz.title}</strong> to create a new standalone, draft quiz.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "250px", overflowY: "auto", marginBottom: "24px" }}>
                  {selectedExportQuiz.sections.map((sec) => {
                    const sectionData = sec.sectionId;
                    if (!sectionData) return null;
                    const secId = sectionData._id || sectionData;
                    return (
                      <div key={secId} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        backgroundColor: "var(--bg-sidebar)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "10px",
                        gap: "12px"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", textAlign: "left" }}>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{sectionData.title}</span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "capitalize" }}>
                            {sectionData.type} Section • {
                              sectionData.type === 'coding' && sectionData.subsections ? (
                                ((sectionData.subsections.easy?.length || 0) + (sectionData.subsections.medium?.length || 0) + (sectionData.subsections.hard?.length || 0))
                              ) : (
                                sectionData.questions?.length || 0
                              )
                            } Questions
                          </span>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("token");
                              await axios.post(
                                `${import.meta.env.VITE_API_URL}/api/quizzes/export-section`,
                                { quizId: selectedExportQuiz._id, sectionId: secId },
                                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                              );
                              alert(`Successfully created "${sectionData.title}" as standalone quiz.`);
                              setSelectedExportQuiz(null);
                              fetchQuizzes();
                            } catch (err) {
                              console.error(err);
                              alert(err.response?.data?.message || "Failed to create standalone quiz.");
                            }
                          }}
                          style={{
                            padding: "8px 14px",
                            borderRadius: "8px",
                            backgroundColor: "var(--violet)",
                            color: "#fff",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "opacity 0.2s"
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.target.style.opacity = "1"}
                        >
                          Create Standalone
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setSelectedExportQuiz(null)}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      backgroundColor: "transparent",
                      border: "1.5px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default ManageQuizzes;