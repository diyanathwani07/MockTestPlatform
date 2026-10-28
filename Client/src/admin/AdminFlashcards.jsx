import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Edit2, Trash2, Plus, Eye, Copy, Layers, ChevronRight } from "lucide-react";
import { SkeletonExamCard } from "@/components/ui/skeleton";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function AdminFlashcards() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filter, setFilter] = useState("All");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        
        <div className="admin-content">
          
          {/* Header Banner */}
          <div style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            padding: isMobile ? "16px" : "24px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            flexDirection: isMobile ? "column" : "row",
            marginBottom: isMobile ? "16px" : "24px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            gap: isMobile ? "14px" : "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "14px" : "20px" }}>
              <div style={{
                width: isMobile ? "44px" : "56px",
                height: isMobile ? "44px" : "56px",
                borderRadius: "12px",
                background: "var(--primary)",
                display: "flex", justifyContent: "center", alignItems: "center",
                boxShadow: "0 4px 20px rgba(108, 60, 233, 0.4)",
                color: "var(--primary-foreground)",
                flexShrink: 0
              }}>
                <Layers size={isMobile ? 22 : 28} />
              </div>
              <div>
                <h2 style={{ fontSize: isMobile ? "18px" : "24px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px 0", letterSpacing: "-0.5px" }}>Flashcard Sets</h2>
                <p style={{ fontSize: isMobile ? "12px" : "14px", color: "var(--text-secondary)", margin: 0 }}>Manage all flashcard sets across the platform.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate("/admin/flashcards/create")}
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                border: "none",
                padding: isMobile ? "10px 18px" : "12px 24px",
                borderRadius: "12px",
                fontSize: "13.5px",
                fontWeight: "600",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(255, 82, 56, 0.3)",
                transition: "all 0.2s",
                width: isMobile ? "100%" : "auto"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <Plus size={18} /> Create New Set
            </button>
          </div>

          {!loading && sets.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(auto-fit, minmax(280px, 1fr))",
              gap: isMobile ? "8px" : "20px",
              marginBottom: isMobile ? "18px" : "32px"
            }}>
              {/* Total Sets */}
              <div 
                onClick={() => setFilter("All")}
                style={{
                  cursor: "pointer",
                  background: "var(--bg-card)",
                  borderRadius: isMobile ? "12px" : "16px",
                  padding: isMobile ? "12px 8px" : "20px",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                  gap: isMobile ? "8px" : "20px",
                  border: filter === "All" ? "1.5px solid #c4b5fd" : "1px solid rgba(110, 63, 243, 0.15)",
                  boxShadow: filter === "All" ? "0 0 12px rgba(110, 63, 243, 0.2)" : "none",
                  transition: "all 0.2s"
                }} 
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} 
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{
                  background: "rgba(110, 63, 243, 0.15)",
                  width: isMobile ? "34px" : "52px",
                  height: isMobile ? "34px" : "52px",
                  borderRadius: isMobile ? "8px" : "14px",
                  display: "flex", justifyContent: "center", alignItems: "center",
                  color: "#8b5cf6",
                  flexShrink: 0
                }}>
                  <Layers size={isMobile ? 18 : 24} />
                </div>
                <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <span style={{ fontSize: isMobile ? "11px" : "13px", color: "var(--violet, #8b5cf6)", fontWeight: "600", whiteSpace: "nowrap" }}>Total Sets</span>
                    {!isMobile && <ChevronRight size={14} color="rgba(196, 181, 253, 0.5)" />}
                  </div>
                  <div style={{ fontSize: isMobile ? "20px" : "28px", fontWeight: "700", color: "var(--text-primary)", lineHeight: "1.2" }}>{sets.length}</div>
                </div>
              </div>

              {/* Published */}
              <div 
                onClick={() => setFilter("Published")}
                style={{
                  cursor: "pointer",
                  background: "var(--bg-card)",
                  borderRadius: isMobile ? "12px" : "16px",
                  padding: isMobile ? "12px 8px" : "20px",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                  gap: isMobile ? "8px" : "20px",
                  border: filter === "Published" ? "1.5px solid #6ee7b7" : "1px solid rgba(16, 185, 129, 0.15)",
                  boxShadow: filter === "Published" ? "0 0 12px rgba(16, 185, 129, 0.2)" : "none",
                  transition: "all 0.2s"
                }} 
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} 
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  width: isMobile ? "34px" : "52px",
                  height: isMobile ? "34px" : "52px",
                  borderRadius: isMobile ? "8px" : "14px",
                  display: "flex", justifyContent: "center", alignItems: "center",
                  color: "#10b981",
                  flexShrink: 0
                }}>
                  <Eye size={isMobile ? 18 : 24} />
                </div>
                <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <span style={{ fontSize: isMobile ? "11px" : "13px", color: "var(--green, #10b981)", fontWeight: "600", whiteSpace: "nowrap" }}>Published</span>
                    {!isMobile && <ChevronRight size={14} color="rgba(110, 231, 183, 0.5)" />}
                  </div>
                  <div style={{ fontSize: isMobile ? "20px" : "28px", fontWeight: "700", color: "var(--text-primary)", lineHeight: "1.2" }}>{publishedCount}</div>
                </div>
              </div>

              {/* Drafts */}
              <div 
                onClick={() => setFilter("Draft")}
                style={{
                  cursor: "pointer",
                  background: "var(--bg-card)",
                  borderRadius: isMobile ? "12px" : "16px",
                  padding: isMobile ? "12px 8px" : "20px",
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                  gap: isMobile ? "8px" : "20px",
                  border: filter === "Draft" ? "1.5px solid #fcd34d" : "1px solid rgba(245, 158, 11, 0.15)",
                  boxShadow: filter === "Draft" ? "0 0 12px rgba(245, 158, 11, 0.2)" : "none",
                  transition: "all 0.2s"
                }} 
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} 
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  width: isMobile ? "34px" : "52px",
                  height: isMobile ? "34px" : "52px",
                  borderRadius: isMobile ? "8px" : "14px",
                  display: "flex", justifyContent: "center", alignItems: "center",
                  color: "#f59e0b",
                  flexShrink: 0
                }}>
                  <Edit2 size={isMobile ? 18 : 24} />
                </div>
                <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <span style={{ fontSize: isMobile ? "11px" : "13px", color: "var(--yellow, #f59e0b)", fontWeight: "600", whiteSpace: "nowrap" }}>Drafts</span>
                    {!isMobile && <ChevronRight size={14} color="rgba(252, 211, 77, 0.5)" />}
                  </div>
                  <div style={{ fontSize: isMobile ? "20px" : "28px", fontWeight: "700", color: "var(--text-primary)", lineHeight: "1.2" }}>{draftCount}</div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonExamCard key={i} />
              ))}
            </div>
          ) : sets.length === 0 ? (
            <div style={{ background: "var(--bg-card)", borderRadius: "16px", padding: "60px 20px", textAlign: "center", border: "1px solid var(--border-color)" }}>
              <div style={{ width: "64px", height: "64px", background: "rgba(110, 63, 243, 0.1)", color: "#8b5cf6", borderRadius: "16px", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 20px" }}>
                <Layers size={32} />
              </div>
              <h3 style={{ fontSize: "18px", color: "var(--text-primary)", marginBottom: "8px", fontWeight: "600" }}>No flashcard sets yet</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>Get started by creating your first flashcard set. You can group them by exam series and subjects.</p>
              <button 
                onClick={() => navigate("/admin/flashcards/create")}
                style={{ background: "var(--primary)", color: "var(--primary-foreground, #fff)", border: "none", padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }}
              >
                Create New Set
              </button>
            </div>
          ) : isMobile ? (
            /* Mobile Cards View */
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "60px" }}>
              {filteredSets.map(set => (
                <div
                  key={set._id}
                  style={{
                    background: "var(--bg-card)",
                    borderRadius: "14px",
                    border: "1px solid var(--border-color)",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                  }}
                >
                  {/* Top Header Row: Icon + Title + Status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "10px",
                        background: "rgba(110, 63, 243, 0.12)",
                        color: "var(--primary, #8b5cf6)",
                        display: "flex", justifyContent: "center", alignItems: "center",
                        flexShrink: 0
                      }}>
                        <Layers size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }} title={set.title}>
                          {set.title}
                        </h4>
                        <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          <span>{set.difficulty}</span>
                          {" • "}
                          {set.isPaid ? (
                            <span style={{ color: "#ef4444", fontWeight: "600" }}>Paid (₹{set.price !== undefined && set.price !== null ? set.price : 99})</span>
                          ) : (
                            <span style={{ color: "#10b981", fontWeight: "600" }}>Free</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      flexShrink: 0,
                      background: set.status === "Published" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                      color: set.status === "Published" ? "#10B981" : "#F59E0B"
                    }}>
                      {set.status}
                    </span>
                  </div>

                  {/* Middle: Hierarchy & Card Count */}
                  <div style={{
                    background: "var(--bg-input, rgba(255,255,255,0.03))",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "11.5px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid var(--border-color)",
                    gap: "8px"
                  }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                        {set.examSeriesId?.title || "No Series"}
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {" › "}{set.subjectName || "All Subjects"}{set.topic ? ` › ${set.topic}` : ""}
                      </span>
                    </div>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "var(--primary, #8b5cf6)",
                      background: "rgba(124, 58, 237, 0.1)",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      flexShrink: 0,
                      whiteSpace: "nowrap"
                    }}>
                      {set.totalCards || 0} Cards
                    </span>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "2px" }}>
                    <button
                      onClick={() => navigate(`/admin/flashcards/${set._id}/manage`)}
                      style={{
                        flex: 1,
                        background: "rgba(124, 58, 237, 0.12)",
                        color: "var(--primary, #8b5cf6)",
                        border: "1.5px solid var(--primary, #8b5cf6)",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        cursor: "pointer"
                      }}
                    >
                      <Eye size={14} /> Manage Cards
                    </button>

                    <button
                      onClick={() => navigate(`/admin/flashcards/edit/${set._id}`)}
                      title="Edit Settings"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-primary)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                        flexShrink: 0
                      }}
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(set._id)}
                      title="Delete Set"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#ef4444",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        cursor: "pointer",
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop Table View */
            <div style={{ background: "var(--bg-card)", borderRadius: "16px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
              <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>Title & Details</th>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>Hierarchy Map</th>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "center", borderBottom: "1px solid var(--border-color)" }}>Cards</th>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "center", borderBottom: "1px solid var(--border-color)" }}>Status</th>
                      <th style={{ padding: "16px 24px", fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textAlign: "right", borderBottom: "1px solid var(--border-color)" }}>Actions</th>
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
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>{set.title}</div>
                              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {set.difficulty} • {set.isPaid ? <span style={{ color: "#ef4444" }}>Paid (₹{(set.price !== undefined && set.price !== null ? set.price : 99)})</span> : <span style={{ color: "#10b981" }}>Free</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ fontSize: "13px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: "500" }}>{set.examSeriesId?.title || "No Series Linked"}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{set.subjectName || "All Subjects"} {set.topic ? `> ${set.topic}` : ""}</div>
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "center", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>{set.totalCards || 0}</td>
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
