import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon, Bell, User, LogOut } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import "../../css/admin/AdminLayout.css";

function AdminNavbar({ title }) {
  const { toggleTheme } = useTheme(); 
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="admin-navbar">
      <div className="navbar-left-breadcrumbs" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "18px", fontWeight: "600", color: "var(--text-secondary)", flexWrap: "wrap" }}>
        <span 
          onClick={() => navigate("/admin/dashboard")}
          style={{ cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={(e) => e.target.style.color = "var(--violet)"}
          onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
        >
          Dashboard
        </span>
        <span style={{ color: "var(--text-muted)" }}>&gt;</span>
        <span style={{ color: "var(--text-primary)", fontWeight: "700", whiteSpace: "normal", wordBreak: "break-word" }}>{title}</span>
      </div>

      <div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notification Bell */}
        <button className="nav-bell-btn" title="Notifications">
          <Bell size={20} />
        </button>

        {/* Profile */}
        <div className="profile-dropdown-wrapper">
          <div className="avatar-neon-trigger" onClick={() => setProfileOpen(!profileOpen)}>DN</div>
          {profileOpen && (
            <div className="profile-floating-menu">
              <div className="drop-link" onClick={() => navigate("/admin/profile")}>
                <User size={16} style={{ marginRight: '8px' }} /> My Profile
              </div>
              <div className="drop-link" onClick={() => { localStorage.clear(); navigate("/"); }}>
                <LogOut size={16} style={{ marginRight: '8px' }} /> Log Out
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;