import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Edit2, Trash2, Plus, Eye, Copy, Layers, ChevronRight } from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function AdminFlashcards() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filter, setFilter] = useState("All");

  const fetchSets = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/admin/sets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSets(res.data);
    } catch (error) {
      console.error("Error fetching sets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this flashcard set?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/flashcards/admin/sets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSets();
    } catch (error) {
      console.error("Error deleting set:", error);
    }
  };

  const publishedCount = sets.filter(s => s.status === "Published").length;
  const draftCount = sets.length - publishedCount;

  const filteredSets = sets.filter(s => filter === "All" || s.status === filter);

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title={<span>Flashcard Sets</span>} />
        
        <div className="admin-content" style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          
          {/* Header Banner */}
          <div style={{
            background: "linear-gradient(135deg, #15102a 0%, #1d173b 100%)",
            borderRadius: "16px",
            padding: "24px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            border: "1px solid rgba(255, 255, 255, 0.03)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            flexWrap: "wrap",
            gap: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "14px",
                background: "linear-gradient(135deg, #6c3ce9 0%, #4f22c9 100%)",
                display: "flex", justifyContent: "center", alignItems: "center",
                boxShadow: "0 4px 20px rgba(108, 60, 233, 0.4)",
                color: "#fff"
              }}>
                <Layers size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#fff", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>Flashcard Sets</h2>
                <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.6)", margin: 0 }}>Manage all flashcard sets across the platform.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate("/admin/flashcards/create")}
              style={{
                background: "linear-gradient(90deg, #ff715b 0%, #ff5238 100%)",
                color: "#fff",
                border: "none",
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(255, 82, 56, 0.3)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <Plus size={18} /> Create New Set
            </button>
          </div>

          {!loading && sets.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "32px" }}>
              {/* Total Sets */}
              <div 
                onClick={() => setFilter("All")}
                style={{ cursor: "pointer", background: "#161329", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "20px", border: filter === "All" ? "1px solid #c4b5fd" : "1px solid rgba(110, 63, 243, 0.15)", transition: "all 0.2s" }} 
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} 
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ background: "rgba(110, 63, 243, 0.15)", width: "52px", height: "52px", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center", color: "#8b5cf6" }}>
                  <Layers size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", color: "#c4b5fd", fontWeight: "500" }}>Total Sets</span>
                    <ChevronRight size={14} color="rgba(196, 181, 253, 0.5)" />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#fff", lineHeight: "1.2" }}>{sets.length}</div>
                </div>
              </div>

              {/* Published */}
              <div 
                onClick={() => setFilter("Published")}
                style={{ cursor: "pointer", background: "#0d211e", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "20px", border: filter === "Published" ? "1px solid #6ee7b7" : "1px solid rgba(16, 185, 129, 0.15)", transition: "all 0.2s" }} 
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} 
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ background: "rgba(16, 185, 129, 0.15)", width: "52px", height: "52px", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center", color: "#10b981" }}>
                  <Eye size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", color: "#6ee7b7", fontWeight: "500" }}>Published</span>
                    <ChevronRight size={14} color="rgba(110, 231, 183, 0.5)" />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#fff", lineHeight: "1.2" }}>{publishedCount}</div>
                </div>
              </div>

              {/* Drafts */}
              <div 
                onClick={() => setFilter("Draft")}
                style={{ cursor: "pointer", background: "#251a14", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "20px", border: filter === "Draft" ? "1px solid #fcd34d" : "1px solid rgba(245, 158, 11, 0.15)", transition: "all 0.2s" }} 
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} 
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ background: "rgba(245, 158, 11, 0.15)", width: "52px", height: "52px", borderRadius: "14px", display: "flex", justifyContent: "center", alignItems: "center", color: "#f59e0b" }}>
                  <Edit2 size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", color: "#fcd34d", fontWeight: "500" }}>Drafts</span>
                    <ChevronRight size={14} color="rgba(252, 211, 77, 0.5)" />
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#fff", lineHeight: "1.2" }}>{draftCount}</div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
              <div style={{ width: "40px", height: "40px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#8b5cf6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
              Loading Flashcard Sets...
            </div>
          ) : sets.length === 0 ? (
            <div style={{ background: "#111019", borderRadius: "16px", padding: "60px 20px", textAlign: "center", border: "1px solid rgba(255,255,255,0.03)" }}>
              <div style={{ width: "64px", height: "64px", background: "rgba(110, 63, 243, 0.1)", color: "#8b5cf6", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 20px" }}>
                <Layers size={32} />
              </div>
              <h3 style={{ fontSize: "18px", color: "#fff", marginBottom: "8px", fontWeight: "600" }}>No flashcard sets yet</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>Get started by creating your first flashcard set. You can group them by exam series and subjects.</p>
              <button 
                onClick={() => navigate("/admin/flashcards/create")}
                style={{ background: "#ff6146", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#ff7a63"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#ff6146"}
              >
                Create New Set
              </button>
            </div>
          ) : (
            <div style={{ background: "#111019", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.03)", overflow: "hidden" }}>
              <div className="table-responsive">
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Title & Details</th>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Hierarchy Map</th>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Cards</th>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Status</th>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSets.map(set => (
                      <tr key={set._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(110, 63, 243, 0.15)", display: "flex", justifyContent: "center", alignItems: "center", color: "#8b5cf6", flexShrink: 0 }}>
                              <Layers size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff", marginBottom: "4px" }}>{set.title}</div>
                              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {set.difficulty} • {set.isPaid ? <span style={{ color: "#ef4444" }}>Paid (₹{set.price})</span> : <span style={{ color: "#10b981" }}>Free</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ fontSize: "13px", color: "#fff", marginBottom: "4px", fontWeight: "500" }}>{set.examSeriesId?.title || "No Series Linked"}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{set.subjectName || "All Subjects"} {set.topic ? `> ${set.topic}` : ""}</div>
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "center", fontSize: "14px", fontWeight: "600", color: "#fff" }}>{set.totalCards || 0}</td>
                        <td style={{ padding: "16px 24px", textAlign: "center" }}>
                          <span style={{ 
                            padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "600",
                            background: set.status === "Published" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                            color: set.status === "Published" ? "#10B981" : "#F59E0B"
                          }}>
                            {set.status}
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button 
                              onClick={() => navigate(`/admin/flashcards/${set._id}/manage`)} 
                              title="Manage Cards"
                              style={{ width: "32px", height: "32px", borderRadius: "50%", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => navigate(`/admin/flashcards/edit/${set._id}`)} 
                              title="Edit Settings"
                              style={{ width: "32px", height: "32px", borderRadius: "50%", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(set._id)} 
                              title="Delete"
                              style={{ width: "32px", height: "32px", borderRadius: "50%", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#ef4444", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "#ef4444"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AdminFlashcards;