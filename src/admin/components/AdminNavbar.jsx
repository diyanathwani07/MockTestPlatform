import React from "react";
import "../../css/admin/AdminLayout.css";

function AdminNavbar({ title = "Dashboard" }) {
  const user = JSON.parse(localStorage.getItem("user") || "null") || {
    fullName: "Admin",
  };

  return (
    <div className="admin-navbar">
      <h2 className="navbar-title">{title}</h2>

      <div className="navbar-profile">
        <div className="navbar-avatar">
          {user.fullName ? user.fullName.charAt(0).toUpperCase() : "A"}
        </div>
        <div>
          <p className="navbar-name">{user.fullName || "Admin"}</p>
          <p className="navbar-role">Administrator</p>
        </div>
      </div>
    </div>
  );
}

export default AdminNavbar;