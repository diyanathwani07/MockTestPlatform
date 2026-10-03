import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";

import "../css/admin/AdminLayout.css";

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    image: "",
    ctaLabel: "",
    ctaRoute: "",
    align: "left",
    isActive: true,
    order: 0
  });

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/banners/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBanners(res.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData(banner);
    } else {
      setEditingBanner(null);
      setFormData({
        title: "", description: "", category: "", image: "",
        ctaLabel: "", ctaRoute: "", align: "left", isActive: true, order: 0
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (editingBanner) {
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/banners/${editingBanner._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Banner updated!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/banners`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Banner created!");
      }
      setShowModal(false);
      fetchBanners();
    } catch (error) {
      alert("Error saving banner");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/banners/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Banner deleted");
      fetchBanners();
    } catch (error) {
      alert("Error deleting banner");
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Manage Banners" />
        <div className="admin-content">
          <div className="al-header">
        <h1 className="al-title">Manage Banners</h1>
        <button className="al-btn al-btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} style={{ marginRight: '6px' }} /> Add Banner
        </button>
      </div>

      <div className="al-content-card">
        {loading ? (
          <p>Loading banners...</p>
        ) : banners.length === 0 ? (
          <p>No banners found. Create one to display it on the student dashboard.</p>
        ) : (
          <table className="al-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title & Category</th>
                <th>CTA</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b._id}>
                  <td>
                    <img src={b.image} alt={b.title} style={{ width: '80px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  </td>
                  <td>
                    <strong>{b.title}</strong><br />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.category}</span>
                  </td>
                  <td>
                    {b.ctaLabel} <br/> <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.ctaRoute}</span>
                  </td>
                  <td>{b.order}</td>
                  <td>
                    {b.isActive ? <CheckCircle size={16} color="#10B981" /> : <XCircle size={16} color="#EF4444" />}
                  </td>
                  <td>
                    <button className="al-icon-btn" onClick={() => handleOpenModal(b)} title="Edit"><Edit2 size={16}/></button>
                    <button className="al-icon-btn" style={{color:'#EF4444'}} onClick={() => handleDelete(b._id)} title="Delete"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="al-modal-overlay">
          <div className="al-modal" style={{ width: '500px' }}>
            <div className="al-modal-header">
              <h2>{editingBanner ? "Edit Banner" : "Create Banner"}</h2>
              <button className="al-close-btn" onClick={() => setShowModal(false)}><XCircle size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="al-modal-body">
              <div className="al-form-group">
                <label>Title</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="al-input" />
              </div>
              <div className="al-form-group">
                <label>Description (Optional)</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="al-input" />
              </div>
              <div className="al-form-row">
                <div className="al-form-group">
                  <label>Category (Badge)</label>
                  <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="al-input" />
                </div>
                <div className="al-form-group">
                  <label>Order (Lower = First)</label>
                  <input type="number" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} className="al-input" />
                </div>
              </div>
              <div className="al-form-group">
                <label>Image URL</label>
                <input type="text" required value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} className="al-input" />
              </div>
              <div className="al-form-row">
                <div className="al-form-group">
                  <label>CTA Button Label</label>
                  <input type="text" value={formData.ctaLabel} onChange={e => setFormData({...formData, ctaLabel: e.target.value})} className="al-input" />
                </div>
                <div className="al-form-group">
                  <label>CTA Button Route</label>
                  <input type="text" value={formData.ctaRoute} onChange={e => setFormData({...formData, ctaRoute: e.target.value})} className="al-input" placeholder="/dashboard/practice" />
                </div>
              </div>
              <div className="al-form-row">
                <div className="al-form-group">
                  <label>Content Alignment</label>
                  <select value={formData.align} onChange={e => setFormData({...formData, align: e.target.value})} className="al-input">
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="al-form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                    Active (Visible to Students)
                  </label>
                </div>
              </div>
              <div className="al-modal-footer">
                <button type="button" className="al-btn al-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="al-btn al-btn-primary">Save Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}
            </div>
      </div>
    </div>
  );
}
