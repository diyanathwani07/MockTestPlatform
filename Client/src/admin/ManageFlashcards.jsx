import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import FlashcardDocxParser from "./components/FlashcardDocxParser";
import { Trash2, Edit2, Plus, Eye, ChevronLeft, CheckCircle } from "lucide-react";
import "../css/admin/AdminLayout.css";

function ManageFlashcards() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [setMeta, setSetMeta] = useState(null);
  const [cards, setCards] = useState([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ front: "", back: "", explanation: "", difficulty: "Medium", order: 0 });
  const [loading, setLoading] = useState(true);

  const fetchSetAndCards = async () => {
    try {
      const token = localStorage.getItem("token");
      const resSet = await axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/sets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSetMeta(resSet.data);
      
      const resCards = await axios.get(`${import.meta.env.VITE_API_URL}/api/flashcards/sets/${id}/cards`, { headers: { Authorization: `Bearer ${token}` } });
      setCards(resCards.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSetAndCards(); }, [id]);

  const handleOpenForm = (card = null) => {
    if (card) {
      setEditingId(card._id);
      setFormData({ front: card.front, back: card.back, explanation: card.explanation || "", difficulty: card.difficulty || "Medium", order: card.order || 0 });
    } else {
      setEditingId(null);
      setFormData({ front: "", back: "", explanation: "", difficulty: "Medium", order: cards.length + 1 });
    }
    setIsFormOpen(true);
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <button onClick={() => navigate("/admin/flashcards")} className="btn-secondary" style={{ padding: "4px 8px", marginBottom: "12px", display: "inline-flex", alignItems: "center", fontSize: "12px" }}><ChevronLeft size={14}/> Back</button>
                <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", margin: 0 }}>{setMeta?.title || "Loading..."}</h2>
                <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "13px" }}>{cards.length} Cards in this set.</p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => window.open(`/dashboard/flashcards/${id}`, "_blank")} className="btn-secondary" style={{ display: "flex", gap: "6px", alignItems: "center", padding: "8px 16px", fontSize: "13px" }}>
                  <Eye size={14} /> Preview
                </button>
                <button onClick={() => handleOpenForm()} className="btn-primary" style={{ display: "flex", gap: "6px", alignItems: "center", padding: "8px 16px", fontSize: "13px" }}>
                  <Plus size={14} /> Add Card
                </button>
                <button onClick={() => navigate("/admin/flashcards")} style={{ display: "flex", gap: "6px", alignItems: "center", padding: "8px 16px", fontSize: "13px", background: "#10B981", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>
                  <CheckCircle size={14} /> Save & Close
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
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
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Difficulty</label>
                      <select value={formData.difficulty} onChange={(e) => setFormData({...formData, difficulty: e.target.value})} style={{ padding: "10px", fontSize: "13px" }}>
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                    </div>
                    <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
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

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {cards.map((c, i) => (
                <div key={c._id} className="form-card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderRadius: "10px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--violet)", background: "rgba(110, 63, 243, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>Card {i + 1}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{c.difficulty}</span>
                    </div>
                    <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px", lineHeight: "1.4" }}>
                      <span style={{ opacity: 0.5, marginRight: "4px" }}>Q:</span>{c.front}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.4" }}>
                      <span style={{ opacity: 0.5, marginRight: "4px" }}>A:</span>{c.back}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginLeft: "16px" }}>
                    <button className="icon-btn" onClick={() => handleOpenForm(c)} style={{ padding: "6px" }}><Edit2 size={14} /></button>
                    <button className="icon-btn text-danger" onClick={() => handleDeleteCard(c._id)} style={{ padding: "6px" }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
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