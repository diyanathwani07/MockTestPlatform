import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, FileText, LineChart, Trophy, LifeBuoy, Menu, X, BookOpen } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import Logo from "./Logo";
import StudentChatbot from "./StudentChatbot";
import axios from "axios";

function StudentSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  // ── Read from cache first so sidebar never flickers on navigation ──
  const getCached = (key, fallback = false) => {
    try { return JSON.parse(localStorage.getItem(key) ?? String(fallback)); }
    catch { return fallback; }
  };

  const [hasPurchasedExams, setHasPurchasedExams] = useState(() => getCached("_sidebar_hasExams"));
  const [hasPurchasedPractice, setHasPurchasedPractice] = useState(() => getCached("_sidebar_hasPractice"));
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    // ── Refresh in background silently — never blocks render ──
    const checkPurchases = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const [examsRes, practiceRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/quizzes`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: [] })),
          axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/practice`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: [] }))
        ]);

        const hasExams = (examsRes.data || []).some(quiz => quiz.isPurchased);
        const hasPractice = (practiceRes.data || []).some(item => item.isPurchased);

        // Update state and persist to cache
        setHasPurchasedExams(hasExams);
        setHasPurchasedPractice(hasPractice);
        localStorage.setItem("_sidebar_hasExams", JSON.stringify(hasExams));
        localStorage.setItem("_sidebar_hasPractice", JSON.stringify(hasPractice));
      } catch (err) {
        console.error("Error checking student purchases:", err);
      }
    };

    checkPurchases();
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  const { toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className={`mobile-sidebar-toggle ${isOpen ? 'open-state' : ''}`} onClick={toggleSidebar}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <aside className={`student-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: "center", padding: "0 16px" }}>
          <Logo />
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className="sidebar-link" onClick={() => setIsOpen(false)} end>
            <Home size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          {hasPurchasedExams && (
            <NavLink to="/dashboard/exams-list" className="sidebar-link" onClick={() => setIsOpen(false)}>
              <FileText size={20} />
              <span>My Exams</span>
            </NavLink>
          )}

          {hasPurchasedPractice && (
            <NavLink to="/dashboard/practice-list" className="sidebar-link" onClick={() => setIsOpen(false)}>
              <BookOpen size={20} />
              <span>My Practice</span>
            </NavLink>
          )}

          <NavLink to="/dashboard/exams" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <FileText size={20} />
            <span>Exams</span>
          </NavLink>
          <NavLink to="/dashboard/practice" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <BookOpen size={20} />
            <span>Practice</span>
          </NavLink>
          <NavLink to="/dashboard/results" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <LineChart size={20} />
            <span>Results</span>
          </NavLink>
          <NavLink to="/dashboard/leaderboard" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <Trophy size={20} />
            <span>Leaderboard</span>
          </NavLink>
          <NavLink to="/dashboard/help" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <LifeBuoy size={20} />
            <span>Help & Support</span>
          </NavLink>
        </nav>
      </aside>
      <StudentChatbot />
    </>
  );
}

export default StudentSidebar;
