import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { useTheme } from "../../context/ThemeContext";
import { usePreview } from "../../context/PreviewContext";
import { Sun, Moon, User, LogOut, Eye, ArrowLeft } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import NotificationBell from "../../components/NotificationBell";
import "../../css/admin/AdminLayout.css";
import { useConfirm } from "../../context/ConfirmContext";

function AdminNavbar({ title, parentText = "Dashboard", parentLink = "/admin/dashboard" }) {
  const confirm = useConfirm();
  const { toggleTheme } = useTheme(); 
  const { setPreviewMode } = usePreview();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="admin-navbar">
      <div className="navbar-left-breadcrumbs navbar-breadcrumb-row" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "var(--text-secondary)", fontFamily: "'Fraunces', serif" }}>
        <span 
          onClick={() => navigate(parentLink)}
          className="hidden sm:inline navbar-breadcrumb-home"
          style={{ cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={(e) => e.target.style.color = "var(--violet)"}
          onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
        >
          {parentText}
        </span>
        <span className="hidden sm:inline" style={{ color: "var(--text-muted)" }}>&gt;</span>
        <span className="navbar-page-title" style={{ color: "var(--text-primary)", fontWeight: "700" }}>{title}</span>
      </div>

      <div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Real-time Notification Bell */}
        <NotificationBell />

        {/* Profile */}
        <div className="profile-dropdown-wrapper">
          {(() => {
            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
            const adminName = storedUser.fullName || storedUser.name || "Admin";
            const initials = adminName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "AD";
            return (
              <div 
                className="avatar-neon-trigger" 
                onClick={() => { setProfileOpen(!profileOpen); }}
                style={{ overflow: 'hidden', padding: 0 }}
              >
                {storedUser.avatar ? (
                  <img src={storedUser.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                ) : (
                  initials
                )}
              </div>
            );
          })()}
          {profileOpen && (
            <div className="profile-floating-menu" style={{ width: "240px", right: "0" }}>
              <div className="pf-item pf-info-card">
                <p className="pf-name">{JSON.parse(localStorage.getItem("user") || "{}").name || JSON.parse(localStorage.getItem("user") || "{}").fullName || "Administrator"}</p>
                <p className="pf-role">{JSON.parse(localStorage.getItem("user") || "{}").role || "Admin"}</p>
              </div>
              <hr className="pf-divider" />
              <button 
                className="pf-item pf-action-btn"
                onClick={() => { setProfileOpen(false); navigate("/admin/profile"); }}
              >
                <User size={16} /> Admin Profile
              </button>
              <button 
                className="pf-item pf-action-btn"
                onClick={() => {
                  setProfileOpen(false);
                  setPreviewMode(true);
                  navigate("/dashboard");
                }}
              >
                <Eye size={16} /> Student Preview
              </button>
              <button 
                className="pf-item pf-action-btn pf-logout-btn"
                onClick={async () => {
                  setProfileOpen(false);
                  const isConfirmed = await confirm({
                    title: "Logout Admin",
                    message: "Are you sure you want to securely end your administrative session?",
                    confirmText: "Logout",
                    cancelText: "Cancel",
                    type: "danger"
                  });
                  if (isConfirmed) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/login";
                  }
                }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;