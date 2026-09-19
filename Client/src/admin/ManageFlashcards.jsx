import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import FlashcardDocxParser from "./components/FlashcardDocxParser";
import { Layers, Trash2, Edit2, Plus, Eye, ChevronLeft, CheckCircle } from "lucide-react";
import "../css/admin/AdminLayout.css";

function ManageFlashcards() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [setMeta, setSetMeta] = useState(null);
  const [cards, setCards] = useState([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ front: "", back: "", explanation: "", difficulty: "Medium", order: 0, imageUrl: "" });
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchSetAndCards = async () => {
    try {
      const token = localStorage.getItem("token");
      const [metaRes, cardsRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/admin/sets/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/admin/sets/${id}/cards`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSetMeta(metaRes.data);
      setCards(cardsRes.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load flashcard set data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSetAndCards(); }, [id]);

  const handleOpenForm = (card = null) => {
    if (card) {
      setEditingId(card._id);
      setFormData({ front: card.front, back: card.back, explanation: card.explanation || "", difficulty: card.difficulty || "Medium", order: card.order || 0, imageUrl: card.imageUrl || "" });
    } else {
      setEditingId(null);
      setFormData({ front: "", back: "", explanation: "", difficulty: "Medium", order: cards.length + 1, imageUrl: "" });
    }
    setIsFormOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("image", file);
    data.append("folder", "flashcards");

    setIsUploading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/upload/image`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setFormData(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
    } catch (err) {
      console.error("Image upload failed", err);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleBulkImport = async (importedCards, fileName) => {
    if (!window.confirm(`Are you sure you want to import flashcards from ${fileName}?`)) return;
    setLoading(true);
    try {
      const newCards = importedCards.map((c, index) => ({
        front: c.front,
        back: c.back,
        explanation: c.explanation || "",
        difficulty: "Medium",
        order: cards.length + index + 1
      }));
      
      if (newCards.length === 0) {
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem("token");
      const promises = newCards.map(card => 
        axios.post(`${import.meta.env.VITE_API_URL}/api/flashcards/admin/sets/${id}/cards`, card, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(promises);
      alert(`Successfully imported ${newCards.length} flashcards from ${fileName}`);
      fetchSetAndCards();
    } catch (err) {
      console.error("Error bulk importing cards:", err);
      alert("Error importing flashcards.");
      setLoading(false);
    }
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/flashcards/admin/cards/${editingId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/flashcards/admin/sets/${id}/cards`, formData, { headers: { Authorization: `Bearer ${token}` } });
      }
      handleCloseForm();
      fetchSetAndCards();
    } catch (err) {
      console.error(err);
      alert("Error saving card.");
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm("Delete this card?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/flashcards/admin/cards/${cardId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchSetAndCards();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title={<span>Manage Cards</span>} />
        <div className="admin-content" style={{ display: "flex", justifyContent: "flex-start" }}>
          
          <div style={{ width: "100%", maxWidth: "800px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "16px", padding: "20px 24px", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ background: "#8b5cf6", borderRadius: "12px", width: "56px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Layers color="white" size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", textTransform: "uppercase", color: "white", marginBottom: "4px", margin: 0, letterSpacing: "0.5px" }}>{setMeta?.title || "Loading..."}</h2>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Layers size={12} /> {cards.length} Cards in this set
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button onClick={() => handleOpenForm()} style={{ display: "flex", gap: "6px", alignItems: "center", padding: "10px 20px", fontSize: "14px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)", transition: "all 0.2s" }}>
                  <Plus size={16} /> Add Card
                </button>
                <button onClick={() => navigate("/admin/flashcards")} style={{ display: "flex", gap: "6px", alignItems: "center", padding: "10px 20px", fontSize: "14px", background: "#10B981", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", transition: "all 0.2s" }}>
                  <CheckCircle size={16} /> Save & Close
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <FlashcardDocxParser onCardsLoaded={handleBulkImport} />
            </div>

            {isFormOpen && (
              <div className="form-card" style={{ marginBottom: "24px", border: "1px solid var(--violet)", borderRadius: "12px", padding: "20px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                  {editingId ? "Edit Card" : "New Card"}
                </h3>
                <form onSubmit={handleSaveCard}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "12px" }}>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Front (Question) *</label>
                      <textarea rows={3} value={formData.front} onChange={(e) => setFormData({...formData, front: e.target.value})} required style={{ padding: "10px", fontSize: "13px" }} />
                    </div>
                    <div className="form-field" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Back (Answer) *</label>
                      <textarea rows={3} value={formData.back} onChange={(e) => setFormData({...formData, back: e.target.value})} required style={{ padding: "10px", fontSize: "13px" }} />
                    </div>
                  </div>
                  <div className="form-field" style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Explanation (Optional)</label>
                    <textarea rows={2} value={formData.explanation} onChange={(e) => setFormData({...formData, explanation: e.target.value})} style={{ padding: "10px", fontSize: "13px" }} />
                  </div>
                  <div className="form-field" style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Card Image (Optional)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ fontSize: "13px" }} />
                      {isUploading && <span style={{ fontSize: "12px", color: "var(--violet)" }}>Uploading...</span>}
                      {formData.imageUrl && !isUploading && (
                        <a href={formData.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "var(--text-primary)" }}>View Image</a>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div className="form-field" style={{ flex: "1 1 300px", marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Difficulty</label>
                      <select value={formData.difficulty} onChange={(e) => setFormData({...formData, difficulty: e.target.value})} style={{ padding: "10px", fontSize: "13px" }}>
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                    </div>
                    <div className="form-field" style={{ flex: "1 1 300px", marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Order</label>
                      <input type="number" value={formData.order} onChange={(e) => setFormData({...formData, order: e.target.value})} style={{ padding: "10px", fontSize: "13px" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "24px", justifyContent: "flex-end" }}>
                    <button type="button" className="btn-secondary" onClick={handleCloseForm} style={{ padding: "8px 16px", fontSize: "13px" }}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>Save Card</button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {cards.map((c, i) => {
                const borderColors = ["#8b5cf6", "#3b82f6", "#ec4899"];
                const color = borderColors[i % 3];
                return (
                <div key={c._id} className="form-card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderRadius: "12px", background: "var(--bg-card, #1E1E28)", borderLeft: `4px solid ${color}`, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "white", background: color, padding: "4px 12px", borderRadius: "16px" }}>Card {i + 1}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", background: "rgba(255,255,255,0.06)", padding: "4px 12px", borderRadius: "16px" }}>{c.difficulty}</span>
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "15px", color: "white", marginBottom: "6px", lineHeight: "1.5" }}>
                      <span style={{ opacity: 0.6, marginRight: "6px" }}>Q:</span>{c.front}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
                      <span style={{ opacity: 0.5, marginRight: "6px" }}>A:</span>{c.back}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginLeft: "16px", alignItems: "center" }}>
                    <button className="icon-btn" onClick={() => handleOpenForm(c)} style={{ padding: "8px", color: "var(--text-secondary)", transition: "color 0.2s" }}><Edit2 size={16} /></button>
                    <button className="icon-btn" onClick={() => handleDeleteCard(c._id)} style={{ padding: "8px", color: "var(--text-secondary)", transition: "color 0.2s" }}><Trash2 size={16} /></button>
                  </div>
                </div>
              )})}
              {cards.length === 0 && !isFormOpen && (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: "12px" }}>
                  No cards added yet. Click "Add Card" to start building your set.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageFlashcards;

