import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminNavbar from "./components/AdminNavbar";
import AdminSidebar from "./components/AdminSidebar";
import { Plus, Eye, Edit2, Trash2, Bot, Loader } from "lucide-react";

function PracticeQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingAiFor, setGeneratingAiFor] = useState(null); // id of quiz being generated
  const navigate = useNavigate();

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
                onClick={() => alert("We will build a simple Create screen for Practice Quizzes next!")}
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
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default PracticeQuizzes;
