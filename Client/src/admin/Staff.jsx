import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X, User, ShieldCheck, Clock, Phone, AlertTriangle, Edit,
  UserMinus, UserCheck, Key, Trash2, ArrowLeft, Calendar,
  Mail, Shield, ChevronDown, Search, CheckCircle, Lock
} from 'lucide-react';

const STAFF_PANEL_PERMISSIONS = [
  { key: "dashboard",             label: "Dashboard" },
  { key: "create_quiz",           label: "Create Quiz" },
  { key: "edit_quiz",             label: "Manage Quizzes" },
  { key: "manage_practice_tests", label: "Practice Modules" },
  { key: "manage_questions",      label: "Questions" },
  { key: "manage_students",       label: "Manage Students" },
  { key: "manage_staff",          label: "Manage Staff" },
  { key: "manage_staff_roles",    label: "Staff Roles & Permissions" },
  { key: "manage_results",        label: "Results" },
  { key: "view_reports",          label: "Reports" },
  { key: "audit_logs",            label: "Audit Log" },
  { key: "support_tickets",       label: "Support Tickets" },
  { key: "manage_roles",          label: "Departments & Permissions" }
];

function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState("active"); // "active" or "archived"
  const [departments, setDepartments] = useState([]);
  
  // Modals & Drawers
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "employee",
    password: "",
    department: "",
    permissions: [],
    receiveMonthlyAuditReport: false
  });

  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "employee",
    status: "Active",
    department: "",
    permissions: [],
    receiveMonthlyAuditReport: false
  });

  // UI state
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const currentUserRole = localStorage.getItem("role");
  const currentUserId = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u._id || u.id;
    } catch (_) {
      return null;
    }
  })();

  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/departments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(res.data || []);
    } catch (e) {
      console.error("Fetch departments error:", e);
    }
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const endpoint = viewTab === "archived"
        ? `${import.meta.env.VITE_API_URL}/api/admin/staff/deleted`
        : `${import.meta.env.VITE_API_URL}/api/admin/staff`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaffList(res.data);
    } catch (error) {
      console.error("Fetch Staff Error:", error);
      showToast("Failed to fetch staff accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, [viewTab]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/staff`,
        addForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Staff account created successfully");
      setIsAddModalOpen(false);
      setAddForm({
        fullName: "",
        email: "",
        phone: "",
        role: "employee",
        password: "",
        department: "",
        permissions: [],
        receiveMonthlyAuditReport: false
      });
      fetchStaff();
    } catch (err) {
      console.error("Create Staff Error:", err);
      showToast(err.response?.data?.message || "Failed to create staff account", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (staff) => {
    setSelectedStaff(staff);
    setEditForm({
      fullName: staff.fullName || "",
      email: staff.email || "",
      phone: staff.phone || "",
      role: staff.role || "employee",
      status: staff.status || "Active",
      department: staff.department || "",
      permissions: Array.isArray(staff.permissions) ? [...staff.permissions] : [],
      receiveMonthlyAuditReport: !!staff.receiveMonthlyAuditReport
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/staff/${selectedStaff._id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Staff account updated successfully");
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err) {
      console.error("Update Staff Error:", err);
      showToast(err.response?.data?.message || "Failed to update staff account", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (staff) => {
    if (currentUserId && currentUserId === staff._id) {
      showToast("You cannot deactivate your own account.", "error");
      return;
    }
    setActionLoading(true);
    const newStatus = (staff.status || 'Active') === 'Active' ? 'Suspended' : 'Active';
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/staff/${staff._id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Staff status updated to ${newStatus}`);
      fetchStaff();
    } catch (err) {
      console.error("Toggle Status Error:", err);
      showToast(err.response?.data?.message || "Failed to update status", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (staff) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/staff/${staff._id}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Staff password reset email sent successfully");
    } catch (err) {
      console.error("Reset Password Error:", err);
      showToast(err.response?.data?.message || "Failed to reset password", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSoftDelete = async (staff) => {
    if (currentUserId && currentUserId === staff._id) {
      showToast("You cannot archive your own account.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/staff/${staff._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Staff account archived successfully");
      fetchStaff();
    } catch (err) {
      console.error("Archive Staff Error:", err);
      showToast(err.response?.data?.message || "Failed to archive staff", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreStaff = async (staffId) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/staff/${staffId}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Staff account restored successfully");
      fetchStaff();
    } catch (error) {
      console.error("Restore Staff Error:", error);
      showToast("Failed to restore staff account", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (staffId) => {
    if (currentUserId && currentUserId === staffId) {
      showToast("You cannot permanently delete your own account.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/staff/${staffId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Staff account permanently deleted");
      fetchStaff();
    } catch (error) {
      console.error("Permanent Delete Staff Error:", error);
      showToast(error.response?.data?.message || "Failed to permanently delete staff", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const togglePermission = (formType, permKey) => {
    if (formType === 'add') {
      const perms = addForm.permissions.includes(permKey)
        ? addForm.permissions.filter(p => p !== permKey)
        : [...addForm.permissions, permKey];
      setAddForm({ ...addForm, permissions: perms });
    } else {
      const perms = editForm.permissions.includes(permKey)
        ? editForm.permissions.filter(p => p !== permKey)
        : [...editForm.permissions, permKey];
      setEditForm({ ...editForm, permissions: perms });
    }
  };

  const filteredStaff = staffList.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      (s.fullName || "").toLowerCase().includes(term) ||
      (s.email || "").toLowerCase().includes(term) ||
      (s.department || "").toLowerCase().includes(term) ||
      (s.role || "").toLowerCase().includes(term)
    );
    const matchesDept = departmentFilter === "all" || s.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar 
          title="Manage Staff" 
          parentText="Dashboard" 
          parentLink="/admin/dashboard" 
          onNavigateBack={() => navigate("/admin/dashboard")} 
        />

        <div className="admin-content manage-users-view-container" style={{ width: "100%", paddingBottom: "80px" }}>
          {toast && (
            <div className={`toast toast-${toast.type}`} style={{
              position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
              padding: '12px 20px', borderRadius: '10px', background: toast.type === 'error' ? '#ef4444' : '#10b981',
              color: '#fff', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              {toast.message}
            </div>
          )}

          {/* Command Bar: Search, Dept Filter, Segmented Tabs, Add Staff */}
          <div className="manage-command-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: "0 1 480px", flexWrap: 'nowrap' }}>
              <div className="pill-search-container" style={{ marginBottom: 0, flex: 1, minWidth: '140px', maxWidth: '320px' }}>
                <svg width="14" height="14" className="pill-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search staff..." 
                  className="pill-search-input"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                  style={{ fontSize: "12px" }}
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{
                  padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', height: '34px', cursor: 'pointer'
                }}
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d._id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '2px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => { setViewTab('active'); setLoading(true); }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewTab === 'active' ? 'var(--primary)' : 'transparent',
                    color: viewTab === 'active' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Active Staff
                </button>
                <button 
                  onClick={() => { setViewTab('archived'); setLoading(true); }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: viewTab === 'archived' ? 'var(--primary)' : 'transparent',
                    color: viewTab === 'archived' ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Archived Staff
                </button>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="create-quiz-pill-btn"
                style={{
                  whiteSpace: 'nowrap',
                  padding: '6px 14px',
                  fontSize: '12px',
                  minHeight: '34px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                + Add Staff Member
              </button>
            </div>
          </div>

          {/* Staff Table */}
          <div className="quiz-table-wrapper" style={{ display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
            <div style={{ width: '100%', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: '160px', position: 'relative', zIndex: 5 }}>
              <table className="quiz-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Permissions</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, r) => (
                      <tr key={`sk-${r}`}>
                        <td><Skeleton width={140} height={16} /></td>
                        <td><Skeleton width={160} height={14} /></td>
                        <td><Skeleton width={80} height={18} rounded={6} /></td>
                        <td><Skeleton width={100} height={14} /></td>
                        <td><Skeleton width={70} height={14} /></td>
                        <td><Skeleton width={60} height={20} rounded={10} /></td>
                        <td style={{ textAlign: 'center' }}><Skeleton width={32} height={32} rounded={8} style={{ margin: '0 auto' }} /></td>
                      </tr>
                    ))
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((s) => {
                      const isActive = (s.status || 'Active') === 'Active';
                      const isSuper = s.role === 'superadmin';
                      const isSelf = currentUserId && currentUserId === s._id;

                      return (
                        <tr key={s._id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="user-avatar-circle" style={{
                                background: isSuper ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'var(--primary)',
                                color: '#fff', fontWeight: '700'
                              }}>
                                {s.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "S"}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13.5px' }}>{s.fullName}</span>
                                  {isSuper && (
                                    <span title="Super Admin Account (Protected)" style={{ display: 'inline-flex' }}>
                                      <Shield size={14} color="#f59e0b" />
                                    </span>
                                  )}
                                  {isSelf && (
                                    <span style={{ fontSize: '10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '1px 6px', borderRadius: '8px', fontWeight: '700' }}>You</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  Joined {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="user-email-text" style={{ whiteSpace: "nowrap" }}>{s.email}</td>

                          <td>
                            <span className={`role-outline-badge ${isSuper ? 'role-super' : s.role === 'admin' ? 'role-admin' : ''}`}>
                              {s.role === 'superadmin' ? 'Super Admin' : s.role === 'admin' ? 'Admin' : s.role === 'manager' ? 'Manager' : 'Employee'}
                            </span>
                          </td>

                          <td>
                            {s.department ? (
                              <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: '500' }}>
                                {s.department}
                              </span>
                            ) : (
                              <span style={{ opacity: 0.4, fontSize: '12px' }}>—</span>
                            )}
                          </td>

                          <td>
                            {isSuper ? (
                              <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>Full Access</span>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {s.permissions?.length || 0} panels
                              </span>
                            )}
                          </td>

                          <td>
                            <div className="status-active-cell" style={{ color: isActive ? '' : '#ef4444' }}>
                              <span className="status-dot" style={{ backgroundColor: isActive ? '' : '#ef4444' }}></span>
                              <span>{s.status || 'Active'}</span>
                            </div>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            {viewTab === 'archived' ? (
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button 
                                  className="btn-primary" 
                                  style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', background: '#22c55e', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleRestoreStaff(s._id)}
                                >
                                  <UserCheck size={13} /> Restore
                                </button>
                                {currentUserRole === 'superadmin' && (
                                  <button 
                                    style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', background: '#ef4444', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => handlePermanentDelete(s._id)}
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button 
                                  onClick={() => setActiveDropdown(activeDropdown === s._id ? null : s._id)}
                                  className="action-dots-btn"
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)' }}
                                >
                                  •••
                                </button>

                                {activeDropdown === s._id && (
                                  <>
                                    <div 
                                      onClick={() => setActiveDropdown(null)}
                                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'transparent' }}
                                    />
                                    <div style={{
                                      position: 'absolute', right: 0, top: '28px', backgroundColor: 'var(--bg-card)',
                                      border: '1.5px solid var(--border-color)', borderRadius: '10px', padding: '6px 0',
                                      minWidth: '175px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 100, textAlign: 'left'
                                    }}>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); handleOpenEdit(s); }}
                                        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                      >
                                        <Edit size={14} /> Edit Staff & Roles
                                      </div>
                                      <div 
                                        onClick={() => { setActiveDropdown(null); handleResetPassword(s); }}
                                        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                      >
                                        <Key size={14} /> Reset Password
                                      </div>

                                      {!isSelf && (
                                        <>
                                          <div 
                                            onClick={() => { setActiveDropdown(null); handleToggleStatus(s); }}
                                            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                          >
                                            {isActive ? <><UserMinus size={14} /> Suspend Staff</> : <><UserCheck size={14} /> Activate Staff</>}
                                          </div>
                                          <div 
                                            onClick={() => { setActiveDropdown(null); handleSoftDelete(s); }}
                                            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#ef4444', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                          >
                                            <Trash2 size={14} /> Archive Staff
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Staff Modal */}
          {isAddModalOpen && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '580px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Add Staff Member</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Create an internal administrative team account</p>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                      <input 
                        type="text" required
                        value={addForm.fullName}
                        onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address *</label>
                      <input 
                        type="email" required
                        value={addForm.email}
                        onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Staff Role *</label>
                      <select 
                        value={addForm.role}
                        onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        {currentUserRole === 'superadmin' && (
                          <option value="superadmin">Super Admin</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Department</label>
                      <select 
                        value={addForm.department}
                        onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      >
                        <option value="">No Department Assigned</option>
                        {departments.map(d => (
                          <option key={d._id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Initial Temporary Password</label>
                    <input 
                      type="password"
                      placeholder="Leave blank for default: StaffPass123!"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  {/* Permissions matrix (if not superadmin) */}
                  {addForm.role !== 'superadmin' && (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                        Dashboard Panel Permissions
                      </label>
                      <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-input, #1B1B32)' }}>
                        {STAFF_PANEL_PERMISSIONS.map(p => (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input 
                              type="checkbox"
                              checked={addForm.permissions.includes(p.key)}
                              onChange={() => togglePermission('add', p.key)}
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsAddModalOpen(false)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" disabled={actionLoading}
                      className="create-quiz-pill-btn"
                      style={{ padding: '8px 20px', fontSize: '13px' }}
                    >
                      {actionLoading ? "Creating..." : "Save Staff"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Staff Modal */}
          {isEditModalOpen && selectedStaff && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '580px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Edit Staff: {selectedStaff.fullName}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Update role assignment and panel privileges</p>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                      <input 
                        type="text" required
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                      <input 
                        type="email" required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Staff Role</label>
                      <select 
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        {currentUserRole === 'superadmin' && (
                          <option value="superadmin">Super Admin</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Department</label>
                      <select 
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      >
                        <option value="">No Department Assigned</option>
                        {departments.map(d => (
                          <option key={d._id} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editForm.role !== 'superadmin' && (
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                        Dashboard Panel Permissions
                      </label>
                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-input, #1B1B32)' }}>
                        {STAFF_PANEL_PERMISSIONS.map(p => (
                          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input 
                              type="checkbox"
                              checked={editForm.permissions.includes(p.key)}
                              onChange={() => togglePermission('edit', p.key)}
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsEditModalOpen(false)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" disabled={actionLoading}
                      className="create-quiz-pill-btn"
                      style={{ padding: '8px 20px', fontSize: '13px' }}
                    >
                      {actionLoading ? "Updating..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Staff;
