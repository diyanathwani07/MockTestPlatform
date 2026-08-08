import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Bell, CheckSquare } from "lucide-react";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications?page=1&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("[NotificationBell] Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll every 45 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, link) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications/${id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Refresh list
      fetchNotifications();
      setIsOpen(false);
      if (link) {
        navigate(link);
      }
    } catch (error) {
      console.error("[NotificationBell] Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchNotifications();
    } catch (error) {
      console.error("[NotificationBell] Failed to mark all as read:", error);
    }
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={dropdownRef}>
      {/* BELL ICON BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          padding: "8px",
          cursor: "pointer",
          position: "relative",
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          transition: "background 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              background: "#EF4444",
              color: "#FFF",
              fontSize: "10px",
              fontWeight: "700",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid var(--bg-panel, #0E0F1E)",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN PANEL */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "45px",
            right: "0",
            width: "320px",
            maxHeight: "400px",
            background: "var(--bg-panel, #121324)",
            border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
              background: "rgba(255,255,255,0.01)",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--violet, #6E3FF3)",
                  fontSize: "11px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(110, 63, 243, 0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <CheckSquare size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* LIST */}
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "300px" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "12.5px",
                }}
              >
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleMarkAsRead(n._id, n.link)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.05))",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                    background: n.isRead ? "transparent" : "rgba(110, 63, 243, 0.04)",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = n.isRead
                      ? "rgba(255, 255, 255, 0.02)"
                      : "rgba(110, 63, 243, 0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.isRead
                      ? "transparent"
                      : "rgba(110, 63, 243, 0.04)";
                  }}
                >
                  {/* UNREAD DOT */}
                  {!n.isRead && (
                    <div
                      style={{
                        position: "absolute",
                        top: "16px",
                        left: "6px",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--violet, #6E3FF3)",
                      }}
                    />
                  )}
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: n.isRead ? "600" : "700",
                      color: n.isRead ? "var(--text-secondary)" : "var(--text-primary)",
                      marginBottom: "2px",
                    }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "var(--text-muted)",
                      lineHeight: "1.4",
                      marginBottom: "4px",
                    }}
                  >
                    {n.message}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {formatRelativeTime(n.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
