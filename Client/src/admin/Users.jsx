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
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
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
          
          {/* 1. BREADCRUMBS (Removed per request) */ }

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
          <div className="quiz-table-wrapper" style={{ display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>
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
                    ? new Date(u.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')
                    : "12-05-2024";

                  return (
                    <tr key={u._id}>
                      
                      {/* Avatar + Stacked Name & Date */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div 
                          className="user-info-cell" 
                          onClick={() => setSelectedUser(u)} 
                          style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                          onMouseOver={(e) => e.currentTarget.style.opacity = "0.8"}
                          onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                          title="Click to view details"
                        >
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

                      <td className="user-email-text" style={{ whiteSpace: "nowrap" }}>{u.email}</td>

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

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, justifyContent: 'center' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', maxWidth: '90%', border: '1px solid var(--border-color)', position: 'relative' }}>
            <button 
              onClick={() => setSelectedUser(null)} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}
            >
              ✕
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div className="user-avatar-circle" style={{ width: '80px', height: '80px', fontSize: '28px' }}>
                {selectedUser.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
              </div>
              <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--text-primary)' }}>{selectedUser.fullName}</h2>
              <span className={`role-outline-badge ${selectedUser.role === 'user' ? 'role-user' : 'role-admin'}`} style={{ alignSelf: 'center' }}>
                {selectedUser.role || "User"}
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{selectedUser.email}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone No</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{selectedUser.phone || "Not provided"}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined Date</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
                  {selectedUser.createdAt 
                    ? new Date(selectedUser.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') + ", " + new Date(selectedUser.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : "12-05-2024"}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                <div className="status-active-cell" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
                  <span className="status-dot"></span>
                  <span>Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Users;