import React from 'react';
import { NavLink } from 'react-router-dom';

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo">
        <span className="logo-emoji">🎓</span>
        <span className="logo-text">Teaching Pariksha</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/admin/dashboard" className="sidebar-link">📊 Dashboard</NavLink>
        <NavLink to="/admin/create-quiz" className="sidebar-link">✏️ Create Quiz</NavLink>
        <NavLink to="/admin/manage-quizzes" className="sidebar-link">📋 Manage Quizzes</NavLink>
        <NavLink to="/admin/questions" className="sidebar-link">❓ Questions</NavLink>
        <NavLink to="/admin/users" className="sidebar-link">👥 Users</NavLink>
        <NavLink to="/admin/results" className="sidebar-link">🏆 Results</NavLink>
        <NavLink to="/admin/reports" className="sidebar-link">📈 Reports</NavLink>
        
        {/* ─── FIXED: Changed from "Audit Log" to "audit-log" ─── */}
        <NavLink to="/admin/audit-log" className="sidebar-link">📜 Audit Log</NavLink>
      </nav>

      {/* The bottom left Logout button has been permanently eradicated */}
    </aside>
  );
}

export default AdminSidebar;