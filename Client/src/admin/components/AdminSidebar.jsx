import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Edit3, ClipboardList, HelpCircle, Users, Trophy,
  LineChart, FileText, LifeBuoy, Menu, X, Bot, BookOpen, Shield, LogOut, Sparkles, Palette
} from 'lucide-react';
import { useTheme } from "../../context/ThemeContext";
import Logo from '../../components/Logo';
import AdminChatbot from './AdminChatbot';
import { useAuth } from '../../context/AuthContext';
import PixelSnow from '../../components/shadcn-space/animations/PixelSnow';

const NAV_ITEMS = [
  { to: "/admin/dashboard",      icon: LayoutDashboard, label: "Dashboard",           permission: "dashboard" },
  { to: "/admin/create-quiz",    icon: Edit3,           label: "Create Quiz",         permission: "create_quiz" },
  { to: "/admin/manage-quizzes", icon: ClipboardList,   label: "Manage Quizzes",      permission: "edit_quiz" },
  { to: "/admin/practice",       icon: BookOpen,        label: "Practice Modules",    permission: "manage_practice_tests" },
  { to: "/admin/questions",      icon: HelpCircle,      label: "Questions",           permission: "manage_questions" },
  { to: "/admin/users",          icon: Users,           label: "Users",               permission: "manage_users" },
  { to: "/admin/ai-plans",       icon: Sparkles, Palette,        label: "AI Plans",            permission: "manage_ai_plans" },
  { to: "/admin/results",        icon: Trophy,          label: "Results",             permission: "manage_results" },
  { to: "/admin/reports",        icon: LineChart,       label: "Reports",             permission: "view_reports" },
  { to: "/admin/audit-log",      icon: FileText,        label: "Audit Log",           permission: "audit_logs" },
  { to: "/admin/tickets",        icon: LifeBuoy,        label: "Support Tickets",     permission: "support_tickets" },
  { to: "/admin/roles",          icon: Shield,          label: "Roles & Permissions", permission: "manage_roles" },
];

function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const { toggleThemePicker } = useTheme();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <button className={`mobile-sidebar-toggle ${isOpen ? 'open-state' : ''}`} onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Navigation Sidebar">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`} style={{ position: "relative", overflow: "hidden" }}>
        {/* Animated PixelSnow Background (Winter) */}
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

        <div className="sidebar-logo" style={{ justifyContent: "center", padding: "0 16px", position: "relative", zIndex: 2 }}><Logo /></div>
        <nav className="sidebar-nav" style={{ position: "relative", zIndex: 2 }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label, permission }) =>
            hasPermission(permission) ? (
              <NavLink
                key={to}
                to={to}
                className="sidebar-link"
                onClick={() => setIsOpen(false)}
                end={to === "/admin/dashboard"}
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ) : null
          )}
          
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
                Are you sure you want to log out of the admin panel? You will need to sign in again to continue.
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

      <AdminChatbot />
    </>
  );
}

export default AdminSidebar;
