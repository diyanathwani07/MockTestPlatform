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
  Mail, Shield, ChevronDown, ChevronRight, MoreVertical, Search, CheckCircle, Lock
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
  { key: "manage_roles",          label: "Departments & Permissions" },
  // Revenue & Monetization
  { key: "view_revenue",          label: "View Revenue & Financial Analytics" },
  { key: "manage_revenue",        label: "Manage Revenue Operations" },
  { key: "manage_ai_plans",       label: "Manage AI Plans" },
  { key: "manage_ai_subscribers", label: "Manage AI Subscribers" }
];

function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState("active"); // "active" or "archived"
  const [departments, setDepartments] = useState([]);
  
  // Left Sidebar Manage Actions Drawer State
  const [actionsDrawerOpen, setActionsDrawerOpen] = useState(false);
  const [drawerStaff, setDrawerStaff] = useState(null);
  const [drawerSubView, setDrawerSubView] = useState('menu'); // 'menu' | 'edit' | 'suspend' | 'reset' | 'archive'

  const openActionsDrawer = (staff, initialSubView = 'menu') => {
    if (!staff) return;
    setDrawerStaff(staff);
    setDrawerSubView(initialSubView);
    setActionsDrawerOpen(true);
    if (initialSubView === 'edit') {
      handleOpenEdit(staff);
    }
  };

  // Modals & Drawers
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: null, bottom: null, right: 0 });

  const toggleActionDropdown = (e, staffId) => {
    if (activeDropdown === staffId) {
      setActiveDropdown(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    setDropdownPos({
      top: openUpwards ? null : Math.max(10, rect.bottom + 6),
      bottom: openUpwards ? Math.max(10, window.innerHeight - rect.top + 6) : null,
      right: Math.max(16, window.innerWidth - rect.right)
    });
    setActiveDropdown(staffId);
  };

  useEffect(() => {
    if (!activeDropdown) return;
    const handleClose = () => setActiveDropdown(null);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    return () => {
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
    };
  }, [activeDropdown]);
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
      setDrawerStaff(prev => prev ? { ...prev, ...editForm } : prev);
      setDrawerSubView('menu');
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
      setDrawerStaff(prev => prev && prev._id === staff._id ? { ...prev, status: newStatus } : prev);
      setDrawerSubView('menu');
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
      setDrawerSubView('menu');
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
      setActionsDrawerOpen(false);
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
      <div className="admin-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-page)" }}>
        <AdminNavbar 
          title="Manage Admin" 
          parentText="Dashboard" 
          parentLink="/admin/dashboard" 
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

          {/* ─── APEX COMMAND BAR ─── */}
          <div className="armored-admin-card manage-command-bar-card" style={{ 
            backgroundColor: "var(--bg-card)", 
            border: "1.5px solid var(--border-color)", 
            borderRadius: "16px", 
            marginBottom: "24px", 
            padding: "20px 24px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            textAlign: "left",
            width: "100%"
          }}>
            {/* Header Row: Title & Counts on Left, Add Staff & Tabs on Right */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                    Manage Admin
                  </h2>
                  <span style={{ fontSize: "11px", background: "rgba(110,63,243,0.15)", color: "#a78bfa", padding: "3px 8px", borderRadius: "12px", fontWeight: "700" }}>
                    Restricted Access
                  </span>
                </div>
                <span style={{ fontSize: "13px", color: "var(--primary, #7c3aed)", fontWeight: "600", marginTop: "4px", display: "inline-block" }}>
                  {filteredStaff.length} {viewTab === "active" ? "Active" : "Archived"} Admin Members
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-page)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <button 
                    onClick={() => { setViewTab('active'); setLoading(true); }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: viewTab === 'active' ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' : 'transparent',
                      color: viewTab === 'active' ? '#ffffff' : 'var(--text-secondary)',
                      boxShadow: viewTab === 'active' ? '0 2px 8px rgba(124, 58, 237, 0.3)' : 'none',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Active Admin
                  </button>
                  <button 
                    onClick={() => { setViewTab('archived'); setLoading(true); }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: viewTab === 'archived' ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' : 'transparent',
                      color: viewTab === 'archived' ? '#ffffff' : 'var(--text-secondary)',
                      boxShadow: viewTab === 'archived' ? '0 2px 8px rgba(124, 58, 237, 0.3)' : 'none',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Archived Admin
                  </button>
                </div>

                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="create-quiz-pill-btn"
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    minHeight: '36px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  + Add Admin Member
                </button>
              </div>
            </div>

            {/* Filter Row: Search & Department Dropdown */}
            <div style={{ display: "flex", gap: "12px", width: "100%", flexWrap: "wrap", alignItems: "center" }}>
              <div className="pill-search-container" style={{ margin: 0, flex: "1 1 260px", maxWidth: "340px", display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", height: "38px" }}>
                <Search size={15} className="pill-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search admin members..." 
                  className="pill-search-input"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ flex: "0 1 200px", minWidth: "160px", height: "38px", display: "flex", alignItems: "center", backgroundColor: "var(--bg-input, #FAFAFC)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0 12px" }}>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: "12px", color: "var(--text-primary)", fontWeight: "500", width: "100%", cursor: "pointer" }}
                >
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d._id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {(searchTerm || departmentFilter !== "all") && (
                <button
                  onClick={() => { setSearchTerm(""); setDepartmentFilter("all"); }}
                  style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: "6px 10px" }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Staff Table */}
          <div className="quiz-table-wrapper" style={{ 
            backgroundColor: "var(--bg-card)", 
            borderRadius: "16px", 
            border: "1px solid var(--border-color)", 
            boxShadow: "var(--card-shadow)",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            width: "100%"
          }}>
            <table className="quiz-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>Admin Member</th>
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
                                color: '#fff', fontWeight: '700',
                                overflow: 'hidden'
                              }}>
                                {(s.avatar || s.profilePhoto) ? (
                                  <img 
                                    src={s.avatar || s.profilePhoto} 
                                    alt={s.fullName} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                  />
                                ) : (
                                  s.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "S"
                                )}
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
                              <button 
                                onClick={() => openActionsDrawer(s, 'menu')}
                                className="action-dots-btn"
                                title="Manage Actions"
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)' }}
                              >
                                •••
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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

          {/* ================= MANAGE ACTIONS RIGHT SIDEBAR / DRAWER (ADMINS) ================= */}
          {actionsDrawerOpen && drawerStaff && (
            <div 
              className="actions-drawer-overlay"
              onClick={() => setActionsDrawerOpen(false)}
            >
              <div 
                className="actions-drawer-panel"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="actions-drawer-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {drawerSubView !== 'menu' && (
                      <button 
                        onClick={() => setDrawerSubView('menu')}
                        className="actions-back-btn"
                      >
                        <ArrowLeft size={14} /> Back
                      </button>
                    )}
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {drawerSubView === 'menu' && "Admin Actions"}
                      {drawerSubView === 'edit' && "Edit Admin & Roles"}
                      {drawerSubView === 'suspend' && ((drawerStaff.status || 'Active') === 'Active' ? "Suspend Admin" : "Activate Admin")}
                      {drawerSubView === 'reset' && "Reset Password"}
                      {drawerSubView === 'archive' && "Archive Admin"}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActionsDrawerOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Target Admin Mini-Profile Card */}
                <div style={{ padding: '16px 20px 0 20px' }}>
                  <div className="actions-drawer-user-card">
                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '700', fontSize: '18px', flexShrink: 0 }}>
                      {drawerStaff.fullName?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {drawerStaff.fullName}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '700', 
                          padding: '2px 8px', 
                          borderRadius: '100px', 
                          background: (drawerStaff.status || 'Active') === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: (drawerStaff.status || 'Active') === 'Active' ? '#10b981' : '#ef4444' 
                        }}>
                          {drawerStaff.status || 'Active'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {drawerStaff.email || 'No email provided'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <span style={{ 
                          fontSize: '10.5px', 
                          fontWeight: '700', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          background: 'rgba(124, 58, 237, 0.12)',
                          color: 'var(--primary)'
                        }}>
                          <Shield size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                          {drawerStaff.role === 'superadmin' ? 'Super Admin' : (drawerStaff.role?.toUpperCase() || 'ADMIN')}
                        </span>
                        {drawerStaff.department && (
                          <span style={{ 
                            fontSize: '10.5px', 
                            fontWeight: '600', 
                            padding: '2px 8px', 
                            borderRadius: '6px', 
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-secondary)'
                          }}>
                            {drawerStaff.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawer Body */}
                <div className="actions-drawer-body">
                  {drawerSubView === 'menu' && (
                    <div className="actions-menu-list">
                      {/* Edit Admin & Roles */}
                      <div 
                        className="actions-menu-item"
                        onClick={() => { handleOpenEdit(drawerStaff); setDrawerSubView('edit'); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                            <Edit size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Edit Admin & Roles</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Department, panel permissions & authority</div>
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>

                      {/* Reset Password */}
                      <div 
                        className="actions-menu-item"
                        onClick={() => setDrawerSubView('reset')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                            <Key size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Reset Password</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Send secure reset email link</div>
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>

                      {/* Suspend / Activate Admin (if not self) */}
                      {currentUserId !== drawerStaff._id && (
                        <div 
                          className="actions-menu-item"
                          onClick={() => setDrawerSubView('suspend')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: (drawerStaff.status || 'Active') === 'Active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (drawerStaff.status || 'Active') === 'Active' ? '#ef4444' : '#10b981' }}>
                              {(drawerStaff.status || 'Active') === 'Active' ? <UserMinus size={18} /> : <UserCheck size={18} />}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {(drawerStaff.status || 'Active') === 'Active' ? 'Suspend Admin' : 'Activate Admin'}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {(drawerStaff.status || 'Active') === 'Active' ? 'Block dashboard login access' : 'Restore dashboard login access'}
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </div>
                      )}

                      {/* Archive Admin (if not self) */}
                      {currentUserId !== drawerStaff._id && (
                        <div 
                          className="actions-menu-item danger"
                          onClick={() => setDrawerSubView('archive')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                              <Trash2 size={18} />
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>Archive Admin</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Move admin account to archive</div>
                            </div>
                          </div>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBVIEW: EDIT ADMIN */}
                  {drawerSubView === 'edit' && (
                    <form onSubmit={handleUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Role</label>
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
                            Dashboard Panel Privileges
                          </label>
                          <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-input, #1B1B32)' }}>
                            {STAFF_PANEL_PERMISSIONS.map(p => (
                              <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
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

                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button 
                          type="button" 
                          onClick={() => setDrawerSubView('menu')}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" disabled={actionLoading}
                          className="create-quiz-pill-btn"
                          style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                        >
                          {actionLoading ? "Updating..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* SUBVIEW: SUSPEND CONFIRMATION */}
                  {drawerSubView === 'suspend' && (
                    <div style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: (drawerStaff.status || 'Active') === 'Active' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: (drawerStaff.status || 'Active') === 'Active' ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        {(drawerStaff.status || 'Active') === 'Active' ? <UserMinus size={24} /> : <UserCheck size={24} />}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {(drawerStaff.status || 'Active') === 'Active' ? 'Suspend Admin Account?' : 'Activate Admin Account?'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {(drawerStaff.status || 'Active') === 'Active' 
                            ? `Suspending ${drawerStaff.fullName} will immediately block them from logging in to the admin dashboard.`
                            : `Activating ${drawerStaff.fullName} will restore their login and administrative permissions.`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button 
                          onClick={() => setDrawerSubView('menu')}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(drawerStaff)}
                          disabled={actionLoading}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: (drawerStaff.status || 'Active') === 'Active' ? '#ef4444' : '#10b981', color: '#ffffff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                          {actionLoading ? "Processing..." : ((drawerStaff.status || 'Active') === 'Active' ? "Confirm Suspend" : "Confirm Activate")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUBVIEW: RESET PASSWORD CONFIRMATION */}
                  {drawerSubView === 'reset' && (
                    <div style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.12)', color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        <Key size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          Send Password Reset Email?
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          A secure password reset email will be sent to <strong>{drawerStaff.email}</strong>.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button 
                          onClick={() => setDrawerSubView('menu')}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleResetPassword(drawerStaff)}
                          disabled={actionLoading}
                          className="create-quiz-pill-btn"
                          style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                        >
                          {actionLoading ? "Sending..." : "Send Reset Link"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUBVIEW: ARCHIVE CONFIRMATION */}
                  {drawerSubView === 'archive' && (
                    <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.03)', border: '1.5px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        <Trash2 size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700', color: '#ef4444' }}>
                          Archive Admin Account?
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          This will archive <strong>{drawerStaff.fullName}</strong>. They will no longer have access to the dashboard unless restored by a Super Admin.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button 
                          onClick={() => setDrawerSubView('menu')}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSoftDelete(drawerStaff)}
                          disabled={actionLoading}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#ffffff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                          {actionLoading ? "Archiving..." : "Archive Account"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Staff;
