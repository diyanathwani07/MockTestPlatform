import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, FileText, LineChart, Trophy, LifeBuoy, Menu, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import Logo from "./Logo";

function StudentSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

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
      <button className="mobile-sidebar-toggle" onClick={toggleSidebar}>
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
        <NavLink to="/dashboard/exams" className="sidebar-link" onClick={() => setIsOpen(false)}>
          <FileText size={20} />
          <span>My Exams</span>
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
    </>
  );
}

export default StudentSidebar;
