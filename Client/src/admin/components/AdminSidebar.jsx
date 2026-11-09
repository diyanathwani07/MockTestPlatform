import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Image, LayoutDashboard, Edit3, ClipboardList, HelpCircle, Users, Trophy,
  LineChart, FileText, Settings, Menu, LogOut, LifeBuoy, Sparkles, BookOpen, Shield, Palette, Layers,
  PanelLeft, PanelLeftClose, PanelLeftOpen, Radio, Volume2, GraduationCap, UserCheck, ChevronRight, IndianRupee
} from 'lucide-react';
import { useTheme } from "../../context/ThemeContext";
import Logo from '../../components/Logo';
import AdminChatbot from './AdminChatbot';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import "../../css/admin/AdminLayout.css";

// Top navigation items before the expandable group
const TOP_NAV_ITEMS = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard", permission: "dashboard" },
];

// Exactly the six required children under "Create Quiz"
const CREATE_QUIZ_CHILDREN = [
  { to: "/admin/manage-quizzes", icon: ClipboardList, label: "Manage Quizzes",    permission: "edit_quiz" },
  { to: "/admin/live-exams",     icon: Radio,         label: "Live Examinations", permission: "edit_quiz" },
  { to: "/admin/exams",          icon: Layers,        label: "Manage Exams",      permission: "edit_quiz" },
  { to: "/admin/practice",       icon: BookOpen,      label: "Practice Modules",  permission: "manage_practice_tests" },
  { to: "/admin/flashcards",     icon: Layers,        label: "Flashcards",        permission: "edit_quiz" },
  { to: "/admin/questions",      icon: HelpCircle,    label: "Questions",         permission: "manage_questions" },
];

// Navigation items following the expandable group (unchanged)
const BOTTOM_NAV_ITEMS = [
  { to: "/admin/students",       icon: Users,         label: "Users",               permission: "manage_students" },
  { to: "/admin/staff",          icon: Shield,        label: "Admin",               permission: "manage_staff" },
  { to: "/admin/banners",        icon: Image,         label: "Banners",             permission: "dashboard" },
  { to: "/admin/revenue",        icon: IndianRupee,   label: "Revenue",             permission: ["view_revenue", "manage_revenue"] },
  { to: "/admin/ai-plans",       icon: Sparkles,      label: "AI Plans",            permission: "manage_ai_plans" },
  { to: "/admin/ai-subscribers", icon: UserCheck,     label: "AI Subscribers",      permission: "manage_ai_subscribers" },
  { to: "/admin/results",        icon: Trophy,        label: "Results",             permission: "manage_results" },
  { to: "/admin/reports",        icon: LineChart,     label: "Reports",             permission: "view_reports" },
  { to: "/admin/audit-log",      icon: FileText,      label: "Audit Log",           permission: "audit_logs" },
  { to: "/admin/tickets",        icon: LifeBuoy,      label: "Support Tickets",     permission: "support_tickets" },
  { to: "/admin/voice-settings", icon: Volume2,       label: "Voice Settings",      permission: "manage_roles" },
  { to: "/admin/roles",          icon: Shield,        label: "Roles & Permissions", permission: "manage_roles" },
];

// Helper to determine if current path belongs to Create Quiz or any of its children
const isChildRouteActive = (pathname) => {
  return CREATE_QUIZ_CHILDREN.some(child => 
    pathname === child.to || pathname.startsWith(child.to + "/")
  ) || pathname.startsWith("/admin/create-quiz") 
    || pathname.startsWith("/admin/edit-quiz") 
    || pathname.startsWith("/admin/quizzes")
    || pathname.startsWith("/admin/create-practice") 
    || pathname.startsWith("/admin/edit-practice");
};

