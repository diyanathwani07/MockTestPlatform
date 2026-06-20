import React, { useEffect, useState } from "react";
import "../../css/admin/AdminLayout.css";

function AdminNavbar({ title }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });
  
  // State to control opening/closing the neon avatar menu
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  return (
    <header className="admin-navbar">
      <h1 className="navbar-title">{title}</h1>

      <div className="navbar-right-controls">
        
        {/* 1. 3D Theme Pill */}
        <div 
          className="theme-pill-switch"
          onClick={() => setIsDarkMode((prev) => !prev)}
          title="Switch Theme"
        >
          <div className="pill-track-icons">
            <span>☀️</span>
            <span>🌙</span>
          </div>
          <div className="pill-thumb-slider"></div>
        </div>

        {/* 2. Notification Bell (with tiny red unread dot) */}
        <button className="nav-bell-btn" title="Notifications">
          🔔
          <span className="bell-badge"></span>
        </button>

        {/* 3. Clickable Neon Green Profile Hook */}
        <div className="profile-dropdown-wrapper">
          <div 
            className="avatar-neon-trigger"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            DN
          </div>

          {/* Floating Obsidian Dropdown Box */}
          {profileOpen && (
            <div className="profile-floating-menu">
              <div className="drop-user-info">
                <div className="drop-name">Diya Nathwani</div>
                <div className="drop-role">Administrator</div>
              </div>
              <div className="drop-divider"></div>
              <a href="#profile" className="drop-link">👤 My Profile</a>
              <a href="#logout" className="drop-link drop-logout">🚪 Log Out</a>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

export default AdminNavbar;