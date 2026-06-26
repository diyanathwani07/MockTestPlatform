import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, FileText, LineChart, Trophy, User, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import Logo from "./Logo";

function StudentSidebar() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <aside className="student-sidebar">
      <div className="sidebar-logo" style={{ justifyContent: "space-between", padding: "0 16px" }}>
        <Logo />
        <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme" style={{ margin: 0, transform: "scale(0.8)" }}>
          <div className="pill-track-icons"><span><Sun size={14} /></span><span><Moon size={14} /></span></div>
          <div className="pill-thumb-slider"></div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className="sidebar-link" end>
          <Home size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/dashboard/exams" className="sidebar-link">
          <FileText size={20} />
          <span>My Exams</span>
        </NavLink>
        <NavLink to="/dashboard/results" className="sidebar-link">
          <LineChart size={20} />
          <span>Results</span>
        </NavLink>
        <NavLink to="/dashboard/leaderboard" className="sidebar-link">
          <Trophy size={20} />
          <span>Leaderboard</span>
        </NavLink>
        <NavLink to="/dashboard/profile" className="sidebar-link">
          <User size={20} />
          <span>Profile</span>
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default StudentSidebar;
