import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        
        {/* Navbar with the Cute Pill Switch built-in */}
        <AdminNavbar title="Manage Users" />

        <div className="admin-content">
          
          {/* 1. BREADCRUMBS */}
          <div className="page-breadcrumbs">
            <span className="crumb-inactive">Dashboard</span>
            <span className="crumb-separator">&gt;</span>
            <span className="crumb-active">Users</span>
          </div>

          {/* 2. COMMAND BAR (Search LEFT, Add Button RIGHT) */}
          <div className="manage-command-bar">
            
            <div className="pill-search-container" style={{ marginBottom: 0 }}>
              <svg width="16" height="16" className="pill-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Search users by name or email..." 
                className="pill-search-input"
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
            </div>


          </div>

          {/* 3. USER DATA TABLE CARD */}
          <div className="quiz-table-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isUser = u.role === "user";
                  const dateStr = u.createdAt 
                    ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : "12 May 2024";

                  return (
                    <tr key={u._id}>
                      
                      {/* Avatar + Stacked Name & Date */}
                      <td>
                        <div className="user-info-cell">
                          <div className="user-avatar-circle">
                            {u.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                          </div>
                          <div>
                            <div className="user-name-text">{u.fullName}</div>
                            <div className="user-join-date">
                              📅 Joined {dateStr}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="user-email-text">{u.email}</td>

                      {/* Outlined Role Badges */}
                      <td>
                        <span className={`role-outline-badge ${isUser ? 'role-user' : 'role-admin'}`}>
                          {u.role || "User"}
                        </span>
                      </td>

                      {/* Glowing Green Status */}
                      <td>
                        <div className="status-active-cell">
                          <span className="status-dot"></span>
                          <span>Active</span>
                        </div>
                      </td>

                      {/* Clean 3-Dot Action Icon */}
                      <td style={{ textAlign: 'center' }}>
                        <button className="action-dots-btn" title="Options">
                          ⋮
                        </button>
                      </td>

                    </tr>
                  );
                })}

                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-row">No users found matching your search.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 4. PAGINATION FOOTER */}
            <div className="table-pagination-footer">
              <span className="pagination-info">
                Showing 1 to {filteredUsers.length} of {filteredUsers.length} users
              </span>
              <div className="pagination-controls">
                <button className="page-nav-btn" disabled>&lt;</button>
                <button className="page-nav-btn active-page">1</button>
                <button className="page-nav-btn" disabled>&gt;</button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Users;