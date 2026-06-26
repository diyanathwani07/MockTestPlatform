import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Edit3, ClipboardList, HelpCircle, Users, Trophy, LineChart, FileText } from 'lucide-react';
import Logo from '../../components/Logo';

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <Logo />
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/admin/dashboard" className="sidebar-link" end>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/admin/create-quiz" className="sidebar-link">
          <Edit3 size={20} />
          <span>Create Quiz</span>
        </NavLink>
        <NavLink to="/admin/manage-quizzes" className="sidebar-link">
          <ClipboardList size={20} />
          <span>Manage Quizzes</span>
        </NavLink>
        <NavLink to="/admin/questions" className="sidebar-link">
          <HelpCircle size={20} />
          <span>Questions</span>
        </NavLink>
        <NavLink to="/admin/users" className="sidebar-link">
          <Users size={20} />
          <span>Users</span>
        </NavLink>
        <NavLink to="/admin/results" className="sidebar-link">
          <Trophy size={20} />
          <span>Results</span>
        </NavLink>
        <NavLink to="/admin/reports" className="sidebar-link">
          <LineChart size={20} />
          <span>Reports</span>
        </NavLink>
        
        {/* ─── FIXED: Changed from "Audit Log" to "audit-log" ─── */}
        <NavLink to="/admin/audit-log" className="sidebar-link">
          <FileText size={20} />
          <span>Audit Log</span>
        </NavLink>
      </nav>

      {/* The bottom left Logout button has been permanently eradicated */}
    </aside>
  );
}

export default AdminSidebar;