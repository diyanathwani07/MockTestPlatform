import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch (error) {
        console.error("Fetch Users Error:", error);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Manage Users" />
        <div className="admin-content">
          
          {/* ROUNDED PILL SEARCH BAR */}
          <div className="pill-search-container">
            <svg width="16" height="16" className="pill-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            
            <input 
              type="text" 
              placeholder="Search candidates by name..." 
              className="pill-search-input"
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
            />
          </div>

          {/* TABLE CONTAINER */}
          <div className="quiz-table-wrapper">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>Candidate Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id}>
                    <td>
                      {/* FIXED CIRCULAR AVATAR */}
                      <div className="user-info-cell">
                        <div className="user-avatar-circle">
                          {u.fullName?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="user-name-text">{u.fullName}</span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><span className="status-badge status-published">{u.role}</span></td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="empty-row">No candidates found matching your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Users;