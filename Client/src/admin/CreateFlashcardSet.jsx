import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";

function CreateFlashcardSet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: "", description: "", difficulty: "Beginner", status: "Draft",
    isPaid: false, price: 0,
    examSeriesId: "", examStructureId: "", subjectName: "", chapter: "", topic: "", year: ""
  });
  
  const [exams, setExams] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const examRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-series/`, { headers: { Authorization: `Bearer ${token}` } });
        setExams(examRes.data);

        if (isEdit) {
          const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/sets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          const set = res.data;
          setFormData({
            title: set.title || "", description: set.description || "", difficulty: set.difficulty || "Beginner", status: set.status || "Draft",
            isPaid: set.isPaid || false, price: set.price || 0,
            examSeriesId: set.examSeriesId?._id || set.examSeriesId || "",
            examStructureId: set.examStructureId?._id || set.examStructureId || "",
            subjectName: set.subjectName || "", chapter: set.chapter || "", topic: set.topic || "", year: set.year || ""
          });
        }
      } catch (error) {
        console.error("Error loading data", error);
      }
    };
    fetchData();
  }, [id, isEdit]);

  useEffect(() => {
    const fetchStructures = async () => {
      if (!formData.examSeriesId) return setStructures([]);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/exam-structures/series/${formData.examSeriesId}`, { headers: { Authorization: `Bearer ${token}` } });
        setStructures(res.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchStructures();
  }, [formData.examSeriesId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `${import.meta.env.VITE_API_URL}/api/flashcards/admin/sets${isEdit ? `/${id}` : ""}`;
      const method = isEdit ? "put" : "post";
      
      const payload = { ...formData };
      if (!payload.examStructureId) delete payload.examStructureId;
      if (!payload.year) delete payload.year;
      if (!payload.description) delete payload.description;
      if (!payload.subjectName) delete payload.subjectName;
      if (!payload.chapter) delete payload.chapter;
      if (!payload.topic) delete payload.topic;

      await axios[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
      navigate("/admin/flashcards");
    } catch (error) {
      console.error("Save error:", error.response || error);
      alert(`Error (URL: ${url}): ${error.response?.data?.message || error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title={<span>{isEdit ? "Edit Flashcard Set" : "Create Flashcard Set"}</span>} />
        <div className="admin-content" style={{ display: "flex", justifyContent: "flex-start" }}>
          
          <form 
            className="form-card" 
            onSubmit={handleSubmit} 
            style={{ 
              width: "100%", 
              maxWidth: "800px", 
              padding: "24px 32px", 
              border: "1px solid var(--border-color)", 
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0 }}>{isEdit ? "Edit Set Details" : "New Flashcard Set"}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "600", color: formData.isPaid ? "#ef4444" : "var(--text-primary)", cursor: "pointer" }}>
                  <input type="checkbox" name="isPaid" checked={formData.isPaid} onChange={handleChange} style={{ width: "16px", height: "16px" }} /> 
                  Paid Set
                </label>
                {formData.isPaid && (
                  <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="Price ₹" style={{ padding: "6px 12px", width: "90px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-input)", color: "white", fontSize: "13px" }} />
                )}
              </div>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--violet)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>General Info</h3>
            
            <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Title *</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required style={{ padding: "10px 12px", fontSize: "14px" }} />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="2" style={{ padding: "10px 12px", fontSize: "14px" }}></textarea>
              </div>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--violet)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Taxonomy / Hierarchy</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Exam Series *</label>
                <select name="examSeriesId" value={formData.examSeriesId} onChange={handleChange} required style={{ padding: "10px 12px", fontSize: "13px" }}>
                  <option value="">Select Exam</option>
                  {exams.map(ex => <option key={ex._id} value={ex._id}>{ex.title}</option>)}
                </select>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Paper / Structure</label>
                <select name="examStructureId" value={formData.examStructureId} onChange={handleChange} style={{ padding: "10px 12px", fontSize: "13px" }}>
                  <option value="">None / Base</option>
                  {structures.map(st => <option key={st._id} value={st._id}>{st.name}</option>)}
                </select>
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Subject</label>
                <input type="text" name="subjectName" value={formData.subjectName} onChange={handleChange} placeholder="e.g. Physics" style={{ padding: "10px 12px", fontSize: "13px" }} />
              </div>
              
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Chapter</label>
                <input type="text" name="chapter" value={formData.chapter} onChange={handleChange} placeholder="e.g. Optics" style={{ padding: "10px 12px", fontSize: "13px" }} />
              </div>

              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Topic</label>
                <input type="text" name="topic" value={formData.topic} onChange={handleChange} placeholder="e.g. Lenses" style={{ padding: "10px 12px", fontSize: "13px" }} />
              </div>
              
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Year (Optional)</label>
                <input type="number" name="year" value={formData.year} onChange={handleChange} placeholder="e.g. 2024" style={{ padding: "10px 12px", fontSize: "13px" }} />
              </div>
            </div>

            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--violet)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Publishing Settings</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Difficulty</label>
                <select name="difficulty" value={formData.difficulty} onChange={handleChange} style={{ padding: "10px 12px", fontSize: "13px" }}>
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Status</label>
                <select name="status" value={formData.status} onChange={handleChange} style={{ padding: "10px 12px", fontSize: "13px", color: formData.status === "Published" ? "#10B981" : "white" }}>
                  <option>Draft</option><option>Published</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => navigate("/admin/flashcards")} 
                style={{ marginRight: "12px", padding: "10px 20px", fontSize: "14px", borderRadius: "8px" }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                style={{ padding: "10px 24px", fontSize: "14px", fontWeight: "600", borderRadius: "8px" }}
              >
                {loading ? "Saving..." : "Save Flashcard Set"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateFlashcardSet;