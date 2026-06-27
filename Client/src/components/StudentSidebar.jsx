import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, FileText, LineChart, Trophy, LifeBuoy } from "lucide-react";
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
      <div className="sidebar-logo" style={{ justifyContent: "center", padding: "0 16px" }}>
        <Logo />
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
        <NavLink to="/dashboard/help" className="sidebar-link">
          <LifeBuoy size={20} />
          <span>Help & Support</span>
        </NavLink>
      </nav>
    </aside>
  );
}

export default StudentSidebar;
