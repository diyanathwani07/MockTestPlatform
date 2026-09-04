import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Target, ClipboardList, FilePlus, User, LineChart } from "lucide-react";
import "../css/StudentBottomNav.css";

const StudentBottomNav = () => {
  return (
    <nav className="student-bottom-nav">
      <NavLink 
        to="/dashboard" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
        end
      >
        <div className="icon-wrapper">
          <Home size={22} />
        </div>
        <span>Dashboard</span>
      </NavLink>

      <NavLink 
        to="/dashboard/practice" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
      >
        <div className="icon-wrapper">
          <Target size={22} />
        </div>
        <span>Practice</span>
      </NavLink>

      <NavLink 
        to="/dashboard/exams" 
        className={({ isActive }) => `bottom-nav-item center-action ${isActive ? "active" : ""}`}
      >
        <div className="exam-btn-circle">
          <ClipboardList size={26} />
        </div>
        <span>Exam</span>
      </NavLink>

      <NavLink 
        to="/dashboard/create-custom-quiz" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
      >
        <div className="icon-wrapper">
          <FilePlus size={22} />
        </div>
        <span>Custom Test</span>
      </NavLink>

      <NavLink 
        to="/dashboard/results" 
        className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
      >
        <div className="icon-wrapper">
          <LineChart size={22} />
        </div>
        <span>Results</span>
      </NavLink>
    </nav>
  );
};

export default StudentBottomNav;

