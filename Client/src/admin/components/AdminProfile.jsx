import React, { useState, useEffect } from "react";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import { User, Mail, Shield, Calendar, Edit3 } from "lucide-react";
import "../../css/StudentProfile.css"; // Reuse the beautiful styling from StudentProfile

function AdminProfile() {
  const [user, setUser] = useState(null);
  const [initials, setInitials] = useState("");
  const [adminId, setAdminId] = useState("");

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
    }
  }, []);

  if (!user) return <div style={{padding: '40px', textAlign: 'center'}}>Loading...</div>;

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, backgroundColor: "var(--bg-main)" }}>
        <AdminNavbar title="Admin Profile" />
        
        <div className="admin-content sd-profile-container" style={{ padding: "32px", maxWidth: "1000px" }}>
          
          <div className="sp-flip-container">
            <div className="sp-flip-inner">
              
              <div className="sp-flip-front">
                {/* ── TOP HERO CARD ── */}
                <div className="sp-hero-card">
                  <div className="sp-hero-left">
                    <div className="sp-avatar-container">
                      <div className="sp-avatar">{initials}</div>
                      <button className="sp-avatar-edit">
                        <Edit3 size={14} />
                      </button>
                    </div>
                    <div className="sp-user-info">
                      <h2 className="sp-name">{user.fullName || user.name || "Administrator"}</h2>
                      <p className="sp-email">{user.email || "admin@example.com"}</p>
                      <button className="sp-edit-profile-btn">
                        <Edit3 size={14} /> Edit Profile
                      </button>
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
                          <span className="sp-info-value">{user.fullName || user.name || "N/A"}</span>
                        </div>
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><Mail className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Email Address</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">{user.email || "N/A"}</span>
                        </div>
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><Shield className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Clearance</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">{user.role === 'admin' ? "Full Administrator Access" : "Standard"}</span>
                        </div>
                        <div className="sp-info-item">
                          <div className="sp-icon-wrapper"><Calendar className="sp-info-icon" size={16} /></div>
                          <span className="sp-info-label">Account Created</span>
                          <span className="sp-info-colon">:</span>
                          <span className="sp-info-value">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "Not Available"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Bio */}
                    <div className="sp-bio-column">
                      <h4 className="sp-section-subtitle">System Role</h4>
                      <p className="sp-bio-text">
                        System Administrator responsible for managing platform content, user accounts, and test operations. Full read/write access to the database and analytics.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;