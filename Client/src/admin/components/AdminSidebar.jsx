import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Edit3, ClipboardList, HelpCircle, Users, Trophy,
  LineChart, FileText, LifeBuoy, Menu, X, Bot, BookOpen, Shield
} from 'lucide-react';
import Logo from '../../components/Logo';
import AdminChatbot from './AdminChatbot';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: "/admin/dashboard",      icon: LayoutDashboard, label: "Dashboard",           permission: "dashboard" },
  { to: "/admin/create-quiz",    icon: Edit3,           label: "Create Quiz",         permission: "create_quiz" },
  { to: "/admin/manage-quizzes", icon: ClipboardList,   label: "Manage Quizzes",      permission: "edit_quiz" },
  { to: "/admin/practice",       icon: BookOpen,        label: "Practice Modules",    permission: "manage_practice_tests" },
  { to: "/admin/questions",      icon: HelpCircle,      label: "Questions",           permission: "manage_questions" },
  { to: "/admin/users",          icon: Users,           label: "Users",               permission: "manage_users" },
  { to: "/admin/results",        icon: Trophy,          label: "Results",             permission: "manage_results" },
  { to: "/admin/reports",        icon: LineChart,       label: "Reports",             permission: "view_reports" },
  { to: "/admin/audit-log",      icon: FileText,        label: "Audit Log",           permission: "audit_logs" },
  { to: "/admin/tickets",        icon: LifeBuoy,        label: "Support Tickets",     permission: "support_tickets" },
  { to: "/admin/roles",          icon: Shield,          label: "Roles & Permissions", permission: "manage_roles" },
];

function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { hasPermission } = useAuth();

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

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: "center", padding: "0 16px" }}><Logo /></div>
        <nav className="sidebar-nav">
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
        </nav>
      </aside>
      <AdminChatbot />
    </>
  );
}

export default AdminSidebar;