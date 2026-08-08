import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; 
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Bell, User, LogOut, Shield } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { usePreview } from "../context/PreviewContext";
import NotificationBell from "./NotificationBell";
import "../css/admin/AdminLayout.css"; // Reuse admin navbar styles

function StudentNavbar({ title }) {
  const { toggleTheme } = useTheme(); 
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const { previewMode, setPreviewMode } = usePreview();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || storedUser.name || "Student";
  const initials = candidateName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <>
      <header className="admin-navbar">
        <div className="navbar-left-breadcrumbs navbar-breadcrumb-row" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "var(--text-secondary)" }}>
          <span 
            onClick={() => navigate("/dashboard")}
            className={title !== "Dashboard" ? "hidden sm:inline navbar-breadcrumb-home" : "navbar-breadcrumb-home"}
            style={{ cursor: "pointer", transition: "color 0.15s" }}
            onMouseEnter={(e) => e.target.style.color = "var(--violet)"}
            onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
          >
            Dashboard
          </span>
          {title !== "Dashboard" && (
            <>
              <span className="hidden sm:inline" style={{ color: "var(--text-muted)" }}>&gt;</span>
              <span className="navbar-page-title" style={{ color: "var(--text-primary)", fontWeight: "700", whiteSpace: "nowrap" }}>{title}</span>
            </>
          )}
        </div>

        <div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          
          {/* Icon Group: Theme & Notifications */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ThemeToggle />
            <NotificationBell />
          </div>

          {/* Profile */}
          <div className="profile-dropdown-wrapper">
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
            {profileOpen && (
              <div className="profile-floating-menu">
                <div className="drop-link" onClick={() => navigate("/dashboard/profile")}>
                  <User size={16} style={{ marginRight: '8px' }} /> My Profile
                </div>
                
                {previewMode && (
                  <div className="drop-link" onClick={() => { 
                    setPreviewMode(false);
                    navigate("/admin/dashboard"); 
                  }}>
                    <Shield size={16} style={{ marginRight: '8px', color: '#10B981' }} /> Return to Admin
                  </div>
                )}

                <div className="drop-link" onClick={() => { 
                  setProfileOpen(false);
                  setShowLogoutConfirm(true);
                }}>
                  <LogOut size={16} style={{ marginRight: '8px' }} /> Log Out
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 10, 20, 0.75)",
          backdropFilter: "blur(10px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 200000,
        }}>
          <div style={{
            background: "var(--bg-card, #131428)",
            border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            borderRadius: "20px",
            padding: "32px 28px",
            maxWidth: "420px",
            width: "90%",
            textAlign: "center",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.15)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#ef4444"
            }}>
              <LogOut size={28} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>Log Out?</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Are you sure you want to log out of your account? You will need to sign in again to continue.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "30px",
                  border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.1))",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "30px",
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)"
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StudentNavbar;