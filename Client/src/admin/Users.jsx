import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";
import "../css/AdminTickets.css";
import { X, User, ShieldCheck, Clock, Activity, Phone, Eye, EyeOff, BarChart2, Settings, AlertTriangle, Edit, History, Ticket, UserMinus, UserCheck, Key, Trash2, ArrowLeft, Calendar } from 'lucide-react';

const ALL_PERMISSIONS = [
  { key: "dashboard",             label: "Dashboard" },
  { key: "create_quiz",           label: "Create Quiz" },
  { key: "edit_quiz",             label: "Manage Quizzes" },
  { key: "manage_practice_tests", label: "Practice Modules" },
  { key: "manage_questions",      label: "Questions" },
  { key: "manage_users",          label: "Users" },
  { key: "manage_results",        label: "Results" },
  { key: "view_reports",          label: "Reports" },
  { key: "audit_logs",            label: "Audit Log" },
  { key: "support_tickets",       label: "Support Tickets" },
  { key: "manage_roles",          label: "Roles & Permissions" }
];

function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState("active"); // "active" or "archived"
  
  // Drawer & Modal State
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'profile', 'edit', 'performance', 'history', 'tickets', 'suspend', 'role', 'reset', 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Profile/Edit states
  const [quizzesAttempted, setQuizzesAttempted] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", role: "", status: "", department: "", permissions: [], receiveMonthlyAuditReport: false });
  const [addForm, setAddForm] = useState({ fullName: "", email: "", phone: "", role: "user", password: "", department: "", permissions: [], receiveMonthlyAuditReport: false });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const currentUserRole = localStorage.getItem("role");

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(res.data || []);
    } catch (e) {
      console.error("Failed to fetch departments:", e);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = viewTab === "active" ? "" : "/deleted";
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users${endpoint}`, {
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
    fetchDepartments();
  }, [viewTab]);

  const handleRestoreUser = async (userId) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("User restored successfully");
      fetchUsers();
    } catch (error) {
      console.error("Restore User Error:", error);
      showToast("Failed to restore user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const [attemptsData, setAttemptsData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userTickets, setUserTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Fetch quizzes attempted & attempts details for profile/history/performance modals
  useEffect(() => {
    if ((activeModal === 'profile_popup' || activeModal === 'profile_drawer' || activeModal === 'history' || activeModal === 'performance') && selectedUser) {
      setQuizzesAttempted("Loading...");
      setHistoryLoading(true);
      axios.get(`${import.meta.env.VITE_API_URL}/api/results/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
        .then(res => {
          setQuizzesAttempted(res.data.length);
          setAttemptsData(res.data);
          setHistoryLoading(false);
        })
        .catch(err => {
          console.error("Error fetching quizzes attempted:", err);
          setQuizzesAttempted("Error");
          setAttemptsData([]);
          setHistoryLoading(false);
        });
    } else {
      setQuizzesAttempted(null);
      setAttemptsData([]);
    }
  }, [activeModal, selectedUser]);

  // Fetch user support tickets
  useEffect(() => {
    if (activeModal === 'tickets' && selectedUser) {
      setTicketsLoading(true);
      const token = localStorage.getItem("token");
      axios.get(`${import.meta.env.VITE_API_URL}/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const filtered = res.data.filter(t => (t.userId?._id || t.userId) === selectedUser._id);
          setUserTickets(filtered);
          setTicketsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching tickets:", err);
          setTicketsLoading(false);
        });
    } else {
      setUserTickets([]);
    }
  }, [activeModal, selectedUser]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openModal = (type, user) => {
    setSelectedUser(user);
    setActiveModal(type);
    if (typeof setDropdownOpen === 'function') {
      setDropdownOpen(null);
    }
    if (type === 'edit') {
      setEditForm({
        fullName: user.fullName,
        email: user.email,
        role: user.role || 'user',
        status: user.status || 'Active',
        department: user.department || '',
        permissions: user.permissions || [],
        receiveMonthlyAuditReport: user.receiveMonthlyAuditReport || false
      });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedUser(null);
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/users`,
        addForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("User created successfully");
      setAddForm({ fullName: "", email: "", phone: "", role: "user", password: "", department: "", permissions: [], receiveMonthlyAuditReport: false });
      fetchUsers();
      closeModal();
    } catch (error) {
      console.error("Create User Error:", error);
      showToast(error.response?.data?.message || "Failed to create user", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBackToPanel = () => {
    setActiveModal(null);
    if (selectedUser) {
      setActiveDropdown(selectedUser._id);
    }
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
          <div className="manage-command-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'nowrap', width: '100%', overflowX: 'auto', paddingBottom: '4px' }}>
            <div className="pill-search-container" style={{ marginBottom: 0, flex: "0 1 320px", minWidth: '120px', maxWidth: '320px' }}>
              <svg width="14" height="14" className="pill-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Search..." 
                className="pill-search-input"
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
                style={{ fontSize: "12px" }}
              />
            </div>

            {currentUserRole === 'superadmin' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '2px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button 
                    onClick={() => { setViewTab('active'); setLoading(true); }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: viewTab === 'active' ? '#6E3FF3' : 'transparent',
                      color: viewTab === 'active' ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Active
                  </button>
                  <button 
                    onClick={() => { setViewTab('archived'); setLoading(true); }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: viewTab === 'archived' ? '#6E3FF3' : 'transparent',
                      color: viewTab === 'archived' ? '#FFFFFF' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Archived
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setAddForm({ fullName: "", email: "", phone: "", role: "user", password: "", department: "", permissions: [], receiveMonthlyAuditReport: false });
                    setActiveModal('add_user');
                  }}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 12px',
                    fontSize: '12px',
                    minHeight: '34px'
                  }}
                  className="create-quiz-pill-btn"
                >
                  + Add User
                </button>
              </div>
            )}
          </div>

          <div className="quiz-table-wrapper" style={{ display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
            <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '180px' }}>
              <table className="quiz-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, index) => {
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
                          onClick={() => openModal('profile_popup', u)} 
                          style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                          onMouseOver={(e) => e.currentTarget.style.opacity = "0.8"}
                          onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                          title="Click to view details"
                        >
                          <div className="user-avatar-circle" style={{ overflow: 'hidden' }}>
                            {u.avatar ? (
                              <img src={u.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={u.fullName} />
                            ) : (
                              u.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U"
                            )}
                          </div>
                          <div>
                            <div className="user-name-text">{u.fullName}</div>
                            <div className="user-join-date" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Calendar size={13} style={{ opacity: 0.7 }} /> Joined {dateStr}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="user-email-text" style={{ whiteSpace: "nowrap" }}>{u.email}</td>

                      <td>
                        <span className={`role-outline-badge ${isUser ? 'role-user' : u.role === 'superadmin' ? 'role-super' : 'role-admin'}`}>
                          {u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>

                      <td>
                        {u.department ? (
                          <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '500' }}>
                            {u.department}
                          </span>
                        ) : (
                          <span style={{ opacity: 0.4, fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      <td>
                        {u.role === 'superadmin' ? (
                          <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>All</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.permissions?.length || 0} custom</span>
                        )}
                      </td>

                      <td>
                        <div className="status-active-cell" style={{ color: isActive ? '' : '#ef4444' }}>
                          <span className="status-dot" style={{ backgroundColor: isActive ? '' : '#ef4444', boxShadow: isActive ? '' : '0 0 8px rgba(239,68,68,0.5)' }}></span>
                          <span>{u.status || 'Active'}</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {viewTab === 'archived' ? (
                          <button 
                            className="btn-primary" 
                            style={{ 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              fontSize: '12.5px', 
                              background: '#22c55e', 
                              border: 'none', 
                              cursor: 'pointer',
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontWeight: '600'
                            }}
                            onClick={() => handleRestoreUser(u._id)}
                          >
                            <UserCheck size={14} /> Restore
                          </button>
                        ) : (
                          <div className="action-dropdown-container" style={{ position: 'relative' }}>
                            <button 
                              className="action-dots-btn" 
                              title="Options" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(u);
                                setActiveDropdown(activeDropdown === u._id ? null : u._id);
                              }}
                            >
                              ⋮
                            </button>

                            {activeDropdown === u._id && (
                               <>
                                 <div 
                                   onClick={() => setActiveDropdown(null)}
                                   style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: "transparent" }}
                                 />
                                 <div style={{ 
                                   position: "absolute", 
                                   right: 0, 
                                   top: "28px",
                                   backgroundColor: "var(--bg-card)", 
                                   border: "1.5px solid var(--border-color)", 
                                   borderRadius: "10px", 
                                   padding: "6px 0", 
                                   minWidth: "170px", 
                                   boxShadow: "0 8px 24px rgba(0,0,0,0.18)", 
                                   zIndex: 100,
                                   textAlign: "left"
                                 }}>
                                  <div 
                                    onClick={() => { setActiveDropdown(null); openModal('profile_drawer', u); }}
                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                  >
                                    <User size={15} /> View Profile
                                  </div>
                                  {currentUserRole === 'superadmin' && (
                                    <div 
                                      onClick={() => { setActiveDropdown(null); openModal('edit', u); }}
                                      style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                    >
                                      <Edit size={15} /> Edit User
                                    </div>
                                  )}
                                  <div 
                                    onClick={() => { setActiveDropdown(null); openModal('history', u); }}
                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                  >
                                    <History size={15} /> Exam History
                                  </div>
                                  <div 
                                    onClick={() => { setActiveDropdown(null); openModal('performance', u); }}
                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                  >
                                    <Activity size={15} /> Performance
                                  </div>
                                  <div 
                                    onClick={() => { setActiveDropdown(null); openModal('tickets', u); }}
                                    style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                  >
                                    <Ticket size={15} /> Support Tickets
                                  </div>
                                  {currentUserRole === 'superadmin' && (
                                    <>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); openModal('suspend', u); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        {(u.status || 'Active') === 'Active' ? <><UserMinus size={15} /> Suspend</> : <><UserCheck size={15} /> Activate</>}
                                      </div>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); openModal('reset', u); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--text-primary)", transition: "background 0.15s", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--option-hover)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <Key size={15} /> Reset Password
                                      </div>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); openModal('delete', u); }}
                                        style={{ padding: "8px 16px", cursor: "pointer", fontSize: "12.5px", fontWeight: "600", color: "var(--red, #ef4444)", transition: "background 0.15s", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(226, 67, 107, 0.08)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                      >
                                        <Trash2 size={15} /> Delete User
                                      </div>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
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
        <div className="modal-overlay" style={activeModal === 'profile_popup' || activeModal === 'add_user' ? { justifyContent: 'center' } : {}} onClick={() => { closeModal(); }}>
          
          {/* PROFILE MODAL */}
          {(activeModal === 'profile_popup' || activeModal === 'profile_drawer') && selectedUser && (
            <div className={`ticket-modal ${activeModal === 'profile_popup' ? 'center-modal' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {activeModal === 'profile_drawer' && (
                  <button 
                    className="close-btn" 
                    onClick={handleBackToPanel}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      background: "transparent", 
                      border: "1px solid var(--border-color)", 
                      borderRadius: "8px", 
                      padding: "6px", 
                      cursor: "pointer",
                      color: "var(--text-secondary)"
                    }}
                    title="Back to Actions"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h3 style={{ margin: 0 }}>User Profile</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
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
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  className="close-btn" 
                  onClick={handleBackToPanel} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "transparent", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px", 
                    padding: "6px", 
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0 }}>Edit User</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                  <div style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', opacity: 0.6, cursor: 'not-allowed', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                    {selectedUser?.fullName || "N/A"}
                  </div>
                </div>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                  <div style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', opacity: 0.6, cursor: 'not-allowed', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                    {selectedUser?.email || "N/A"}
                  </div>
                </div>
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Role</label>
                  <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value, department: (['admin', 'superadmin', 'manager', 'employee'].includes(e.target.value)) ? (editForm.department || '') : ''})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                    <option value="user">User</option>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                {(['admin', 'superadmin', 'manager', 'employee'].includes(editForm.role)) && (
                  <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Department</label>
                    <select 
                      value={editForm.department || ''} 
                      onChange={e => {
                        const deptName = e.target.value;
                        const selectedDept = departments.find(d => d.name === deptName);
                        const defaultPermissions = selectedDept ? (selectedDept.permissions || []) : [];
                        setEditForm({
                          ...editForm,
                          department: deptName,
                          permissions: defaultPermissions
                        });
                      }} 
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    >
                      <option value="">None</option>
                      {departments.map(d => (
                        <option key={d._id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
                {editForm.role === 'superadmin' && (
                  <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={editForm.receiveMonthlyAuditReport || false}
                      onChange={e => setEditForm({...editForm, receiveMonthlyAuditReport: e.target.checked})}
                      style={{ width: '16px', height: '16px', minWidth: '16px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                      Receive Monthly Audit Logs via Email
                    </span>
                  </label>
                )}
                {(['admin', 'superadmin', 'manager', 'employee'].includes(editForm.role)) && (
                  <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assign Custom Permissions</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto', border: '1.5px solid var(--border-color)', padding: '12px', borderRadius: '8px', background: 'var(--bg-input)' }}>
                      {ALL_PERMISSIONS.map(p => {
                        const isChecked = editForm.permissions?.includes(p.key);
                        return (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {
                                const newPerms = isChecked
                                  ? (editForm.permissions || []).filter(x => x !== p.key)
                                  : [...(editForm.permissions || []), p.key];
                                setEditForm({...editForm, permissions: newPerms});
                              }}
                              style={{ width: 'auto', height: 'auto', cursor: 'pointer' }}
                            />
                            <span>{p.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
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
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  className="close-btn" 
                  onClick={handleBackToPanel}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "transparent", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px", 
                    padding: "6px", 
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0 }}>Change Role</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p>Select a new role for <strong>{selectedUser.fullName}</strong>:</p>
                <select 
                  value={selectedUser.role || 'user'} 
                  onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                <button className="btn-primary" onClick={() => handleAction('/role', 'PUT', { role: selectedUser.role }, 'Role updated successfully')} disabled={actionLoading}>{actionLoading ? 'Updating...' : 'Confirm Change'}</button>
              </div>
            </div>
          )}

          {/* SUSPEND MODAL */}
          {activeModal === 'suspend' && (
            <div className="ticket-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  className="close-btn" 
                  onClick={handleBackToPanel}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "transparent", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px", 
                    padding: "6px", 
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0 }}>{(selectedUser.status || 'Active') === 'Active' ? 'Suspend User' : 'Activate User'}</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
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
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  className="close-btn" 
                  onClick={handleBackToPanel}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "transparent", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px", 
                    padding: "6px", 
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0 }}>Reset Password</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
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
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  className="close-btn" 
                  onClick={handleBackToPanel}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "transparent", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px", 
                    padding: "6px", 
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0 }}>Delete User</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
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

          {/* EXAM HISTORY MODAL */}
          {activeModal === 'history' && (
            <div className="ticket-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  className="close-btn" 
                  onClick={handleBackToPanel}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "transparent", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px", 
                    padding: "6px", 
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0 }}>Exam History</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  Exam attempts for <strong>{selectedUser?.fullName}</strong>:
                </p>
                {historyLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading attempts...</div>
                ) : attemptsData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                    <History size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p>No exam history found for this user.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {attemptsData.map((attempt) => (
                      <div key={attempt._id} style={{ 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '12px', 
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)' }}>{attempt.quizTitle || 'Mock Test'}</h4>
                          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                            Subject: {attempt.subject || 'N/A'} • {new Date(attempt.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '700', color: '#6E3FF3', fontSize: '15px' }}>
                              {attempt.score}/{attempt.totalMarks}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {(attempt.percentage || 0).toFixed(1)}%
                            </div>
                          </div>
                          {attempt.shareId && (
                            <a 
                              href={`/student/result/${attempt.shareId}`} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                background: 'rgba(110, 63, 243, 0.1)', 
                                color: '#6E3FF3', 
                                padding: '8px', 
                                borderRadius: '8px',
                                textDecoration: 'none'
                              }}
                              title="View Result Page"
                            >
                              <Eye size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={closeModal} style={{ width: '100%' }}>Close</button>
              </div>
            </div>
          )}

          {/* PERFORMANCE DASHBOARD MODAL */}
          {activeModal === 'performance' && (
            <div className="ticket-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  className="close-btn" 
                  onClick={handleBackToPanel}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "transparent", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px", 
                    padding: "6px", 
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0 }}>Performance Analytics</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                  Performance analysis for <strong>{selectedUser?.fullName}</strong>:
                </p>
                {historyLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Analyzing metrics...</div>
                ) : attemptsData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                    <Activity size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p>No performance data available yet.</p>
                  </div>
                ) : (() => {
                  const total = attemptsData.length;
                  const avg = (attemptsData.reduce((sum, a) => sum + (a.percentage || 0), 0) / total).toFixed(1);
                  const highest = Math.max(...attemptsData.map(a => a.percentage || 0)).toFixed(1);
                  const lowest = Math.min(...attemptsData.map(a => a.percentage || 0)).toFixed(1);

                  // Group by subject
                  const subjectStats = {};
                  attemptsData.forEach(a => {
                    const subj = a.subject || 'General';
                    if (!subjectStats[subj]) {
                      subjectStats[subj] = { total: 0, sum: 0 };
                    }
                    subjectStats[subj].total += 1;
                    subjectStats[subj].sum += a.percentage || 0;
                  });

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* STATS GRID */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tests Attempted</div>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{total}</div>
                        </div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Average Score</div>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: '#6E3FF3' }}>{avg}%</div>
                        </div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Highest Score</div>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--green)' }}>{highest}%</div>
                        </div>
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Lowest Score</div>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>{lowest}%</div>
                        </div>
                      </div>

                      {/* SUBJECTS BAR CHART */}
                      <div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subject Performance</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {Object.entries(subjectStats).map(([subj, data]) => {
                            const percentage = (data.sum / data.total).toFixed(1);
                            return (
                              <div key={subj}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{subj}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>{percentage}% ({data.total} tests)</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ width: `${percentage}%`, height: '100%', background: '#6E3FF3', borderRadius: '4px' }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={closeModal} style={{ width: '100%' }}>Close</button>
              </div>
            </div>
          )}

          {/* SUPPORT TICKETS MODAL */}
          {activeModal === 'tickets' && (
            <div className="ticket-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  className="close-btn" 
                  onClick={handleBackToPanel}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    background: "transparent", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px", 
                    padding: "6px", 
                    cursor: "pointer",
                    color: "var(--text-secondary)"
                  }}
                  title="Back to Actions"
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ margin: 0 }}>Support Tickets</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  Support tickets raised by <strong>{selectedUser?.fullName}</strong>:
                </p>
                {ticketsLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading tickets...</div>
                ) : userTickets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                    <Ticket size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p>No support tickets raised by this user.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {userTickets.map((ticket) => (
                      <div key={ticket._id} style={{ 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '12px', 
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            {ticket.category}
                          </span>
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '3px 8px', 
                            borderRadius: '12px', 
                            fontWeight: '600',
                            background: ticket.status === 'Resolved' ? 'rgba(34, 197, 94, 0.15)' : ticket.status === 'Open' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                            color: ticket.status === 'Resolved' ? '#22c55e' : ticket.status === 'Open' ? '#3b82f6' : '#6b7280'
                          }}>
                            {ticket.status}
                          </span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: '14.5px', color: 'var(--text-primary)' }}>{ticket.subject}</h4>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{ticket.message}</p>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Raised on: {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ padding: '24px 30px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
                <button className="btn-secondary" onClick={closeModal} style={{ width: '100%' }}>Close</button>
              </div>
            </div>
          )}

          {/* ADD USER MODAL */}
          {activeModal === 'add_user' && (
            <div className="ticket-modal center-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="modal-header" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h3 style={{ margin: 0 }}>Add New User</h3>
                <button className="close-btn" onClick={closeModal} style={{ marginLeft: "auto" }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddUserSubmit} autoComplete="off">
                <div className="modal-body" style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div className="input-box" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Enter full name"
                      value={addForm.fullName}
                      onChange={e => setAddForm({ ...addForm, fullName: e.target.value })}
                      style={{ width: '100%', height: '46px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '0 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div className="input-box" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      required 
                      placeholder="Enter email address"
                      value={addForm.email}
                      onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                      autoComplete="new-email"
                      style={{ width: '100%', height: '46px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '0 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div className="input-box" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Phone Number (Optional)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Enter phone number"
                      value={addForm.phone}
                      onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                      style={{ width: '100%', height: '46px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '0 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div className="input-box" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Password
                    </label>
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input 
                        type={showAddPassword ? "text" : "password"} 
                        required 
                        placeholder="Enter password (min 6 characters)"
                        value={addForm.password}
                        onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                        autoComplete="new-password"
                        style={{ width: '100%', height: '46px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '0 46px 0 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAddPassword(!showAddPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '6px'
                        }}
                      >
                        {showAddPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="input-box" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Assign Role
                    </label>
                    <select
                      value={addForm.role}
                      onChange={e => setAddForm({ ...addForm, role: e.target.value, department: (['admin', 'superadmin', 'manager', 'employee'].includes(e.target.value)) ? (addForm.department || '') : '' })}
                      style={{ width: '100%', height: '46px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '0 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                    >
                      <option value="user">User / Student</option>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                  </div>

                  {addForm.role === 'superadmin' && (
                    <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={addForm.receiveMonthlyAuditReport || false}
                        onChange={e => setAddForm({...addForm, receiveMonthlyAuditReport: e.target.checked})}
                        style={{ width: '16px', height: '16px', minWidth: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text-primary)' }}>
                        Receive Monthly Audit Logs via Email
                      </span>
                    </label>
                  )}

                  {(['admin', 'superadmin', 'manager', 'employee'].includes(addForm.role)) && (
                    <>
                      <div className="input-box" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                          Department
                        </label>
                        <select
                          value={addForm.department || ''}
                          onChange={e => {
                            const deptName = e.target.value;
                            const selectedDept = departments.find(d => d.name === deptName);
                            const defaultPermissions = selectedDept ? (selectedDept.permissions || []) : [];
                            setAddForm({
                              ...addForm,
                              department: deptName,
                              permissions: defaultPermissions
                            });
                          }}
                          style={{ width: '100%', height: '46px', borderRadius: '10px', border: '1.5px solid var(--border-color)', padding: '0 16px', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                        >
                          <option value="">None</option>
                          {departments.map(d => (
                            <option key={d._id} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Assign Custom Permissions
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '140px', overflowY: 'auto', border: '1.5px solid var(--border-color)', padding: '12px', borderRadius: '10px', background: 'var(--bg-main)' }}>
                          {ALL_PERMISSIONS.map(p => {
                            const isChecked = addForm.permissions?.includes(p.key);
                            return (
                              <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => {
                                    const newPerms = isChecked
                                      ? (addForm.permissions || []).filter(x => x !== p.key)
                                      : [...(addForm.permissions || []), p.key];
                                    setAddForm({...addForm, permissions: newPerms});
                                  }}
                                  style={{ width: 'auto', height: 'auto', cursor: 'pointer' }}
                                />
                                <span>{p.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                </div>
                <div className="modal-footer" style={{ padding: '20px 30px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)' }}>
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="create-quiz-pill-btn" style={{ minHeight: '38px', padding: '0 24px', fontSize: '13.5px' }} disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default Users;