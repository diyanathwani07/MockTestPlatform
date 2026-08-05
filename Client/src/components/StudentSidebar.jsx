import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, FileText, LineChart, Trophy, LifeBuoy, Menu, X, BookOpen, PlusCircle, LogOut } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "../context/ThemeContext";
import StudentChatbot from "./StudentChatbot";
import axios from "axios";
import PixelSnow from "./shadcn-space/animations/PixelSnow";

function StudentSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  // ── Read from cache first so sidebar never flickers on navigation ──
  const getCached = (key, fallback = false) => {
    try { return JSON.parse(localStorage.getItem(key) ?? String(fallback)); }
    catch { return fallback; }
  };

  const [hasPurchasedExams, setHasPurchasedExams] = useState(() => getCached("_sidebar_hasExams"));
  const [hasPurchasedPractice, setHasPurchasedPractice] = useState(() => getCached("_sidebar_hasPractice"));
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
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

        const hasExams = Array.isArray(examsRes?.data) ? examsRes.data.some(quiz => quiz.isPurchased) : false;
        const hasPractice = Array.isArray(practiceRes?.data) ? practiceRes.data.some(item => item.isPurchased) : false;

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
      <button className={`mobile-sidebar-toggle ${isOpen ? 'open-state' : ''}`} onClick={toggleSidebar} aria-label="Toggle Navigation Sidebar">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <aside className={`student-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Animated PixelSnow Background (Winter Only) */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.6 }}>
          <PixelSnow
            color="#ffffff"
            flakeSize={0.015}
            minFlakeSize={1.0}
            pixelResolution={240}
            speed={0.4}
            density={0.15}
            direction={95}
            brightness={0.85}
            depthFade={15}
            farPlane={15}
            gamma={0.4545}
            variant="round"
          />
        </div>

        <div className="sidebar-logo" style={{ justifyContent: "center", padding: "0 16px", position: "relative", zIndex: 2 }}>
          <Logo />
        </div>

        <nav className="sidebar-nav" style={{ position: "relative", zIndex: 2 }}>
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
          <NavLink to="/dashboard/create-custom-quiz" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <PlusCircle size={20} />
            <span>Custom Test</span>
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
          
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            className="sidebar-link logout-btn" 
            style={{ 
              marginTop: "auto", 
              borderRadius: "12px"
            }}
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </nav>
      </aside>

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
                  border: "1.5px solid var(--border-color, rgba(255,255,255,0.1))",
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

      <StudentChatbot />
    </>
  );
}

export default StudentSidebar;
