import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Search, Plus, Trash2, Edit2, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Layers, BookOpen, ArrowUp, ArrowDown, FileText, CheckCircle } from "lucide-react";
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "General", thumbnail: "",
    isPublished: true,
  });

  const [quizCounts, setQuizCounts] = useState({});

  // Exam Structures state for currently edited series
  const [structures, setStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [newStructureName, setNewStructureName] = useState("");
  const [expandedStructureId, setExpandedStructureId] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState({});
  const [structureError, setStructureError] = useState("");

  const fetchSeries = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-series`, { headers });
      const seriesData = res.data;
      setSeriesList(seriesData);

      // Fetch linked quiz counts for each series
      const countsMap = {};
      await Promise.all(
        seriesData.map(async (s) => {
          try {
            const qRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/quizzes?examSeriesId=${s._id}`, { headers });
            countsMap[s._id] = Array.isArray(qRes.data) ? qRes.data.length : 0;
          } catch {
            countsMap[s._id] = 0;
          }
        })
      );
      setQuizCounts(countsMap);
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

  const fetchStructuresForSeries = async (seriesId) => {
    if (!seriesId) return;
    setLoadingStructures(true);
    setStructureError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-structures?examSeriesId=${seriesId}`, { headers });
      setStructures(res.data);
    } catch (err) {
      console.error("Error fetching structures:", err);
      setStructureError("Failed to load exam structures.");
    } finally {
      setLoadingStructures(false);
    }
  };

  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    const formDataObj = new FormData();
    formDataObj.append("image", file);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload/image`, formDataObj, { headers });
      if (res.data.url) {
        setFormData(prev => ({ ...prev, thumbnail: res.data.url }));
        alert("Image uploaded successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      category: "General", thumbnail: "",
      isPublished: true,
    });
    setStructures([]);
    setNewStructureName("");
    setStructureError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (series) => {
    setEditingId(series._id);
    setFormData({
      title: series.title,
      description: series.description || "",
      category: series.category || "General", thumbnail: series.thumbnail || "",
      isPublished: series.isPublished ?? true,
    });
    setNewStructureName("");
    setStructureError("");
    setIsModalOpen(true);
    fetchStructuresForSeries(series._id);
  };

  // --- Structure & Subject Handler Functions ---
  const handleAddStructure = async () => {
    if (!editingId || !newStructureName.trim()) return;
    setStructureError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/exam-structures`,
        {
          examSeriesId: editingId,
          name: newStructureName.trim(),
          order: structures.length,
          subjects: [],
        },
        { headers }
      );
      setNewStructureName("");
      fetchStructuresForSeries(editingId);
    } catch (err) {
      console.error(err);
      setStructureError(err.response?.data?.message || "Failed to create structure.");
    }
  };

  const handleToggleStructureActive = async (struct) => {
    setStructureError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/exam-structures/${struct._id}`,
        { isActive: !struct.isActive },
        { headers }
      );
      fetchStructuresForSeries(editingId);
    } catch (err) {
      console.error(err);
      setStructureError(err.response?.data?.message || "Failed to update structure.");
    }
  };

  const handleReorderStructure = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= structures.length) return;

    const updated = [...structures];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setStructures(updated);

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await Promise.all(
        updated.map((s, idx) =>
          axios.put(`${import.meta.env.VITE_API_URL}/api/exam-structures/${s._id}`, { order: idx }, { headers })
        )
      );
    } catch (err) {
      console.error("Reorder failed:", err);
    }
  };

  const handleDeleteStructure = async (structId) => {
    if (!window.confirm("Are you sure you want to delete this structure?")) return;
    setStructureError("");
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/exam-structures/${structId}`, { headers });
      fetchStructuresForSeries(editingId);
    } catch (err) {
      console.error(err);
      setStructureError(err.response?.data?.message || "Failed to delete structure.");
    }
  };

  // Subject operations inside embedded array
  const handleAddSubject = async (struct) => {
    const nameStr = (newSubjectName[struct._id] || "").trim();
    if (!nameStr) return;
    setStructureError("");

    const currentSubjects = struct.subjects || [];
    const updatedSubjects = [
      ...currentSubjects,
      { name: nameStr, order: currentSubjects.length, isActive: true },
    ];

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/exam-structures/${struct._id}`,
        { subjects: updatedSubjects },
        { headers }
      );
      setNewSubjectName((prev) => ({ ...prev, [struct._id]: "" }));
      fetchStructuresForSeries(editingId);
    } catch (err) {
      console.error(err);
      setStructureError(err.response?.data?.message || "Failed to add subject.");
    }
  };

  const handleToggleSubjectActive = async (struct, subIndex) => {
    const updatedSubjects = (struct.subjects || []).map((s, idx) => {
      if (idx === subIndex) return { ...s, isActive: !s.isActive };
      return s;
    });

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/exam-structures/${struct._id}`,
        { subjects: updatedSubjects },
        { headers }
      );
      fetchStructuresForSeries(editingId);
    } catch (err) {
      console.error(err);
      setStructureError("Failed to update subject status.");
    }
  };

  const handleReorderSubject = async (struct, subIndex, direction) => {
    const targetIdx = direction === "up" ? subIndex - 1 : subIndex + 1;
    const currentSubs = [...(struct.subjects || [])];
    if (targetIdx < 0 || targetIdx >= currentSubs.length) return;

    const temp = currentSubs[subIndex];
    currentSubs[subIndex] = currentSubs[targetIdx];
    currentSubs[targetIdx] = temp;

    const updatedSubjects = currentSubs.map((s, idx) => ({ ...s, order: idx }));

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/exam-structures/${struct._id}`,
        { subjects: updatedSubjects },
        { headers }
      );
      fetchStructuresForSeries(editingId);
    } catch (err) {
      console.error(err);
    }
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
        
        <div className="admin-content manage-series-view-container" style={{ flex: 1, textAlign: "left" }}>

          {/* ─── COMMAND BAR ─── */}
          <div className="armored-admin-card" style={{ 
            backgroundColor: "var(--bg-card)", 
            border: "1.5px solid var(--border-color)", 
            borderRadius: "16px", 
            marginBottom: "24px", 
            padding: "20px 24px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ textAlign: "left" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px 0" }}>
                  Exam Series Overview
                </h2>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Manage categories, links, and series metadata.
                </span>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px", 
                  backgroundColor: "var(--bg-input, #FAFAFC)", border: "1px solid var(--border-color)", 
                  borderRadius: "10px", padding: "8px 14px", minWidth: "260px"
                }}>
                  <Search size={16} style={{ color: "var(--text-muted)" }} />
                  <input 
                    type="text" 
                    placeholder="Search series or categories..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", color: "var(--text-primary)" }}
                  />
                </div>
                
                <button onClick={fetchSeries} style={{ 
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "40px", height: "40px", borderRadius: "10px",
                  backgroundColor: "var(--bg-page)", border: "1px solid var(--border-color)",
                  color: "var(--text-primary)", cursor: "pointer"
                }} title="Refresh">
                  <RefreshCw size={16} />
                </button>
                
                <button onClick={handleOpenCreate} style={{ 
                  display: "flex", alignItems: "center", gap: "8px",
                  backgroundColor: "var(--primary)", color: "#fff",
                  border: "none", borderRadius: "10px", padding: "0 20px", height: "40px",
                  fontWeight: "600", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(110,63,243,0.2)"
                }}>
                  <Plus size={16} /> Create Series
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderRadius: "8px", margin: "0 0 24px 0", display: "flex", gap: "8px", alignItems: "center" }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

                        {/* ─── DATA TABLE CARD ─── */}
            <div className="armored-admin-card" style={{ 
              backgroundColor: "var(--bg-card)", 
              border: "1.5px solid var(--border-color)", 
              borderRadius: "16px",
              boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
              overflow: "hidden"
            }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: "12px" }} />
                  <div>Loading Exam Series details...</div>
                </div>
              ) : filteredSeries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
                  <Search size={32} style={{ opacity: 0.5, marginBottom: "12px" }} />
                  <div style={{ fontSize: "16px", fontWeight: "600" }}>No Exam Series Found</div>
                  <div style={{ fontSize: "13px" }}>Try adjusting your search filters.</div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "transparent", borderBottom: "1px solid var(--border-color)", fontSize: "11px", color: "var(--text-primary)", textTransform: "uppercase" }}>
                        <th style={{ padding: "18px 24px", fontWeight: "700" }}>Exam Series Title</th>
                        <th style={{ padding: "18px 24px", fontWeight: "700" }}>Slug</th>
                        <th style={{ padding: "18px 24px", fontWeight: "700" }}>Category</th>
                        <th style={{ padding: "18px 24px", fontWeight: "700" }}>Linked Quizzes</th>
                        <th style={{ padding: "18px 24px", fontWeight: "700" }}>Description</th>
                        <th style={{ padding: "18px 24px", fontWeight: "700" }}>Status</th>
                        <th style={{ padding: "18px 24px", fontWeight: "700", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="report-table-body">
                      {filteredSeries.map(s => (
                        <tr key={s._id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "14px" }}>
                          <td style={{ padding: "18px 24px", fontWeight: 600, color: "var(--text-primary)" }}>{s.title}</td>
                          <td style={{ padding: "18px 24px", color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "13px" }}>{s.slug}</td>
                          <td style={{ padding: "18px 24px" }}>
                            <span style={{ padding: "4px 10px", background: "rgba(110,63,243,0.1)", color: "#6E3FF3", borderRadius: "100px", fontSize: "12px", fontWeight: "700" }}>
                              {s.category || "General"}
                            </span>
                          </td>
                          <td style={{ padding: "18px 24px" }}>
                            <span style={{ 
                              padding: "4px 10px", 
                              background: quizCounts[s._id] > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", 
                              color: quizCounts[s._id] > 0 ? "#10B981" : "#EF4444",
                              borderRadius: "100px", 
                              fontSize: "12px", 
                              fontWeight: "700" 
                            }}>
                              {quizCounts[s._id] ?? 0} {quizCounts[s._id] === 1 ? "Quiz" : "Quizzes"}
                            </span>
                          </td>
                          <td style={{ padding: "18px 24px", maxWidth: "250px", color: "var(--text-secondary)" }}>
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {s.description || "--"}
                            </div>
                          </td>
                          <td style={{ padding: "18px 24px" }}>
                            <span style={{ 
                              padding: "4px 10px", 
                              background: s.isPublished ? "rgba(16,185,129,0.1)" : "rgba(107,114,128,0.1)", 
                              color: s.isPublished ? "#10B981" : "#6B7280", 
                              borderRadius: "100px", 
                              fontSize: "12px", 
                              fontWeight: "700" 
                            }}>
                              {s.isPublished ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td style={{ padding: "18px 24px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button 
                                onClick={() => handleOpenEdit(s)} 
                                title="Edit"
                                style={{
                                  background: "var(--bg-page)", border: "1px solid var(--border-color)",
                                  width: "32px", height: "32px", borderRadius: "8px",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "var(--text-primary)", cursor: "pointer"
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                className="btn-delete"
                                onClick={() => handleDelete(s._id)} 
                                title="Delete"
                                style={{
                                  background: "rgba(239, 68, 68, 0.1)", border: "none",
                                  width: "32px", height: "32px", borderRadius: "8px",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "#EF4444", cursor: "pointer"
                                }}
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
              )}
            </div>
          
        

            {/* Modal Dialog for Edit Series & Structure Management */}
            {isModalOpen && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
                <div style={{ background: "var(--bg-panel, #16112a)", border: "1px solid var(--border-color, rgba(255,255,255,0.1))", padding: "24px", borderRadius: "16px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
                  <h3 style={{ margin: "0 0 16px 0", color: "var(--text-primary)" }}>{editingId ? "Update Exam Series" : "Create Exam Series"}</h3>
                  <form onSubmit={handleFormSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
<div style={{ flex: "2 1 400px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)" }}>Series Title</label>
                      <input 
                        type="text" 
                        value={formData.title} 
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                        required
                        placeholder="e.g. UPTET / CTET / BPSC TRE"
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)" }}>Exam Card Banner (Optional)</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input 
                            type="text" 
                            value={formData.thumbnail || ""} 
                            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                            style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)" }}
                            placeholder="https://..."
                          />
                          <label style={{ 
                            padding: "10px 16px", 
                            background: "var(--bg-card)", 
                            border: "1px solid var(--border-color)", 
                            borderRadius: "8px", 
                            cursor: uploadingImage ? "wait" : "pointer", 
                            color: "var(--text-primary)", 
                            fontWeight: "600",
                            fontSize: "13px",
                            whiteSpace: "nowrap"
                          }}>
                            {uploadingImage ? "Uploading..." : "Upload Image"}
                            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} disabled={uploadingImage} />
                          </label>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>This image will be displayed on the student exams page.</span>
                      </div>
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
                        rows={2}
                        placeholder="Provide details about papers inside this Exam Series..."
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input 
                        type="checkbox"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "#6E3FF3" }}
                        id="isPublishedCheck"
                      />
                      <label htmlFor="isPublishedCheck" style={{ fontSize: "13.5px", color: "var(--text-primary)", cursor: "pointer" }}>Publish Series (Visible to candidates)</label>
                    </div>

                    {/* MANAGE STRUCTURE & SUBJECTS SECTION (Only available for existing/editing series) */}
                    {editingId && (
                      <div style={{ marginTop: "12px", paddingTop: "16px", borderTop: "1px solid var(--border-color, rgba(255,255,255,0.1))" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Layers size={18} color="var(--violet, #6E3FF3)" /> Manage Exam Structures & Subjects
                          </h4>
                        </div>

                        {structureError && (
                          <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", borderRadius: "8px", fontSize: "12px", marginBottom: "12px" }}>
                            {structureError}
                          </div>
                        )}
          </div>
      </div>
    </div>
  );
}

export default ExamSeriesManager;
