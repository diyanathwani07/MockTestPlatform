import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuizzes: 0,
    totalQuestions: 0,
    totalAttempts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:5000/api/quizzes/stats/dashboard",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStats(res.data);
      } catch (err) {
        console.error("Dashboard stats error:", err);
        setError("Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: "👥", accent: "violet" },
    { label: "Total Quizzes", value: stats.totalQuizzes, icon: "📋", accent: "gold" },
    { label: "Total Questions", value: stats.totalQuestions, icon: "❓", accent: "green" },
    { label: "Total Attempts", value: stats.totalAttempts, icon: "🏆", accent: "navy" },
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Dashboard Overview" />

        <div className="admin-content">
          {error && <p className="admin-error">{error}</p>}

          {/* 1. WELCOME GREETING BANNER FIRST */}
          <div className="dashboard-welcome-card" style={{ marginBottom: "28px" }}>
            <h3>Welcome back, Admin</h3>
            <p>
              Manage quizzes, monitor candidate performance, and oversee the
              entire examination platform from this panel.
            </p>
          </div>

          {/* 2. STAT METRICS GRID SECOND */}
          <div className="stat-cards-grid">
            {cards.map((card) => (
              <div className={`stat-card accent-${card.accent}`} key={card.label}>
                <div className="stat-card-icon">{card.icon}</div>
                <div>
                  <p className="stat-card-label">{card.label}</p>
                  <p className="stat-card-value">{loading ? "—" : card.value}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;