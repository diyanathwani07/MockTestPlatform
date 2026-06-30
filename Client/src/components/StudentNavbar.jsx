import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Bell, User, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import "../css/admin/AdminLayout.css"; // Reuse admin navbar styles

function StudentNavbar({ title }) {
  const { toggleTheme } = useTheme(); 
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || storedUser.name || "Student";
  const initials = candidateName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const unreadNotifications = 0; // Set to 0 for now as per requirement

  return (
    <header className="admin-navbar">
      <div className="navbar-left-breadcrumbs" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", fontWeight: "600", color: "var(--text-secondary)" }}>
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

      <div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        
        {/* Icon Group: Theme & Notifications */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Notification Bell */}
        <div className="profile-dropdown-wrapper">
          <button 
            className="nav-bell-btn" 
            title={unreadNotifications > 0 ? "Notifications" : "No notifications"} 
            onClick={() => { 
              if (unreadNotifications > 0) {
                setNotifOpen(!notifOpen); 
                setProfileOpen(false); 
              }
            }}
            style={{ 
              cursor: unreadNotifications > 0 ? "pointer" : "default",
              opacity: unreadNotifications > 0 ? 1 : 0.7 
            }}
          >
            <Bell size={20} />
            {unreadNotifications > 0 && <span className="bell-badge"></span>}
          </button>
          {notifOpen && unreadNotifications > 0 && (
            <div className="profile-floating-menu" style={{ width: "240px", textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "14px", fontWeight: "500", right: "-10px" }}>
              <Bell size={32} style={{ opacity: 0.2, marginBottom: "10px" }} />
              <div>You have {unreadNotifications} new notifications</div>
            </div>
          )}
        </div>
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