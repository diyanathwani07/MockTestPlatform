import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom"; 
import { useTheme } from "../../context/ThemeContext";
import { usePreview } from "../../context/PreviewContext";
import { useSidebar } from "../../context/SidebarContext";
import { Sun, Moon, User, LogOut, Eye, ArrowLeft, Menu } from "lucide-react";
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
  const { collapsed, toggleSidebarCollapse, setMobileOpen } = useSidebar();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });
  const navigate = useNavigate();

  // Handle click outside and Escape key to close profile dropdown cleanly
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

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
      <div 
        className="navbar-left-breadcrumbs navbar-breadcrumb-row" 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          fontWeight: "600", 
          color: "var(--text-secondary)", 
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          minWidth: 0,
          overflow: "hidden",
          flex: "1 1 auto"
        }}
      >
        {/* Universal Sidebar Toggle Clicker (Visible on desktop; mobile uses fixed hamburger) */}
        <button
          onClick={() => {
            if (typeof window !== "undefined" && window.innerWidth <= 767) {
              setMobileOpen(true);
            } else {
              toggleSidebarCollapse();
            }
          }}
          className="navbar-sidebar-toggle-btn hidden md:inline-flex"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
            padding: "6px",
            marginRight: "6px",
            borderRadius: "8px",
            color: "var(--text-primary)",
            transition: "all 0.15s ease",
            flexShrink: 0
          }}
          title="Toggle navigation sidebar (Ctrl+B)"
          aria-label="Toggle navigation sidebar"
        >
          <Menu size={19} />
        </button>

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
        <span className="hidden sm:inline-block" style={{ color: "var(--text-muted)", margin: "0 8px" }}>&gt;</span>
        <span className="navbar-page-title" style={{ color: "var(--text-primary)", fontWeight: "700" }}>{title}</span>
      </div>

      <div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <UniversalSearch />
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Real-time Notification Bell */}
        <NotificationBell />

        {/* Profile */}
        <div className="profile-dropdown-wrapper" ref={profileRef}>
          {(() => {
            const adminName = currentUser.fullName || currentUser.name || "Admin";
            const initials = adminName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "AD";
            const avatarUrl = currentUser.avatar || currentUser.profilePicture;
            return (
              <div 
                className="avatar-neon-trigger" 
                role="button"
                tabIndex={0}
                aria-label="User profile options"
                onClick={() => setProfileOpen(!profileOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setProfileOpen(!profileOpen);
                  }
                }}
              >
                {avatarUrl ? (
                  <img 
                    src={optimizeAvatar(avatarUrl, 72)} 
                    alt={adminName} 
                    className="avatar-image-neon"
                    loading="lazy"
                    decoding="async"
                    width={36}
                    height={36}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  className="avatar-fallback-neon"
                  style={{ display: avatarUrl ? 'none' : 'flex' }}
                >
                  {initials}
                </div>
              </div>
            );
          })()}

          {profileOpen && (
            <div className="profile-glass-menu">
              <div className="profile-menu-header">
                <span className="profile-menu-name">{currentUser.fullName || currentUser.name || "Admin User"}</span>
                <span className="profile-menu-email">{currentUser.email || "admin@prepmark.com"}</span>
              </div>
              <div className="profile-menu-divider" />
              <button 
                className="profile-menu-item"
                onClick={() => { setProfileOpen(false); navigate("/admin/profile"); }}
              >
                <User size={15} />
                <span>My Profile</span>
              </button>
              <button 
                className="profile-menu-item"
                onClick={() => { 
                  setProfileOpen(false); 
                  setPreviewMode(true); 
                  navigate("/student-dashboard"); 
                }}
              >
                <Eye size={15} />
                <span>Student View</span>
              </button>
              <div className="profile-menu-divider" />
              <button 
                className="profile-menu-item danger"
                onClick={async () => {
                  setProfileOpen(false);
                  const isConfirmed = await confirm({
                    title: "Logout Confirmation",
                    message: "Are you sure you want to log out of the Admin Portal?",
                    confirmText: "Log Out",
                    cancelText: "Cancel",
                    type: "danger"
                  });
                  if (isConfirmed) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                  }
                }}
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
  );
}

export default AdminNavbar;
