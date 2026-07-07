import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";
import "../css/AdminTickets.css";
import { X, User, ShieldCheck, Clock, Activity, Phone } from 'lucide-react';

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Dropdown & Modal State
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'profile', 'edit', 'performance', 'history', 'tickets', 'suspend', 'role', 'reset', 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Profile/Edit states
  const [quizzesAttempted, setQuizzesAttempted] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", role: "", status: "" });
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch (error) {
      console.error("Fetch Users Error:", error);
      showToast("Failed to fetch users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch quizzes attempted for profile modal
  useEffect(() => {
    if (activeModal === 'profile' && selectedUser) {
      setQuizzesAttempted("Loading...");
      axios.get(`${import.meta.env.VITE_API_URL}/api/results/${selectedUser._id}`)
        .then(res => setQuizzesAttempted(res.data.length))
        .catch(err => {
          console.error("Error fetching quizzes attempted:", err);
          setQuizzesAttempted("Error");
        });
    } else {
      setQuizzesAttempted(null);
    }
  }, [activeModal, selectedUser]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = (type, user) => {
    setSelectedUser(user);
    setActiveModal(type);
    setDropdownOpen(null);
    if (type === 'edit') {
      setEditForm({
        fullName: user.fullName,
        email: user.email,
        role: user.role || 'user',
        status: user.status || 'Active'
      });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
  };

  const handleAction = async (endpoint, method = 'PUT', payload = {}, successMsg) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios({
        method,
        url: `${import.meta.env.VITE_API_URL}/api/admin/users/${selectedUser._id}${endpoint}`,
        data: payload,
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast(successMsg);
      fetchUsers(); // Refresh data
      closeModal();
    } catch (error) {
      console.error(`Error in action ${endpoint}:`, error);
      showToast("Action failed. Please try again.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Manage Users" />

        <div className="admin-content">
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

          <div className="quiz-table-wrapper" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '180px' }}>
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
                  const isActive = (u.status || 'Active') === 'Active';
                  const dateStr = u.createdAt 
                    ? new Date(u.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')
                    : "12-05-2024";

                  return (
                    <tr key={u._id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div 
                          className="user-info-cell" 
                          onClick={() => openModal('profile', u)} 
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

                      <td>
                        <span className={`role-outline-badge ${isUser ? 'role-user' : 'role-admin'}`}>
                          {u.role || "User"}
                        </span>
                      </td>

                      <td>
                        <div className="status-active-cell" style={{ color: isActive ? '' : '#ef4444' }}>
                          <span className="status-dot" style={{ backgroundColor: isActive ? '' : '#ef4444', boxShadow: isActive ? '' : '0 0 8px rgba(239,68,68,0.5)' }}></span>
                          <span>{u.status || 'Active'}</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div className="action-dropdown-container">
                          <button 
                            className="action-dots-btn" 
                            title="Options" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropdownOpen(dropdownOpen === u._id ? null : u._id);
                            }}
                          >
                            ⋮
                          </button>
                          
                          {dropdownOpen === u._id && (
                            <div className="action-dropdown-menu" onClick={e => e.stopPropagation()}>
                              <div className="dropdown-section-title">👁️ User Information</div>
                              <button className="dropdown-item" onClick={() => openModal('profile', u)}>View Profile</button>
                              <button className="dropdown-item" onClick={() => openModal('edit', u)}>Edit User</button>
                              
                              <div className="dropdown-divider"></div>
                              <div className="dropdown-section-title">📊 Performance</div>
                              <button className="dropdown-item" onClick={() => { showToast('Exam history module in development', 'info'); setDropdownOpen(null); }}>View Exam History</button>
                              <button className="dropdown-item" onClick={() => { showToast('Performance dashboard in development', 'info'); setDropdownOpen(null); }}>View Performance</button>
                              <button className="dropdown-item" onClick={() => { showToast('Support tickets module in development', 'info'); setDropdownOpen(null); }}>View Support Tickets</button>
                              
                              <div className="dropdown-divider"></div>
                              <div className="dropdown-section-title">⚙️ Account Management</div>
                              <button className="dropdown-item" onClick={() => openModal('role', u)}>Change Role</button>
                              <button className="dropdown-item" onClick={() => openModal('suspend', u)}>
                                {isActive ? 'Suspend User' : 'Activate User'}
                              </button>
                              <button className="dropdown-item" onClick={() => openModal('reset', u)}>Reset Password</button>
                              
                              <div className="dropdown-divider"></div>
                              <div className="dropdown-section-title">⚠️ Dangerous Actions</div>
                              <button className="dropdown-item danger" onClick={() => openModal('delete', u)}>Delete User</button>
                            </div>
                          )}
                        </div>
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
            </div>

            <div className="table-pagination-footer" style={{ marginTop: '-180px', position: 'relative', background: '#FAFAFC' }}>
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

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: toast.type === 'error' ? '#ef4444' : (toast.type === 'info' ? '#3b82f6' : 'var(--green)'), color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'dropdownFade 0.3s ease' }}>
          {toast.msg}
        </div>
      )}

      {/* MODALS */}
      {activeModal && (
        <div className="modal-overlay" onClick={closeModal} style={{ display: 'flex', alignItems: 'center', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, justifyContent: 'center' }}>
          
          {/* PROFILE MODAL */}
          {activeModal === 'profile' && (
            <div className="ticket-modal" onClick={(e) => e.stopPropagation()} style={{ animation: 'dropdownFade 0.3s ease', maxWidth: '500px', width: '100%' }}>
              <div className="modal-header">
                <h3>User Profile</h3>
                <button className="close-btn" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="ticket-meta">
                  
                  <div className="meta-item">
                    <User size={16} style={{ marginTop: '2px' }} />
                    <div>
                      <p className="meta-label">User Details</p>
                      <p className="meta-value">{selectedUser.fullName || "Unknown"}</p>
                      <p className="meta-sub">{selectedUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="meta-item">
                    <ShieldCheck size={16} style={{ marginTop: '2px' }} />
                    <div>
                      <p className="meta-label">Role & Status</p>
                      <p className="meta-value" style={{ textTransform: 'capitalize' }}>
                        {selectedUser.role || "User"} 
                        <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>|</span> 
                        <span style={{ color: selectedUser.status === 'Suspended' ? '#ef4444' : 'var(--green)' }}>
                          {selectedUser.status || 'Active'}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="meta-item">
                    <Activity size={16} style={{ marginTop: '2px' }} />
                    <div>
                      <p className="meta-label">Mock Tests Attempted</p>
                      <p className="meta-value">{quizzesAttempted !== null ? quizzesAttempted : "Loading..."}</p>
                    </div>
                  </div>

                  <div className="meta-item">
                    <Clock size={16} style={{ marginTop: '2px' }} />
                    <div>
                      <p className="meta-label">Joined On</p>
                      <p className="meta-value">
                        {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="meta-item">
                    <Phone size={16} style={{ marginTop: '2px' }} />
                    <div>
                      <p className="meta-label">Phone No</p>
                      <p className="meta-value">{selectedUser.phone || "Not provided"}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* EDIT MODAL */}
          {activeModal === 'edit' && (
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '450px', maxWidth: '90%', border: '1px solid var(--border-color)', animation: 'dropdownFade 0.3s ease' }}>
              <div className="modal-header">
                <h3>Edit User</h3>
                <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                  <input type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }} />
                </div>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Role</label>
                  <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" onClick={() => handleAction('', 'PUT', editForm, 'User updated successfully')} disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          )}

          {/* ROLE MODAL */}
          {activeModal === 'role' && (
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', maxWidth: '90%', border: '1px solid var(--border-color)', animation: 'dropdownFade 0.3s ease' }}>
              <div className="modal-header">
                <h3>Change Role</h3>
              </div>
              <div className="modal-body">
                Are you sure you want to change <strong>{selectedUser.fullName}'s</strong> role to <strong>{selectedUser.role === 'admin' ? 'User' : 'Admin'}</strong>?
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" onClick={() => handleAction('/role', 'PUT', { role: selectedUser.role === 'admin' ? 'user' : 'admin' }, 'Role updated successfully')} disabled={actionLoading}>{actionLoading ? 'Updating...' : 'Confirm Change'}</button>
              </div>
            </div>
          )}

          {/* SUSPEND MODAL */}
          {activeModal === 'suspend' && (
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', maxWidth: '90%', border: '1px solid var(--border-color)', animation: 'dropdownFade 0.3s ease' }}>
              <div className="modal-header">
                <h3>{(selectedUser.status || 'Active') === 'Active' ? 'Suspend User' : 'Activate User'}</h3>
              </div>
              <div className="modal-body">
                {(selectedUser.status || 'Active') === 'Active' 
                  ? <span>Are you sure you want to suspend <strong>{selectedUser.fullName}</strong>? They will not be able to log in.</span>
                  : <span>Are you sure you want to activate <strong>{selectedUser.fullName}</strong>? They will regain access to their account.</span>}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" style={{ background: (selectedUser.status || 'Active') === 'Active' ? '#ef4444' : 'var(--green)' }} onClick={() => handleAction('/status', 'PUT', { status: (selectedUser.status || 'Active') === 'Active' ? 'Suspended' : 'Active' }, 'Status updated successfully')} disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : ((selectedUser.status || 'Active') === 'Active' ? 'Suspend' : 'Activate')}
                </button>
              </div>
            </div>
          )}

          {/* RESET PASSWORD MODAL */}
          {activeModal === 'reset' && (
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', maxWidth: '90%', border: '1px solid var(--border-color)', animation: 'dropdownFade 0.3s ease' }}>
              <div className="modal-header">
                <h3>Reset Password</h3>
              </div>
              <div className="modal-body">
                Are you sure you want to send a password reset email to <strong>{selectedUser.email}</strong>? Their current password will be overwritten with a temporary one.
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" onClick={() => handleAction('/reset-password', 'POST', {}, 'Password reset email sent')} disabled={actionLoading}>{actionLoading ? 'Sending...' : 'Send Reset Email'}</button>
              </div>
            </div>
          )}

          {/* DELETE MODAL */}
          {activeModal === 'delete' && (
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '16px', width: '400px', maxWidth: '90%', border: '1px solid var(--border-color)', animation: 'dropdownFade 0.3s ease' }}>
              <div className="modal-header">
                <h3>Delete User</h3>
              </div>
              <div className="modal-body">
                Are you absolutely sure you want to permanently delete <strong>{selectedUser.fullName}</strong>? This action cannot be undone and will erase all their data and history.
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-danger" onClick={() => handleAction('', 'DELETE', {}, 'User deleted successfully')} disabled={actionLoading}>{actionLoading ? 'Deleting...' : 'Delete User'}</button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default Users;