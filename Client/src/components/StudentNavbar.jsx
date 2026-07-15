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
  const navigate = useNavigate();
  const { previewMode, setPreviewMode } = usePreview();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || storedUser.name || "Student";
  const initials = candidateName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const [notifications, setNotifications] = useState([]);

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
              setNotifOpen(!notifOpen); 
              setProfileOpen(false); 
            }}
            style={{ 
              cursor: "pointer",
              opacity: 1 
            }}
          >
            <Bell size={20} />
            {unreadNotifications > 0 && <span className="bell-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}
          </button>
          {notifOpen && (
            <div className="profile-floating-menu" style={{ width: "320px", right: "-10px", padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", fontWeight: "600", color: "var(--text-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Notifications</span>
                <span style={{ fontSize: "12px", background: "var(--violet)", color: "white", padding: "2px 8px", borderRadius: "10px" }}>{unreadNotifications} New</span>
              </div>
              <div style={{ maxHeight: "360px", overflowY: "auto" }}>
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