function AdminSidebar() {
  const { collapsed, toggleSidebarCollapse, mobileOpen: isOpen, setMobileOpen: setIsOpen } = useSidebar();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { hasPermission, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleThemePicker } = useTheme();

  const isCurrentChildActive = isChildRouteActive(location.pathname);
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(() => isCurrentChildActive);

  // Automatically expand Create Quiz when on a child route and keep open between child route transitions
  useEffect(() => {
    if (isCurrentChildActive) {
      setIsCreateQuizOpen(true);
    }
  }, [location.pathname, isCurrentChildActive]);

  const handleCreateQuizToggle = () => {
    if (collapsed) {
      toggleSidebarCollapse();
      setIsCreateQuizOpen(true);
    } else {
      setIsCreateQuizOpen(prev => !prev);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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

  const canViewCreateQuiz = role === "admin" || role === "superadmin" || hasPermission("create_quiz") || CREATE_QUIZ_CHILDREN.some(child => hasPermission(child.permission));

  return (
    <>
      {/* Mobile Toggle Button (only on screens <= 767px and only when closed) */}
      {!isOpen && (
        <button 
          className="mobile-sidebar-toggle" 
          onClick={() => setIsOpen(true)} 
          aria-label="Open Navigation Sidebar"
        >
          <Menu size={22} />
        </button>
      )}
      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`} style={{ position: "relative", overflow: "hidden" }}>
        <div 
          className="sidebar-logo" 
          style={{ 
            display: "flex", 
            justifyContent: collapsed ? "center" : "flex-start", 
            alignItems: "center", 
            gap: "12px",
            padding: collapsed ? "0" : "0 16px", 
            position: "relative", 
            zIndex: 2, 
            height: "64px" 
          }}
        >
          {collapsed ? (
            /* When collapsed, only show the single centered expand button */
            <button
              onClick={toggleSidebarCollapse}
              title="Expand Sidebar (Ctrl+B)"
              aria-label="Expand Sidebar"
              className="sidebar-collapse-btn"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "1px solid var(--border-color, rgba(255,255,255,0.12))",
                background: "var(--primary)",
                color: "var(--primary-foreground, #000000)",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                padding: 0,
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              <PanelLeftOpen size={18} style={{ stroke: "var(--primary-foreground, currentColor)" }} />
            </button>
          ) : (
            <>
              {/* Sidebar collapse/toggle button shifted to left side */}
              <button
                onClick={() => {
                  if (isOpen) setIsOpen(false);
                  toggleSidebarCollapse();
                }}
                title={isOpen ? "Close Sidebar" : "Collapse Sidebar (Ctrl+B)"}
                aria-label={isOpen ? "Close Sidebar" : "Collapse Sidebar"}
                className="sidebar-collapse-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.12))",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  padding: 0,
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-card-hover, rgba(255,255,255,0.1))";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <PanelLeftClose size={18} style={{ stroke: "currentColor" }} />
              </button>

              <Logo />
            </>
          )}
        </div>

        <nav className="sidebar-nav" style={{ position: "relative", zIndex: 2 }}>
          {/* Top navigation items (Dashboard) */}
          {TOP_NAV_ITEMS.map(({ to, icon: Icon, label, permission }) =>
            (hasPermission(permission) || role === "admin" || role === "superadmin") ? (
              <NavLink
                key={to}
                to={to}
                className="sidebar-link"
                onClick={() => setIsOpen(false)}
                end={to === "/admin/dashboard"}
              >
                <Icon size={20} className="sidebar-icon" />
                <span>{label}</span>
              </NavLink>
            ) : null
          )}

          {/* Expandable "Create Quiz" Section */}
          {canViewCreateQuiz && (
            <div className="sidebar-group">
              <button
                type="button"
                className={`sidebar-link sidebar-parent-btn ${isCurrentChildActive ? 'child-active' : ''}`}
                onClick={handleCreateQuizToggle}
                aria-expanded={isCreateQuizOpen}
                title={collapsed ? "Create Quiz" : undefined}
              >
                <Edit3 size={20} className="sidebar-icon" />
                <span>Create Quiz</span>
                <span className="sidebar-chevron-wrap">
                  <ChevronRight size={16} className={`sidebar-chevron ${isCreateQuizOpen ? 'expanded' : ''}`} />
                </span>
              </button>

              <div className={`sidebar-submenu-wrapper ${isCreateQuizOpen && !collapsed ? 'expanded' : ''}`}>
                <div className="sidebar-submenu-inner">
                  <div className="sidebar-submenu">
                    {CREATE_QUIZ_CHILDREN.map(({ to, icon: Icon, label, permission }) => {
                      if (!(hasPermission(permission) || role === "admin" || role === "superadmin")) {
                        return null;
                      }

                      const isItemActive = location.pathname === to || (
                        to === "/admin/exams" && location.pathname.startsWith("/admin/exams")
                      ) || (
                        to === "/admin/practice" && (location.pathname.startsWith("/admin/create-practice") || location.pathname.startsWith("/admin/edit-practice"))
                      ) || (
                        to === "/admin/manage-quizzes" && (location.pathname.startsWith("/admin/edit-quiz") || location.pathname.startsWith("/admin/quizzes") || location.pathname.startsWith("/admin/create-quiz"))
                      ) || (
                        to === "/admin/flashcards" && location.pathname.startsWith("/admin/flashcards")
                      ) || (
                        to === "/admin/questions" && location.pathname.startsWith("/admin/questions")
                      ) || (
                        to === "/admin/live-exams" && location.pathname.startsWith("/admin/live-exams")
                      );

                      return (
                        <NavLink
                          key={to}
                          to={to}
                          className={`sidebar-link sidebar-sublink ${isItemActive ? 'active' : ''}`}
                          onClick={() => setIsOpen(false)}
                        >
                          <Icon size={18} className="sidebar-icon" />
                          <span>{label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom navigation items (Users, Admin, Banners, Revenue, AI Plans, etc.) */}
          {BOTTOM_NAV_ITEMS.map(({ to, icon: Icon, label, permission }) => {
            const isRevenueOrPlan = ["/admin/revenue", "/admin/ai-plans", "/admin/ai-subscribers"].includes(to);
            // Restricted revenue & AI modules require superadmin or explicit permission (never generic admin)
            const canView = isRevenueOrPlan 
              ? (role === "superadmin" || hasPermission(permission))
              : (hasPermission(permission) || role === "admin" || role === "superadmin");

            return canView ? (
              <NavLink
                key={to}
                to={to}
                className="sidebar-link"
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} className="sidebar-icon" />
                <span>{label}</span>
              </NavLink>
            ) : null;
          })}
          
          <button 
            aria-label="Customize theme" 
            onClick={() => { toggleThemePicker(); setIsOpen(false); }} 
            className="sidebar-link" 
            style={{ marginTop: "auto", borderRadius: "12px", border: "none", background: "transparent", cursor: "pointer", width: "100%", textAlign: "left" }}
          >
            <Palette size={20} className="sidebar-icon" />
            <span>Theme</span>
          </button>
          
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            className="sidebar-link logout-btn" 
            style={{ 
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              width: "100%",
              textAlign: "left"
            }}
          >
            <LogOut size={20} className="sidebar-icon" />
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
