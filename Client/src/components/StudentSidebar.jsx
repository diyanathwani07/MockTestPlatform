import React, { useState, useEffect } from "react";
import StudentBottomNav from "./StudentBottomNav";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, FileText, LineChart, Trophy, LifeBuoy, Menu, X, BookOpen, PlusCircle, LogOut, CreditCard, Palette } from "lucide-react";
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

  const getInitialSubscriptionStatus = () => {
    try {
      const cached = localStorage.getItem("_sidebar_hasSubscription");
      if (cached !== null) return JSON.parse(cached);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return !!user.isPremium || !!user.activePlan;
    } catch {
      return false;
    }
  };

  const [hasPurchasedExams, setHasPurchasedExams] = useState(() => getCached("_sidebar_hasExams"));
  const [hasPurchasedPractice, setHasPurchasedPractice] = useState(() => getCached("_sidebar_hasPractice"));
  const [hasSubscription, setHasSubscription] = useState(getInitialSubscriptionStatus);
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

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const headers = { Authorization: `Bearer ${token}` };

        const [examsRes, practiceRes, subRes, premiumRes] = await Promise.all([
          axios.get(`${apiUrl}/api/quizzes`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/practice`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/subscription/my`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/ai-tests/premium-status`, { headers }).catch(() => ({ data: null }))
        ]);

        const hasExams = Array.isArray(examsRes?.data) ? examsRes.data.some(quiz => quiz.isPurchased) : false;
        const hasPractice = Array.isArray(practiceRes?.data) ? practiceRes.data.some(item => item.isPurchased) : false;
        const hasSub = (Array.isArray(subRes?.data) && subRes.data.length > 0) || !!premiumRes?.data?.isPremium;

        // Update state and persist to cache
        setHasPurchasedExams(hasExams);
        setHasPurchasedPractice(hasPractice);
        setHasSubscription(hasSub);
        localStorage.setItem("_sidebar_hasExams", JSON.stringify(hasExams));
        localStorage.setItem("_sidebar_hasPractice", JSON.stringify(hasPractice));
        localStorage.setItem("_sidebar_hasSubscription", JSON.stringify(hasSub));
      } catch (err) {
        console.error("Error checking student purchases:", err);
      }
    };

    checkPurchases();
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  const { toggleTheme, toggleThemePicker } = useTheme();

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

          {hasSubscription && (
            <NavLink to="/dashboard/subscriptions" className="sidebar-link" onClick={() => setIsOpen(false)}>
              <CreditCard size={20} />
              <span>My Subscriptions</span>
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
          
          <button onClick={() => { toggleThemePicker(); setIsOpen(false); }} className="sidebar-link" style={{ marginTop: "auto", borderRadius: "12px", border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left" }}>
            <Palette size={20} />
            <span>Theme</span>
          </button>
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            className="sidebar-link logout-btn" 
            style={{ 
              borderRadius: "12px"
            }}
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </nav>
      </aside>
      <StudentBottomNav />

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
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <LogOut size={28} />
            </div>

            <div>
              <h3 style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: "8px"
              }}>
                Ready to leave?
              </h3>
              <p style={{
                fontSize: "14px",
                color: "rgba(255, 255, 255, 0.6)",
                lineHeight: "1.5"
              }}>
                Are you sure you want to log out of your account? You will need to sign back in to access your tests.
              </p>
            </div>

            <div style={{
              display: "flex",
              gap: "12px",
              width: "100%",
              marginTop: "8px"
            }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "rgba(255, 255, 255, 0.1)"}
                onMouseOut={(e) => e.target.style.background = "rgba(255, 255, 255, 0.05)"}
              >
                Cancel
              </button>

              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.target.style.background = "#dc2626"}
                onMouseOut={(e) => e.target.style.background = "#ef4444"}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Floating AI Chatbot */}
      <StudentChatbot />
    </>
  );
}

export default StudentSidebar;

