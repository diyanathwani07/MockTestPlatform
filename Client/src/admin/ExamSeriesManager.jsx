import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Search, Plus, Trash2, Edit2, AlertCircle, RefreshCw } from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function ExamSeriesManager() {
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  
  // Modals / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "General",
    isPublished: true,
  });

  const fetchSeries = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-series`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setSeriesList(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch Exam Series data. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      category: "General",
      isPublished: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (series) => {
    setEditingId(series._id);
    setFormData({
      title: series.title,
      description: series.description || "",
      category: series.category || "General",
      isPublished: series.isPublished ?? true,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editingId) {
        // Edit update
        await axios.put(`${import.meta.env.VITE_API_URL}/api/exam-series/${editingId}`, formData, { headers });
      } else {
        // Create new
        await axios.post(`${import.meta.env.VITE_API_URL}/api/exam-series`, formData, { headers });
      }
      setIsModalOpen(false);
      fetchSeries();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit Exam Series details.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Exam Series? Any linked quizzes will lose their parent grouping.")) return;
    setError("");
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/exam-series/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      fetchSeries();
    } catch (err) {
      console.error(err);
      setError("Failed to delete Exam Series.");
    }
  };

  const filteredSeries = seriesList.filter(s => 
    s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Exam Series Management" />
        
        <div className="admin-content manage-series-view-container">
          <div className="manage-quizzes-container">
            
            {/* Top Toolbar Actions */}
            <div className="manage-quizzes-header">
              <div className="search-bar-container">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search series or categories..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="header-actions">
                <button className="btn-refresh" onClick={fetchSeries} title="Refresh lists">
                  <RefreshCw size={18} />
                </button>
                <button className="btn-create-quiz" onClick={handleOpenCreate}>
                  <Plus size={18} /> Create Exam Series
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "8px", margin: "16px 0", display: "flex", gap: "8px", alignItems: "center" }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* List Table */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>Loading Exam Series details...</div>
            ) : filteredSeries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                No Exam Series matching search queries.
              </div>
            ) : (
              <div className="quizzes-table-wrapper" style={{ overflowX: "auto" }}>
                <table className="quizzes-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Exam Series Title</th>
                      <th>Slug</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSeries.map(s => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 600 }}>{s.title}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{s.slug}</td>
                        <td>
                          <span style={{ padding: "4px 8px", background: "rgba(110,63,243,0.1)", color: "#6E3FF3", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                            {s.category || "General"}
                          </span>
                        </td>
                        <td style={{ maxWidth: "300px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {s.description || "--"}
                        </td>
                        <td>
                          <span style={{ 
                            padding: "4px 8px", 
                            background: s.isPublished ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                            color: s.isPublished ? "#10B981" : "#F59E0B",
                            borderRadius: "12px",
                            fontSize: "12px", 
                            fontWeight: "600"
                          }}>
                            {s.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button 
                              onClick={() => handleOpenEdit(s)}
                              style={{ display: "flex", alignItems: "center", background: "transparent", border: "none", color: "var(--primary-color)", cursor: "pointer" }}
                              title="Edit Series"
                            >
                              <Edit2 size={16} />
                            </button>
                            {s.slug !== "ungrouped-mocks" && (
                              <button 
                                onClick={() => handleDelete(s._id)}
                                style={{ display: "flex", alignItems: "center", background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                                title="Delete Series"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Dialog */}
            {isModalOpen && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                <div style={{ background: "var(--bg-panel)", padding: "24px", borderRadius: "16px", width: "420px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
                  <h3 style={{ margin: "0 0 16px 0", color: "var(--text-primary)" }}>{editingId ? "Update Exam Series" : "Create Exam Series"}</h3>
                  <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)" }}>Series Title</label>
                      <input 
                        type="text" 
                        value={formData.title} 
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                        required
                        placeholder="e.g. UPTET / CTET"
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)" }}>Category</label>
                      <input 
                        type="text" 
                        value={formData.category} 
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                        placeholder="e.g. Teacher Exams"
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)" }}>Description (Optional)</label>
                      <textarea 
                        value={formData.description} 
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", resize: "none" }}
                        rows={3}
                        placeholder="Provide details about papers inside this Exam Series..."
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                      <input 
                        type="checkbox"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "#6E3FF3" }}
                        id="isPublishedCheck"
                      />
                      <label htmlFor="isPublishedCheck" style={{ fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer" }}>Publish Series (Visible to candidates)</label>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                      <button 
                        type="button" 
                        onClick={() => setIsModalOpen(false)}
                        style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-secondary)", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        style={{ padding: "8px 16px", borderRadius: "8px", background: "#6E3FF3", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" }}
                      >
                        {editingId ? "Update" : "Create"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamSeriesManager;
