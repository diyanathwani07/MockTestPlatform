import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { User, Mail, Phone, Calendar, MapPin, Edit3 } from "lucide-react";
import { usePreview } from "../context/PreviewContext";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css"; // Reuse layout styles
import "../css/StudentProfile.css"; // Specific profile styles
import AvatarPickerModal from "../components/AvatarPickerModal";

function StudentProfile() {
  const [user, setUser] = useState({});
  const { previewMode } = usePreview();
  const [initials, setInitials] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const handleSelectAvatar = async (avatarUrlOrBase64) => {
    if (previewMode) return;
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

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    location: "",
    bio: ""
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(storedUser);
    setFormData({
      fullName: storedUser.fullName || storedUser.name || "",
      phone: storedUser.phone || "",
      dateOfBirth: storedUser.dateOfBirth || "",
      gender: storedUser.gender || "",
      location: storedUser.location || (storedUser.district && storedUser.state ? `${storedUser.district}, ${storedUser.state}` : ""),
      bio: storedUser.bio || ""
    });

    const name = storedUser.fullName || storedUser.name || "Student";
    const init = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    setInitials(init);

    // Generate a Student ID based on MongoDB _id or a fallback
    if (storedUser._id) {
      setStudentId("TP" + storedUser._id.toString().slice(-8).toUpperCase());
    } else {
      setStudentId("TP20260014");
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (previewMode) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
      const res = await axios.put(`${baseUrl}/api/auth/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local storage and state
      localStorage.setItem("user", JSON.stringify(res.data));
      setUser(res.data);
      setIsEditing(false); // Flip back on success
    } catch (error) {
      console.error("Error saving profile", error);
      alert(error.response?.data?.message || error.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Profile" />
        <div className="sd-profile-container">
          
          {/* ── HEADER & FLIP CARD ── */}
          <div className="sp-header" style={{ marginTop: '0' }}>
            <div className={`sp-flip-container ${isEditing ? "flipped" : ""}`}>
              <div className="sp-flip-inner">
                
                {/* ── FRONT FACE (PROFILE VIEW) ── */}
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
                        {!previewMode && (
                          <button className="sp-avatar-edit" onClick={() => setShowAvatarPicker(true)}>
                            <Edit3 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="sp-user-info">
                        <h2 className="sp-name">{user.fullName || user.name || "Student Name"}</h2>
                        <p className="sp-email">{user.email || "student@example.com"}</p>
                        {!previewMode && (
                          <button className="sp-edit-profile-btn" onClick={() => setIsEditing(true)}>
                            <Edit3 size={14} /> Edit Profile
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="sp-hero-right">
                      <div className="sp-badge">
                        <User size={14} /> <span>Student ID: {studentId}</span>
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
                            <div className="sp-info-label-group">
                              <div className="sp-icon-wrapper"><User className="sp-info-icon" size={16} /></div>
                              <span className="sp-info-label">Full Name</span>
                            </div>
                            <span className="sp-info-value">{user.fullName || user.name || "N/A"}</span>
                          </div>
                          <div className="sp-info-item">
                            <div className="sp-info-label-group">
                              <div className="sp-icon-wrapper"><Mail className="sp-info-icon" size={16} /></div>
                              <span className="sp-info-label">Email</span>
                            </div>
                            <span className="sp-info-value" style={{ fontSize: '13px' }}>{user.email || "N/A"}</span>
                          </div>
                          <div className="sp-info-item">
                            <div className="sp-info-label-group">
                              <div className="sp-icon-wrapper"><Phone className="sp-info-icon" size={16} /></div>
                              <span className="sp-info-label">Phone</span>
                            </div>
                            <span className="sp-info-value">{user.phone || "Not Provided"}</span>
                          </div>
                          <div className="sp-info-item">
                            <div className="sp-info-label-group">
                              <div className="sp-icon-wrapper"><Calendar className="sp-info-icon" size={16} /></div>
                              <span className="sp-info-label">Date of Birth</span>
                            </div>
                            <span className="sp-info-value">{user.dateOfBirth || "Not Provided"}</span>
                          </div>
                          <div className="sp-info-item">
                            <div className="sp-info-label-group">
                              <div className="sp-icon-wrapper"><User className="sp-info-icon" size={16} /></div>
                              <span className="sp-info-label">Gender</span>
                            </div>
                            <span className="sp-info-value">{user.gender || "Not Provided"}</span>
                          </div>
                          <div className="sp-info-item">
                            <div className="sp-info-label-group">
                              <div className="sp-icon-wrapper"><MapPin className="sp-info-icon" size={16} /></div>
                              <span className="sp-info-label">Location</span>
                            </div>
                            <span className="sp-info-value">{user.location || "Not Provided"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Bio */}
                      <div className="sp-bio-column">
                        <h4 className="sp-section-subtitle">Bio</h4>
                        <p className="sp-bio-text">
                          {user.bio || "Passionate learner and aspiring professional. I love solving problems, exploring new technologies, and continuously improving my skills."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── BACK FACE (EDIT FORM) ── */}
                <div className="sp-flip-back">
                  <h2 className="sp-edit-title">Edit Profile</h2>
                  
                  <form onSubmit={handleSave}>
                    <div className="sp-form-grid">
                      <div className="sp-form-group">
                        <label>Full Name</label>
                        <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" required />
                      </div>
                      <div className="sp-form-group">
                        <label>Email Address (Read Only)</label>
                        <input type="email" defaultValue={user.email || ""} disabled style={{opacity: 0.7, cursor: 'not-allowed'}} />
                      </div>
                      <div className="sp-form-group">
                        <label>Phone Number</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" required />
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
                        <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..."></textarea>
                      </div>
                    </div>
                    
                    <div className="sp-form-actions">
                      <button type="button" className="sp-btn-cancel" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</button>
                      <button 
                        type="submit" 
                        className="sp-btn-save" 
                        disabled={isSaving || previewMode}
                        title={previewMode ? "Profile editing is disabled in Preview Mode" : ""}
                        style={{ opacity: previewMode ? 0.6 : 1, cursor: previewMode ? "not-allowed" : "pointer" }}
                      >
                        {previewMode ? "Preview Mode (Disabled)" : (isSaving ? "Saving..." : "Save Changes")}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
      <AvatarPickerModal 
        isOpen={showAvatarPicker} 
        onClose={() => setShowAvatarPicker(false)} 
        onSelect={handleSelectAvatar} 
      />
    </div>
  );
}

export default StudentProfile;
