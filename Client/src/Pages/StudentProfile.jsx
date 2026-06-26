import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { User, Mail, Phone, Calendar, MapPin, Edit3 } from "lucide-react";
import StudentSidebar from "../components/StudentSidebar";
import "../css/StudentDashboard.css"; // Reuse layout styles
import "../css/StudentProfile.css"; // Specific profile styles

function StudentProfile() {
  const [user, setUser] = useState({});
  const [initials, setInitials] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local storage and state
      localStorage.setItem("user", JSON.stringify(res.data));
      setUser(res.data);
      setIsEditing(false); // Flip back on success
    } catch (error) {
      console.error("Error saving profile", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <div className="sd-profile-container">
          
          {/* ── BREADCRUMBS ── */}
          <div className="sp-header">
            <div className="sp-breadcrumbs">
              <Link to="/dashboard">Dashboard</Link> &gt; <span>Profile</span>
            </div>
            <div className={`sp-flip-container ${isEditing ? "flipped" : ""}`}>
              <div className="sp-flip-inner">
                
                {/* ── FRONT FACE (PROFILE VIEW) ── */}
                <div className="sp-flip-front">
                  {/* ── TOP HERO CARD ── */}
                  <div className="sp-hero-card">
                    <div className="sp-hero-left">
                      <div className="sp-avatar-container">
                        <div className="sp-avatar">{initials}</div>
                        <button className="sp-avatar-edit" onClick={() => setIsEditing(true)}>
                          <Edit3 size={12} />
                        </button>
                      </div>
                      <div className="sp-user-info">
                        <h2 className="sp-name">{user.fullName || user.name || "Student Name"}</h2>
                        <p className="sp-email">{user.email || "student@example.com"}</p>
                        <button className="sp-edit-profile-btn" onClick={() => setIsEditing(true)}>
                          <Edit3 size={14} /> Edit Profile
                        </button>
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
                            <div className="sp-icon-wrapper"><User className="sp-info-icon" size={16} /></div>
                            <span className="sp-info-label">Full Name</span>
                            <span className="sp-info-colon">:</span>
                            <span className="sp-info-value">{user.fullName || user.name || "N/A"}</span>
                          </div>
                          <div className="sp-info-item">
                            <div className="sp-icon-wrapper"><Mail className="sp-info-icon" size={16} /></div>
                            <span className="sp-info-label">Email Address</span>
                            <span className="sp-info-colon">:</span>
                            <span className="sp-info-value">{user.email || "N/A"}</span>
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
                          <span className="sp-info-value">{user.dateOfBirth || "Not Provided"}</span>
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
                      <button type="submit" className="sp-btn-save" disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
