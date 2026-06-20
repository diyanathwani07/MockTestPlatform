import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../../css/admin/AdminLayout.css";

function AdminSidebar() {
  const navigate = useNavigate();

  const menuItems = [
    { label: "Dashboard", path: "/admin", icon: "📊" },
    { label: "Create Quiz", path: "/admin/create-quiz", icon: "✏️" },
    { label: "Manage Quizzes", path: "/admin/manage-quizzes", icon: "📋" },
    { label: "Subjects", path: "/admin/subjects", icon: "📚" },
    { label: "Questions", path: "/admin/questions", icon: "❓" },
    { label: "Users", path: "/admin/users", icon: "👥" },
    { label: "Results", path: "/admin/results", icon: "🏆" },
    { label: "Reports", path: "/admin/reports", icon: "📈" },
    { label: "Audit Log", path: "/admin/Audit Log", icon: "📜" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="admin-sidebar">

      <div className="sidebar-logo">
        <span className="logo-emoji">🎓</span>
        <span className="logo-text">Teaching Pariksha</span>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <button className="sidebar-link logout-link" onClick={handleLogout}>
          <span className="sidebar-icon">🚪</span>
          <span>Logout</span>
        </button>
      </nav>

    </div>
  );
}

export default AdminSidebar;