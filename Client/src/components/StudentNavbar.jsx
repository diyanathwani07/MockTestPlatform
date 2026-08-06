import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; 
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Bell, User, LogOut, Shield } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { usePreview } from "../context/PreviewContext";
import "../css/admin/AdminLayout.css"; // Reuse admin navbar styles

function StudentNavbar({ title }) {
  const { toggleTheme } = useTheme(); 
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const { previewMode, setPreviewMode } = usePreview();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || storedUser.name || "Student";
  const initials = candidateName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const [notifications, setNotifications] = useState([]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/tickets/my-tickets`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const tickets = res.data.tickets || [];
        const newNotifs = [];

        tickets.forEach(ticket => {
           if (ticket.status === 'Open') {
             newNotifs.push({ id: `${ticket._id}-open`, text: `Your ticket has been received`, subtext: ticket.subject, date: ticket.createdAt });
           } else if (ticket.status === 'In Progress') {
             newNotifs.push({ id: `${ticket._id}-prog`, text: `Our team is working on it`, subtext: ticket.subject, date: ticket.updatedAt });
           } else if (ticket.status === 'Resolved') {
             newNotifs.push({ id: `${ticket._id}-res`, text: `Your issue has been resolved`, subtext: ticket.subject, date: ticket.updatedAt });
           } else if (ticket.status === 'Closed') {
             newNotifs.push({ id: `${ticket._id}-cls`, text: `Ticket is closed`, subtext: ticket.subject, date: ticket.updatedAt });
           }
           
           if (ticket.messages && ticket.messages.length > 0) {
             const adminReplies = ticket.messages.filter(m => m.sender === 'admin');
             adminReplies.forEach((reply, idx) => {
               newNotifs.push({ id: `${ticket._id}-rep-${idx}`, text: `You have a new message from your raised query`, subtext: ticket.subject, date: reply.createdAt });
             });
           }
        });

        newNotifs.sort((a, b) => new Date(b.date) - new Date(a.date));
        setNotifications(newNotifs.slice(0, 10)); // keep top 10
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    fetchTickets();
  }, []);

  const unreadNotifications = notifications.length;

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
            
            {/* Notifications Button */}
            <div className="notification-bell-wrapper">
              <button 
                className="control-icon-btn notification-bell-neon" 
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                style={{ padding: '8px' }}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadNotifications > 0 && <span className="notification-badge-dot" />}
              </button>
              
              {notifOpen && (
                <div className="notification-floating-panel">
                  <div className="notif-header">
                    <h4>Notifications</h4>
                    {unreadNotifications > 0 && <span className="notif-count">{unreadNotifications} New</span>}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                        <Bell size={32} style={{ opacity: 0.2, marginBottom: "10px" }} />
                        <div>No new notifications</div>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", cursor: "pointer", transition: "background 0.2s" }} onClick={() => { setNotifOpen(false); navigate("/dashboard/help"); }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <div style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: "500", marginBottom: "4px" }}>{n.text}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{n.subtext}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Profile */}
          <div className="profile-dropdown-wrapper">
            <div 
              className="avatar-neon-trigger" 
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
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