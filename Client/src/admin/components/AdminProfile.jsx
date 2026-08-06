import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import { User, Mail, Shield, Calendar, Edit3, Phone, MapPin, Key } from "lucide-react";
import "../../css/StudentProfile.css"; // Reuse the beautiful styling from StudentProfile
import AvatarPickerModal from "../../components/AvatarPickerModal";

function AdminProfile() {
  const [user, setUser] = useState(null);
  const [initials, setInitials] = useState("");
  const [adminId, setAdminId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Change Password States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    setChangingPassword(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPasswordSuccess("Password updated successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1500);
    } catch (error) {
      setPasswordError(error.response?.data?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSelectAvatar = async (avatarUrlOrBase64) => {
    try {
      const token = localStorage.getItem("token");
      const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
      const res = await axios.put(`${baseUrl}/api/auth/profile`, {
        avatar: avatarUrlOrBase64
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      setUser(res.data);
      setShowAvatarPicker(false);
    } catch (error) {
      console.error("Error saving avatar", error);
      alert(error.response?.data?.message || error.message || "Failed to update avatar.");
    }
  };

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    location: "",
    bio: ""
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      
      const name = u.fullName || u.name || "Admin";
      const init = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
      setInitials(init);
      
      if (u._id) {
        setAdminId("ADM" + u._id.toString().slice(-8).toUpperCase());
      } else {
        setAdminId("ADM2026001");
      }
      
      setFormData({
        fullName: u.fullName || u.name || "Administrator",
        phone: u.phone || "",
        dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : "",
        gender: u.gender || "",
        location: u.location || "",
        bio: u.bio || ""
      });
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
      const res = await axios.put(`${baseUrl}/api/auth/profile`, {
        ...formData,
        avatar: user.avatar
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      setUser(res.data);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile", error);
      alert(error.response?.data?.message || error.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <div style={{padding: '40px', textAlign: 'center'}}>Loading...</div>;

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, backgroundColor: "var(--bg-main)" }}>
        <AdminNavbar title="Admin Profile" />
        
        <div className="sd-profile-container" style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
          
          <div className="sp-header" style={{ marginTop: '0' }}>
            <div className={`sp-flip-container ${isEditing ? "flipped" : ""}`}>
            <div className="sp-flip-inner">
              
              <div className="sp-flip-front">
                {/* ── TOP HERO CARD ── */}
                <div className="sp-hero-card">
                  <div className="sp-hero-left">
                    <div className="sp-avatar-container">
                      <div className="sp-avatar" style={{ overflow: 'hidden', padding: 0 }}>
                        {user.avatar ? (
                          <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                        ) : (
                          initials
                        )}
                      </div>
                      <button className="sp-avatar-edit" onClick={() => setShowAvatarPicker(true)}>
                        <Edit3 size={14} />
                      </button>
                    </div>
                    <div className="sp-user-info">
                      <h2 className="sp-name">{user.fullName || user.name || "Administrator"}</h2>
                      <p className="sp-email">{user.email || "admin@example.com"}</p>
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                        <button 
                          className="sp-edit-profile-btn" 
                          onClick={() => setIsEditing(true)}
                          style={{ fontSize: "12px", minHeight: "36px", height: "36px", padding: "0 14px", display: "flex", alignItems: "center" }}
                        >
                          <Edit3 size={13} style={{ marginRight: "4px", color: "#ffffff" }} /> Edit Profile
                        </button>
                        <button 
                          className="sp-edit-profile-btn" 
                          onClick={() => {
                            setPasswordError("");
                            setPasswordSuccess("");
                            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                            setShowPasswordModal(true);
                          }}
                          style={{ 
                            backgroundColor: "var(--violet, #6E3FF3)", 
                            border: "none", 
                            color: "#ffffff",
                            fontSize: "12px",
                            minHeight: "36px",
                            height: "36px",
                            padding: "0 14px",
                            display: "flex",
                            alignItems: "center",
                            boxShadow: "0 2px 10px rgba(110,63,243,0.2)"
                          }}
                        >
                          <Key size={13} style={{ marginRight: "4px", color: "#ffffff" }} /> Change Password
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="sp-hero-right">
                    <div className="sp-badge">
                      <Shield size={14} /> <span>Admin ID: {adminId}</span>
                    </div>
                  </div>
                </div>

                {/* ── ABOUT ME SECTION ── */}
                <div className="sp-about-card">
                  <h3 className="sp-about-title">About Me</h3>
                  
                  <div className="sp-about-grid">
                    {/* Left Column: Personal Info */}
                    <div className="sp-info-column">
                      <h4 className="sp-section-subtitle">Personal Information</h4>
                      
                      <div className="sp-info-list">
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><User className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Full Name</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">{user.fullName || user.name || "Administrator"}</span>
                        </div>
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><Mail className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Email Address</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">{user.email || "admin@example.com"}</span>
                        </div>
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><Phone className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Phone Number</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">{user.phone || "Not Provided"}</span>
                        </div>
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><Calendar className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Date of Birth</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">
                            {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('en-GB').replace(/\//g, '-') : "Not Provided"}
                          </span>
                        </div>
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><User className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Gender</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">{user.gender || "Not Provided"}</span>
                        </div>
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><MapPin className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Location</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">{user.location || "Not Provided"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Bio */}
                    <div className="sp-bio-column">
                      <h4 className="sp-section-subtitle">Bio</h4>
                      <p className="sp-bio-text">
                        {user.bio || "System Administrator responsible for managing platform content, user accounts, and test operations. Full read/write access to the database and analytics."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── BACK SIDE (EDIT FORM) ── */}
              <div className="sp-flip-back">
                <h2 className="sp-edit-title">Edit Profile</h2>
                
                <form onSubmit={handleSave}>
                  <div className="sp-form-grid">
                    <div className="sp-form-group">
                      <label>Full Name</label>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Administrator" required />
                    </div>
                    <div className="sp-form-group">
                      <label>Email Address (Read Only)</label>
                      <input type="email" defaultValue={user.email || "admin@example.com"} disabled style={{opacity: 0.7, cursor: 'not-allowed'}} />
                    </div>
                    <div className="sp-form-group">
                      <label>Phone Number</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                    </div>
                    <div className="sp-form-group">
                      <label>Date of Birth</label>
                      <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
                    </div>
                    <div className="sp-form-group">
                      <label>Gender</label>
                      <input type="text" name="gender" value={formData.gender} onChange={handleChange} placeholder="Male / Female / Other" />
                    </div>
                    <div className="sp-form-group">
                      <label>Location (City, State)</label>
                      <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="Nagpur, Maharashtra" />
                    </div>
                    <div className="sp-form-group full-width">
                      <label>Bio</label>
                      <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="System Administrator..."></textarea>
                    </div>
                  </div>
                  
                  <div className="sp-form-actions">
                    <button type="button" className="sp-btn-cancel" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button>
                    <button type="submit" className="sp-btn-save" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
        <AvatarPickerModal 
          isOpen={showAvatarPicker} 
          onClose={() => setShowAvatarPicker(false)} 
          onSelect={handleSelectAvatar} 
        />

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 20, 0.75)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 200000,
          }}>
            <form 
              onSubmit={handlePasswordSubmit}
              style={{
                background: "var(--bg-card, #131428)",
                border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                borderRadius: "20px",
                padding: "32px 28px",
                maxWidth: "420px",
                width: "90%",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                gap: "20px"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Change Password</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
                  Update your administrator account password to keep it secure.
                </p>
              </div>

              {passwordError && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", fontSize: "13px", fontWeight: "500" }}>
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", fontSize: "13px", fontWeight: "500" }}>
                  {passwordSuccess}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Current Password</label>
                  <input 
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid var(--border-color)", background: "var(--bg-input, #0A0A0A)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>New Password</label>
                  <input 
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid var(--border-color)", background: "var(--bg-input, #0A0A0A)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>Confirm New Password</label>
                  <input 
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid var(--border-color)", background: "var(--bg-input, #0A0A0A)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={changingPassword}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    borderRadius: "30px",
                    border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    borderRadius: "30px",
                    border: "none",
                    background: "var(--violet)",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 14px rgba(110, 63, 243, 0.4)"
                  }}
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

export default AdminProfile;