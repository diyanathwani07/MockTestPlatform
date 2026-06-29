import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Edit3, ClipboardList, HelpCircle, Users, Trophy, LineChart, FileText, LifeBuoy, Menu, X, Bot } from 'lucide-react';
import Logo from '../../components/Logo';
import AdminChatbot from './AdminChatbot';

function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button className="mobile-sidebar-toggle" onClick={toggleSidebar}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Logo />
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/admin/dashboard" className="sidebar-link" onClick={() => setIsOpen(false)} end>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/create-quiz" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <Edit3 size={20} />
            <span>Create Quiz</span>
          </NavLink>
          <NavLink to="/admin/manage-quizzes" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <ClipboardList size={20} />
            <span>Manage Quizzes</span>
          </NavLink>
          <NavLink to="/admin/questions" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <HelpCircle size={20} />
            <span>Questions</span>
          </NavLink>
          <NavLink to="/admin/users" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <Users size={20} />
            <span>Users</span>
          </NavLink>
          <NavLink to="/admin/results" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <Trophy size={20} />
            <span>Results</span>
          </NavLink>
          <NavLink to="/admin/reports" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <LineChart size={20} />
            <span>Reports</span>
          </NavLink>
          
          <NavLink to="/admin/audit-log" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <FileText size={20} />
            <span>Audit Log</span>
          </NavLink>
          
          <NavLink to="/admin/tickets" className="sidebar-link" onClick={() => setIsOpen(false)}>
            <LifeBuoy size={20} />
            <span>Support Tickets</span>
          </NavLink>
          
          <AdminChatbot />
        </nav>
      </aside>
    </>
  );
}

export default AdminSidebar;