import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Bell, User, LogOut } from "lucide-react";
import "../css/admin/AdminLayout.css"; // Reuse admin navbar styles

function StudentNavbar({ title }) {
  const { toggleTheme } = useTheme(); 
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || storedUser.name || "Student";
  const initials = candidateName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <header className="admin-navbar" style={{ marginBottom: '24px' }}>
      <div className="navbar-left-breadcrumbs" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13.5px", fontWeight: "500", color: "var(--text-secondary)" }}>
        <span 
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={(e) => e.target.style.color = "var(--violet)"}
          onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
        >
          Dashboard
        </span>
        {title !== "Dashboard" && (
          <>
            <span style={{ color: "var(--text-muted)" }}>&gt;</span>
            <span style={{ color: "var(--text-primary)", fontWeight: "700" }}>{title}</span>
          </>
        )}
      </div>

      <div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        
        {/* 3D Sun/Moon Theme Toggle */}
        <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
          <div className="pill-track-icons"><span><Sun size={14} /></span><span><Moon size={14} /></span></div>
          <div className="pill-thumb-slider"></div>
        </div>

        {/* Notification Bell */}
        <div className="profile-dropdown-wrapper">
          <button 
            className="nav-bell-btn" 
            title="Notifications" 
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
          >
            <Bell size={20} />
          </button>
          {notifOpen && (
            <div className="profile-floating-menu" style={{ width: "240px", textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "14px", fontWeight: "500", right: "-10px" }}>
              <Bell size={32} style={{ opacity: 0.2, marginBottom: "10px" }} />
              <div>No new notifications</div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="profile-dropdown-wrapper">
          <div className="avatar-neon-trigger" onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}>{initials}</div>
          {profileOpen && (
            <div className="profile-floating-menu">
              <div className="drop-link" onClick={() => navigate("/dashboard/profile")}>
                <User size={16} style={{ marginRight: '8px' }} /> My Profile
              </div>
              <div className="drop-link" onClick={() => { 
                if (window.confirm("Are you sure you want to log out?")) {
                  localStorage.clear(); 
                  navigate("/"); 
                }
              }}>
                <LogOut size={16} style={{ marginRight: '8px' }} /> Log Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default StudentNavbar;
