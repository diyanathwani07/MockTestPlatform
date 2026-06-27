import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css";

function StudentDashboard() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const candidateName = storedUser.fullName || storedUser.name || "Student";
  const candidateEmail = storedUser.email || "";
  const initials = candidateName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const examIcons = {
    BPSC: "🎯",
    SSC: "📋",
    UPSC: "🏛️",
    CTET: "📚",
    TET: "🏫",
    NDA: "⚔️",
    default: "📝",
  };

  const subjectColors = [
    { bg: "#EDE9FE", text: "#5B21B6", dot: "#7C3AED" },
    { bg: "#DCFCE7", text: "#166534", dot: "#16A34A" },
    { bg: "#FEF9C3", text: "#854D0E", dot: "#D97706" },
    { bg: "#FFE4E6", text: "#9F1239", dot: "#E11D48" },
    { bg: "#DBEAFE", text: "#1E40AF", dot: "#2563EB" },
    { bg: "#FCE7F3", text: "#9D174D", dot: "#DB2777" },
    { bg: "#F0FDF4", text: "#14532D", dot: "#15803D" },
  ];

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Dashboard" />

      {/* ── HERO WELCOME ── */}
      <div className="sd-hero">
        <div className="sd-hero-content">
          <p className="sd-hero-greeting">👋 Welcome back,</p>
          <h1 className="sd-hero-name">{candidateName}</h1>
        </div>
        <div className="sd-hero-graphic">
          <div className="sd-hero-circle c1"></div>
          <div className="sd-hero-circle c2"></div>
          <div className="sd-hero-circle c3"></div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="sd-content">
        <div style={{ textAlign: "left", marginTop: "30px", background: "var(--bg-card)", padding: "30px", borderRadius: "16px", border: "1px solid var(--border-color)" }}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: "20px" }}>Ready to start practicing?</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>Head over to the My Exams section to view and start your available mock tests.</p>
          <button 
            onClick={() => navigate("/dashboard/exams")}
            style={{ padding: "10px 20px", background: "#6E3FF3", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
          >
            Go to My Exams →
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

export default StudentDashboard;
