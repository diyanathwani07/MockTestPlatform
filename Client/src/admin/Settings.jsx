import React, { useState } from "react";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/CreateQuiz.css";


function Settings() {
  const user = JSON.parse(localStorage.getItem("user") || "null") || {};

  const [fullName, setFullName] = useState(user.fullName || "");
  const [email, setEmail] = useState(user.email || "");

  const handleSave = (e) => {
    e.preventDefault();
    alert("Profile update endpoint not yet implemented on backend.");
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Settings" />

        <div className="admin-content">

          <form onSubmit={handleSave}>
            <div className="form-card">
              <h3 className="form-card-title">Admin Profile</h3>

              <div className="form-grid">
                <div className="form-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="submit-quiz-btn">
              Save Changes
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Settings;