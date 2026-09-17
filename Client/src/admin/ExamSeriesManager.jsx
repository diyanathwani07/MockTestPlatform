import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Search, Plus, Trash2, Edit2, AlertCircle, RefreshCw, ChevronDown, ChevronRight, Layers, BookOpen, ArrowUp, ArrowDown } from "lucide-react";
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

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      category: "General",
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
      category: series.category || "General",
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
                      <th>Linked Quizzes</th>
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
                        <td>
                          <span style={{ 
                            padding: "4px 10px", 
                            background: quizCounts[s._id] > 0 ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)", 
                            color: quizCounts[s._id] > 0 ? "#10B981" : "#EF4444",
                            borderRadius: "12px", 
                            fontSize: "12px", 
                            fontWeight: "700" 
                          }}>
                            {quizCounts[s._id] ?? 0} {quizCounts[s._id] === 1 ? "Quiz" : "Quizzes"}
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
                              title="Edit Series & Structures"
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

            {/* Modal Dialog for Edit Series & Structure Management */}
            {isModalOpen && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
                <div style={{ background: "var(--bg-panel, #16112a)", border: "1px solid var(--border-color, rgba(255,255,255,0.1))", padding: "24px", borderRadius: "16px", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
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
                        placeholder="e.g. UPTET / CTET / BPSC TRE"
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

                        {/* Add Structure Input */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                          <input
                            type="text"
                            placeholder="Add structure (e.g. Paper 1, Level 2, PRT)..."
                            value={newStructureName}
                            onChange={(e) => setNewStructureName(e.target.value)}
                            style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px" }}
                          />
                          <button
                            type="button"
                            onClick={handleAddStructure}
                            style={{ padding: "8px 14px", borderRadius: "8px", background: "var(--violet, #6E3FF3)", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <Plus size={16} /> Add Structure
                          </button>
                        </div>

                        {/* Structure List */}
                        {loadingStructures ? (
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center", padding: "10px" }}>Loading structures...</div>
                        ) : structures.length === 0 ? (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                            No exam structures created yet. Add one above!
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {structures.map((struct, sIdx) => {
                              const isExpanded = expandedStructureId === struct._id;
                              return (
                                <div
                                  key={struct._id}
                                  style={{
                                    border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                                    borderRadius: "10px",
                                    background: struct.isActive ? "rgba(255,255,255,0.03)" : "rgba(239,68,68,0.05)",
                                    overflow: "hidden"
                                  }}
                                >
                                  {/* Structure Header */}
                                  <div
                                    style={{
                                      padding: "10px 14px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "10px"
                                    }}
                                  >
                                    <div
                                      onClick={() => setExpandedStructureId(isExpanded ? null : struct._id)}
                                      style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1 }}
                                    >
                                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                      <span style={{ fontWeight: "700", fontSize: "14px", color: struct.isActive ? "var(--text-primary)" : "var(--text-muted)", textDecoration: struct.isActive ? "none" : "line-through" }}>
                                        {struct.name}
                                      </span>
                                      <span style={{ fontSize: "11px", color: "var(--text-secondary)", background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: "10px" }}>
                                        {(struct.subjects || []).length} Subjects
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <button
                                        type="button"
                                        onClick={() => handleReorderStructure(sIdx, "up")}
                                        disabled={sIdx === 0}
                                        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: sIdx === 0 ? "default" : "pointer", opacity: sIdx === 0 ? 0.3 : 1 }}
                                        title="Move Up"
                                      >
                                        <ArrowUp size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReorderStructure(sIdx, "down")}
                                        disabled={sIdx === structures.length - 1}
                                        style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: sIdx === structures.length - 1 ? "default" : "pointer", opacity: sIdx === structures.length - 1 ? 0.3 : 1 }}
                                        title="Move Down"
                                      >
                                        <ArrowDown size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleStructureActive(struct)}
                                        style={{
                                          padding: "2px 8px",
                                          borderRadius: "6px",
                                          border: "none",
                                          fontSize: "11px",
                                          fontWeight: "700",
                                          cursor: "pointer",
                                          background: struct.isActive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                          color: struct.isActive ? "#10B981" : "#EF4444"
                                        }}
                                      >
                                        {struct.isActive ? "Active" : "Inactive"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStructure(struct._id)}
                                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px" }}
                                        title="Delete Structure"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expanded Subjects Area */}
                                  {isExpanded && (
                                    <div style={{ padding: "10px 14px 14px 34px", background: "rgba(0,0,0,0.15)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                      <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "8px", letterSpacing: "0.5px" }}>
                                        Subjects in {struct.name}
                                      </div>

                                      {/* Add Subject Input */}
                                      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                                        <input
                                          type="text"
                                          placeholder="Add subject (e.g. Mathematics, Science)..."
                                          value={newSubjectName[struct._id] || ""}
                                          onChange={(e) => setNewSubjectName({ ...newSubjectName, [struct._id]: e.target.value })}
                                          style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "12px" }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleAddSubject(struct)}
                                          style={{ padding: "6px 12px", borderRadius: "6px", background: "rgba(110,63,243,0.2)", color: "var(--violet, #8b5cf6)", border: "1px solid rgba(110,63,243,0.3)", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}
                                        >
                                          ＋ Add
                                        </button>
                                      </div>

                                      {/* Subjects List */}
                                      {(struct.subjects || []).length === 0 ? (
                                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>No subjects added to this structure yet.</div>
                                      ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                          {(struct.subjects || []).map((sub, subIdx) => (
                                            <div
                                              key={sub._id || subIdx}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "6px 10px",
                                                background: "rgba(255,255,255,0.03)",
                                                borderRadius: "6px",
                                                fontSize: "12px"
                                              }}
                                            >
                                              <span style={{ fontWeight: "600", color: sub.isActive !== false ? "var(--text-primary)" : "var(--text-muted)", textDecoration: sub.isActive !== false ? "none" : "line-through" }}>
                                                {sub.name}
                                              </span>
                                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <button
                                                  type="button"
                                                  onClick={() => handleReorderSubject(struct, subIdx, "up")}
                                                  disabled={subIdx === 0}
                                                  style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: subIdx === 0 ? "default" : "pointer", opacity: subIdx === 0 ? 0.3 : 1 }}
                                                >
                                                  <ArrowUp size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleReorderSubject(struct, subIdx, "down")}
                                                  disabled={subIdx === (struct.subjects.length - 1)}
                                                  style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: subIdx === (struct.subjects.length - 1) ? "default" : "pointer", opacity: subIdx === (struct.subjects.length - 1) ? 0.3 : 1 }}
                                                >
                                                  <ArrowDown size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleSubjectActive(struct, subIdx)}
                                                  style={{
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    border: "none",
                                                    fontSize: "10px",
                                                    fontWeight: "700",
                                                    cursor: "pointer",
                                                    background: sub.isActive !== false ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                                    color: sub.isActive !== false ? "#10B981" : "#EF4444"
                                                  }}
                                                >
                                                  {sub.isActive !== false ? "Active" : "Inactive"}
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

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
