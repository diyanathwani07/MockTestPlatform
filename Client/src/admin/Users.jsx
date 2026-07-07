import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";
import "../css/AdminTickets.css";
import { X, User, ShieldCheck, Clock, Activity, Phone, Eye, BarChart2, Settings, AlertTriangle, Edit, History, Ticket, UserMinus, UserCheck, Key, Trash2 } from 'lucide-react';

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Drawer & Modal State
  const [actionDrawerOpen, setActionDrawerOpen] = useState(false);
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

  useEffect(() => {
    fetchUsers();
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
                              setSelectedUser(u);
                              setActionDrawerOpen(true);
                            }}
                          >
                            ⋮
                          </button>
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
      {(activeModal || actionDrawerOpen) && (
        <div className="modal-overlay" onClick={() => { closeModal(); setActionDrawerOpen(false); }}>
          
          {/* ACTIONS DRAWER */}
          {actionDrawerOpen && selectedUser && (
            <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Actions: {selectedUser.fullName}</h3>
                <button className="close-btn" onClick={() => setActionDrawerOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={14} /> USER INFORMATION
                  </div>
                  <button className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }} onClick={() => { setActionDrawerOpen(false); openModal('profile', selectedUser); }}>
                    <User size={16} /> View Profile
                  </button>
                  <button className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }} onClick={() => { setActionDrawerOpen(false); openModal('edit', selectedUser); }}>
                    <Edit size={16} /> Edit User
                  </button>
                  
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0' }}></div>
                  
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart2 size={14} /> PERFORMANCE
                  </div>
                  <button className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }} onClick={() => { showToast('Exam history module in development', 'info'); setActionDrawerOpen(false); }}>
                    <History size={16} /> View Exam History
                  </button>
                  <button className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }} onClick={() => { showToast('Performance dashboard in development', 'info'); setActionDrawerOpen(false); }}>
                    <Activity size={16} /> View Performance
                  </button>
                  <button className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }} onClick={() => { showToast('Support tickets module in development', 'info'); setActionDrawerOpen(false); }}>
                    <Ticket size={16} /> View Support Tickets
                  </button>
                  
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0' }}></div>
                  
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={14} /> ACCOUNT MANAGEMENT
                  </div>
                  <button className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }} onClick={() => { setActionDrawerOpen(false); openModal('role', selectedUser); }}>
                    <ShieldCheck size={16} /> Change Role
                  </button>
                  <button className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }} onClick={() => { setActionDrawerOpen(false); openModal('suspend', selectedUser); }}>
                    {(selectedUser.status || 'Active') === 'Active' ? <><UserMinus size={16} /> Suspend User</> : <><UserCheck size={16} /> Activate User</>}
                  </button>
                  <button className="dropdown-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px' }} onClick={() => { setActionDrawerOpen(false); openModal('reset', selectedUser); }}>
                    <Key size={16} /> Reset Password
                  </button>
                  
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '12px 0' }}></div>
                  
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> DANGEROUS ACTIONS
                  </div>
                  <button className="dropdown-item danger" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: '#ef4444' }} onClick={() => { setActionDrawerOpen(false); openModal('delete', selectedUser); }}>
                    <Trash2 size={16} /> Delete User
                  </button>
                  
                </div>
              </div>
            </div>
          )}

          {/* PROFILE MODAL */}
          {activeModal === 'profile' && (
            <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
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
            <div className="ticket-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit User</h3>
                <button className="close-btn" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                  <div style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', opacity: 0.6, cursor: 'not-allowed', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                    {editForm.fullName || "N/A"}
                  </div>
                </div>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                  <div style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', opacity: 0.6, cursor: 'not-allowed', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                    {editForm.email || "N/A"}
                  </div>
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
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" onClick={() => handleAction('', 'PUT', editForm, 'User updated successfully')} disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          )}

          {/* ROLE MODAL */}
          {activeModal === 'role' && (
            <div className="ticket-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Change Role</h3>
                <button className="close-btn" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                Are you sure you want to change <strong>{selectedUser.fullName}'s</strong> role to <strong>{selectedUser.role === 'admin' ? 'User' : 'Admin'}</strong>?
              </div>
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" onClick={() => handleAction('/role', 'PUT', { role: selectedUser.role === 'admin' ? 'user' : 'admin' }, 'Role updated successfully')} disabled={actionLoading}>{actionLoading ? 'Updating...' : 'Confirm Change'}</button>
              </div>
            </div>
          )}

          {/* SUSPEND MODAL */}
          {activeModal === 'suspend' && (
            <div className="ticket-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{(selectedUser.status || 'Active') === 'Active' ? 'Suspend User' : 'Activate User'}</h3>
                <button className="close-btn" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                {(selectedUser.status || 'Active') === 'Active' 
                  ? <span>Are you sure you want to suspend <strong>{selectedUser.fullName}</strong>? They will not be able to log in.</span>
                  : <span>Are you sure you want to activate <strong>{selectedUser.fullName}</strong>? They will regain access to their account.</span>}
              </div>
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" style={{ background: (selectedUser.status || 'Active') === 'Active' ? '#ef4444' : 'var(--green)' }} onClick={() => handleAction('/status', 'PUT', { status: (selectedUser.status || 'Active') === 'Active' ? 'Suspended' : 'Active' }, 'Status updated successfully')} disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : ((selectedUser.status || 'Active') === 'Active' ? 'Suspend' : 'Activate')}
                </button>
              </div>
            </div>
          )}

          {/* RESET PASSWORD MODAL */}
          {activeModal === 'reset' && (
            <div className="ticket-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Reset Password</h3>
                <button className="close-btn" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                Are you sure you want to send a password reset email to <strong>{selectedUser.email}</strong>? Their current password will be overwritten with a temporary one.
              </div>
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" onClick={() => handleAction('/reset-password', 'POST', {}, 'Password reset email sent')} disabled={actionLoading}>{actionLoading ? 'Sending...' : 'Send Reset Email'}</button>
              </div>
            </div>
          )}

          {/* DELETE MODAL */}
          {activeModal === 'delete' && (
            <div className="ticket-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Delete User</h3>
                <button className="close-btn" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                Are you absolutely sure you want to permanently delete <strong>{selectedUser.fullName}</strong>? This action cannot be undone and will erase all their data and history.
              </div>
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
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