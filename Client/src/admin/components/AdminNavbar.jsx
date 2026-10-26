import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { useTheme } from "../../context/ThemeContext";
import { usePreview } from "../../context/PreviewContext";
import { Sun, Moon, User, LogOut, Eye, ArrowLeft } from "lucide-react";
import ThemeToggle from "../../components/ThemeToggle";
import UniversalSearch from "../../components/UniversalSearch";
import NotificationBell from "../../components/NotificationBell";
import "../../css/admin/AdminLayout.css";
import { useConfirm } from "../../context/ConfirmContext";
import { optimizeAvatar } from "../../utils/imageOptimizer";

function AdminNavbar({ title, parentText = "Dashboard", parentLink = "/admin/dashboard", onNavigateBack }) {
  const confirm = useConfirm();
  const { toggleTheme } = useTheme(); 
  const { setPreviewMode } = usePreview();
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setCurrentUser(JSON.parse(localStorage.getItem("user") || "{}"));
      } catch {
        // ignore
      }
    };
    window.addEventListener("user-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("user-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return (
    <header className="admin-navbar">
      <div className="navbar-left-breadcrumbs navbar-breadcrumb-row" style={{ display: "flex", alignItems: "center", fontWeight: "600", color: "var(--text-secondary)", fontFamily: "'Fraunces', serif" }}>
        {onNavigateBack && (
          <button
            onClick={onNavigateBack}
            className="navbar-back-btn"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              marginRight: '6px',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <span 
          onClick={() => navigate(parentLink)}
          className="hidden sm:inline navbar-breadcrumb-home"
          style={{ cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={(e) => e.target.style.color = "var(--violet)"}
          onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
        >
          {parentText}
        </span>
        <span className="hidden sm:inline-block" style={{ color: "var(--text-muted)", margin: "0 8px", display: "inline-block" }}>&gt;</span>
        <span className="navbar-page-title" style={{ color: "var(--text-primary)", fontWeight: "700" }}>{title}</span>
      </div>

      <div className="navbar-right-controls" style={{ display: "flex", alignItems: "center" }}>
        <UniversalSearch />
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Real-time Notification Bell */}
        <NotificationBell />

        {/* Profile */}
        <div className="profile-dropdown-wrapper">
          {(() => {
            const adminName = currentUser.fullName || currentUser.name || "Admin";
            const initials = adminName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "AD";
            const avatarUrl = currentUser.avatar || currentUser.profilePicture;
            return (
              <div 
                className="avatar-neon-trigger" 
                role="button"
                tabIndex={0}
                aria-label="Open admin profile menu"
                aria-expanded={profileOpen}
                onClick={() => { setProfileOpen(!profileOpen); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileOpen(!profileOpen); } }}
                style={{ overflow: 'hidden', padding: 0 }}
              >
                {avatarUrl ? (
                  <img 
                    src={optimizeAvatar(avatarUrl, 120)} 
                    width="40"
                    height="40"
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    alt="Avatar" 
                  />
                ) : (
                  initials
                )}
              </div>
            );
          })()}
          {profileOpen && (
            <div className="profile-floating-menu">
              <div 
                className="drop-link"
                onClick={() => { setProfileOpen(false); navigate("/admin/profile"); }}
              >
                <User size={16} style={{ marginRight: "8px" }} /> {currentUser?.role === 'superadmin' ? 'Super Admin Profile' : 'Admin Profile'}
              </div>
              <div 
                className="drop-link"
                onClick={() => {
                  setProfileOpen(false);
                  setPreviewMode(true);
                  navigate("/dashboard");
                }}
              >
                <Eye size={16} style={{ marginRight: "8px" }} /> Student Preview
              </div>
              <div 
                className="drop-link"
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
                <LogOut size={16} style={{ marginRight: "8px" }} /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;