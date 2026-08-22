import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";
import "../css/AdminTickets.css";
import { X, User, ShieldCheck, Clock, Activity, Phone, Eye, EyeOff, BarChart2, Settings, AlertTriangle, Edit, History, Ticket, UserMinus, UserCheck, Key, Trash2, ArrowLeft, Calendar, Medal, Mail, ExternalLink, Shield, ChevronDown, FileText, Target, BookOpen } from 'lucide-react';

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
  const [viewedProfileUser, setViewedProfileUser] = useState(null);
  
  // Profile/Edit states
  const [quizzesAttempted, setQuizzesAttempted] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", role: "", status: "", department: "", permissions: [], receiveMonthlyAuditReport: false });
  const [addForm, setAddForm] = useState({ fullName: "", email: "", phone: "", role: "user", password: "", department: "", permissions: [], receiveMonthlyAuditReport: false });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const currentUserRole = localStorage.getItem("role");
  const [userTypeFilter, setUserTypeFilter] = useState("users");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profileActionsOpen, setProfileActionsOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  // Fetch quizzes attempted & attempts details for profile/history/performance/viewedProfileUser
  useEffect(() => {
    const userToFetch = viewedProfileUser || selectedUser;
    if (userToFetch && (viewedProfileUser || activeModal === 'profile_popup' || activeModal === 'profile_drawer' || activeModal === 'history' || activeModal === 'performance')) {
      setQuizzesAttempted("Loading...");
      setHistoryLoading(true);
      axios.get(`${import.meta.env.VITE_API_URL}/api/results/${userToFetch._id}`, {
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
  }, [activeModal, selectedUser, viewedProfileUser]);

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

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const isRegularUser = u.role === "user";
    const matchesType = userTypeFilter === "users" ? isRegularUser : !isRegularUser;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Manage Users" />

        <div className="admin-content manage-users-view-container">
          {viewedProfileUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', color: 'var(--text-primary)' }}>
              
              {/* Top Navigation Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  onClick={() => setViewedProfileUser(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
                >
                  <ArrowLeft size={16} /> Back to Users
                </button>
                
                {/* Actions Dropdown */}
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setProfileActionsOpen(!profileActionsOpen)}
                    className="create-quiz-pill-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
                  >
                    Actions <ChevronDown size={14} />
                  </button>
                  
                  {profileActionsOpen && (
                    <>
                      <div 
                        onClick={() => setProfileActionsOpen(false)}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'transparent' }}
                      />
                      <div style={{ position: 'absolute', right: 0, top: '40px', backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '10px', padding: '6px 0', minWidth: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 100, textAlign: 'left' }}>
                        {currentUserRole === 'superadmin' && (
                          <div 
                            onClick={() => { setProfileActionsOpen(false); openModal('edit', viewedProfileUser); }}
                            style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Edit size={15} /> Edit User
                          </div>
                        )}
                        <div 
                          onClick={() => { setProfileActionsOpen(false); openModal('tickets', viewedProfileUser); }}
                          style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: '8px' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Ticket size={15} /> Support Tickets
                        </div>
                        {currentUserRole === 'superadmin' && (
                          <>
                            <div 
                              onClick={() => { setProfileActionsOpen(false); openModal('suspend', viewedProfileUser); }}
                              style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', transition: 'background 0.15s', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {(viewedProfileUser.status || 'Active') === 'Active' ? <><UserMinus size={15} /> Suspend</> : <><UserCheck size={15} /> Activate</>}
                            </div>
                            <div 
                              onClick={() => { setProfileActionsOpen(false); openModal('reset', viewedProfileUser); }}
                              style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: '8px' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--option-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Key size={15} /> Reset Password
                            </div>
                            <div 
                              onClick={() => { setProfileActionsOpen(false); openModal('delete', viewedProfileUser); }}
                              style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '12.5px', fontWeight: '600', color: 'var(--red, #ef4444)', transition: 'background 0.15s', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(226, 67, 107, 0.08)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Trash2 size={15} /> Delete User
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* User Profile Header Card */}
              <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '24px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  {viewedProfileUser.avatar || viewedProfileUser.profilePhoto ? (
                    <img 
                      src={viewedProfileUser.avatar || viewedProfileUser.profilePhoto} 
                      alt="Profile" 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(110, 63, 243, 0.2)' }} 
                    />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '32px', fontWeight: '700', textTransform: 'uppercase' }}>
                      {viewedProfileUser.fullName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>{viewedProfileUser.fullName || 'Unknown'}</h2>
                      <span style={{ background: viewedProfileUser.status === 'Suspended' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: viewedProfileUser.status === 'Suspended' ? '#ef4444' : '#10b981', borderRadius: '100px', padding: '2px 10px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: viewedProfileUser.status === 'Suspended' ? '#ef4444' : '#10b981' }} />
                        {viewedProfileUser.status || 'Active'}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: '600' }}>{viewedProfileUser.role || 'User'}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Joined on {viewedProfileUser.createdAt ? new Date(viewedProfileUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                  </div>
                </div>
                
                {/* Horizontal Metadata Area */}
                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(110, 63, 243, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                      <Mail size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Email Address</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{viewedProfileUser.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(110, 63, 243, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                      <Phone size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Phone No.</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{viewedProfileUser.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(110, 63, 243, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                      <Clock size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Joined On</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{viewedProfileUser.createdAt ? new Date(viewedProfileUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + new Date(viewedProfileUser.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Four Metric Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <Activity size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Tests Attempted</span>
                    <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{quizzesAttempted !== 'Loading' && quizzesAttempted !== 'Error' ? quizzesAttempted : '0'}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Tests</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                    <BarChart2 size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Quizzes</span>
                    <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{quizzesAttempted !== 'Loading' && quizzesAttempted !== 'Error' ? quizzesAttempted : '0'}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Quizzes</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                    <Medal size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Exams Purchased</span>
                    <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{((viewedProfileUser.purchasedExams?.length || 0) + (viewedProfileUser.purchasedPractice?.length || 0))}</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Exams</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                    <Settings size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Average Score</span>
                    <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {attemptsData.length > 0 ? (attemptsData.reduce((acc, curr) => acc + (curr.total > 0 ? (curr.score / curr.total) * 100 : 0), 0) / attemptsData.length).toFixed(2) : '0.00'}%
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Overall Average</span>
                  </div>
                </div>
              </div>
              
              {/* Attempted Subjects & Purchased Exams Side-by-Side */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* Attempted Subjects */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Attempted Subjects</h3>
                  <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {attemptsData.length > 0 ? (
                      (() => {
                        const subjectStats = {};
                        attemptsData.forEach(att => {
                          const sub = att.subject || "General Studies";
                          if (!subjectStats[sub]) {
                            subjectStats[sub] = { count: 0, scoreSum: 0 };
                          }
                          subjectStats[sub].count++;
                          subjectStats[sub].scoreSum += att.total > 0 ? (att.score / att.total) * 100 : 0;
                        });
                        const subjectStatsList = Object.keys(subjectStats).map(name => ({
                          name,
                          count: subjectStats[name].count,
                          avgScore: (subjectStats[name].scoreSum / subjectStats[name].count).toFixed(2)
                        }));
                        
                        return subjectStatsList.map((stat, idx) => (
                          <div key={idx} style={{ flex: '0 0 180px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(110, 63, 243, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                                <FileText size={14} />
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.name}</span>
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--violet)' }}>{stat.avgScore}%</h4>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stat.count} Tests | Avg. Score</span>
                            </div>
                          </div>
                        ));
                      })()
                    ) : (
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No attempts yet</p>
                    )}
                  </div>
                </div>
                
                {/* Purchased Exams */}
                <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Purchased Exams</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '144px', overflowY: 'auto' }}>
                    {((viewedProfileUser.purchasedExams?.length || 0) > 0 || (viewedProfileUser.purchasedPractice?.length || 0) > 0) ? (
                      <>
                        {viewedProfileUser.purchasedExams?.map((ex, idx) => (
                          <div key={`ex-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                <Medal size={14} />
                              </div>
                              <div>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{ex.title || 'Untitled Exam'}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Exam Series</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Purchased: {new Date(viewedProfileUser.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>
                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '100px', padding: '2px 8px', fontSize: '10px', fontWeight: '700' }}>Active</span>
                          </div>
                        ))}
                        {viewedProfileUser.purchasedPractice?.map((pr, idx) => (
                          <div key={`pr-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                <Medal size={14} />
                              </div>
                              <div>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{pr.title || 'Untitled Practice Set'}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Practice Set</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Purchased: {new Date(viewedProfileUser.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>
                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '100px', padding: '2px 8px', fontSize: '10px', fontWeight: '700' }}>Active</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No purchased modules yet</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Recent Test Activity */}
              <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Recent Test Activity</h3>
                  <button 
                    onClick={() => openModal('history', viewedProfileUser)}
                    style={{ background: 'rgba(110, 63, 243, 0.08)', border: 'none', color: 'var(--violet)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    View All
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '16px' }}>
                  
                  {/* Grid Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1fr 2fr 1fr', padding: '0 16px 8px 16px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <div>Test / Quiz Name</div>
                    <div>Subject</div>
                    <div>Score</div>
                    <div>Date</div>
                    <div style={{ textAlign: 'center' }}>Status</div>
                  </div>

                  {/* Grid Rows */}
                  {attemptsData.slice(0, 3).map((att, idx) => {
                    const pct = att.total > 0 ? (att.score / att.total) * 100 : 0;
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1fr 2fr 1fr', alignItems: 'center', padding: '16px 0', borderBottom: idx === attemptsData.slice(0, 3).length - 1 ? 'none' : '1px solid var(--border-color)', fontSize: '13px' }}>
                        
                        {/* Test Name with Round Colored Icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: idx % 3 === 0 ? 'rgba(239, 68, 68, 0.1)' : (idx % 3 === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(110, 63, 243, 0.1)'),
                            color: idx % 3 === 0 ? '#ef4444' : (idx % 3 === 1 ? '#10b981' : 'var(--violet)'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {idx % 3 === 0 ? <Clock size={15} /> : (idx % 3 === 1 ? <Target size={15} /> : <BookOpen size={15} />)}
                          </div>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{att.quizTitle || 'Untitled'}</span>
                        </div>

                        {/* Subject */}
                        <div style={{ color: 'var(--text-secondary)' }}>{att.subject || 'N/A'}</div>

                        {/* Score */}
                        <div style={{ fontWeight: '700', color: 'var(--violet)' }}>{pct.toFixed(0)} %</div>

                        {/* Date */}
                        <div style={{ color: 'var(--text-secondary)' }}>{new Date(att.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>

                        {/* Status */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '100px', padding: '4px 12px', fontSize: '11px', fontWeight: '700' }}>Completed</span>
                        </div>

                      </div>
                    );
                  })}

                  {attemptsData.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                      No recent activity.
                    </div>
                  )}

                </div>
              </div>
              
            </div>
          ) : (
            <>
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
                {isMobile ? (
                  <div 
                    className="qb-flip-container" 
                    onClick={() => setUserTypeFilter(userTypeFilter === 'users' ? 'staff' : 'users')}
                    style={{ flex: "1", minWidth: "90px", height: "30px" }}
                  >
                    <div className={`qb-flip-card ${userTypeFilter === "staff" ? "flipped" : ""}`}>
                      <div className="qb-flip-front" style={{ padding: "4px 8px", borderRadius: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600" }}>Users</span>
                      </div>
                      <div className="qb-flip-back" style={{ padding: "4px 8px", borderRadius: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "600" }}>Staff</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '2px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <button 
                      onClick={() => setUserTypeFilter('users')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: userTypeFilter === 'users' ? '#6E3FF3' : 'transparent',
                        color: userTypeFilter === 'users' ? '#FFFFFF' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Users
                    </button>
                    <button 
                      onClick={() => setUserTypeFilter('staff')}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: userTypeFilter === 'staff' ? '#6E3FF3' : 'transparent',
                        color: userTypeFilter === 'staff' ? '#FFFFFF' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Staff
                    </button>
                  </div>
                )}

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
            <div style={{ width: '100%', overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch', paddingBottom: '180px', position: 'relative', zIndex: 5 }}>
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
                                    onClick={() => { setActiveDropdown(null); setViewedProfileUser(u); }}
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

            <div className="table-pagination-footer" style={{ marginTop: '-180px', position: 'relative', background: '#FAFAFC', zIndex: 1 }}>
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
          </>
          )}
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
            <div className={`ticket-modal ${activeModal === 'profile_popup' ? 'center-modal' : ''}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: activeModal === 'profile_drawer' ? '700px' : '500px', width: activeModal === 'profile_drawer' ? '700px' : '90%' }}>
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
              
              <div className="modal-body" style={{ padding: "24px 0 0 0" }}>
                {/* Profile Header Area (Horizontal Layout) */}
                <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "28px", padding: "0 24px" }}>
                  {selectedUser.avatar || selectedUser.profilePhoto ? (
                    <img 
                      src={selectedUser.avatar || selectedUser.profilePhoto} 
                      alt="Profile" 
                      style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(124, 58, 237, 0.2)", outline: "2px solid #7c3aed" }} 
                    />
                  ) : (
                    <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: "40px", fontWeight: "700", border: "4px solid rgba(124, 58, 237, 0.2)", outline: "2px solid #7c3aed", textTransform: "uppercase" }}>
                      {(selectedUser.fullName || selectedUser.name || "U")[0]}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>{selectedUser.fullName || "Unknown"}</h2>
                    <div style={{ display: "flex" }}>
                      <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", borderRadius: "100px", padding: "4px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                        {selectedUser.status || "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Divider Line */}
                <div style={{ height: "1.5px", background: "var(--border-color)", opacity: 0.5, marginBottom: "0", width: "100%" }} />

                {/* Metadata List Stack (separated by lines, structured in 3 columns) */}
                <div className="ticket-meta" style={{ background: "transparent", border: "none", padding: 0, gap: 0, display: "flex", flexDirection: "column" }}>
                  
                  {/* USER DETAILS */}
                  <div style={{ display: "flex", alignItems: "center", padding: "18px 24px", borderBottom: "1.5px solid var(--border-color)" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(124, 58, 237, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--violet)" }}>
                      <User size={18} />
                    </div>
                    <div style={{ width: "160px", paddingLeft: "16px", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>User Details</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{selectedUser.fullName || "Unknown"}</p>
                      <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>{selectedUser.email}</p>
                    </div>
                  </div>
                  {/* ROLE */}
                  <div style={{ display: "flex", alignItems: "center", padding: "18px 24px", borderBottom: "1.5px solid var(--border-color)" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(124, 58, 237, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--violet)" }}>
                      <ShieldCheck size={18} />
                    </div>
                    <div style={{ width: "160px", paddingLeft: "16px", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Role</span>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", textTransform: "capitalize" }}>{selectedUser.role || "User"}</span>
                    </div>
                  </div>

                  {/* MOCK TESTS ATTEMPTED */}
                  <div style={{ display: "flex", flexDirection: "column", padding: "18px 24px", borderBottom: "1.5px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(124, 58, 237, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--violet)" }}>
                        <Activity size={18} />
                      </div>
                      <div style={{ width: "160px", paddingLeft: "16px", flexShrink: 0 }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Mock Tests Attempted</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                          {quizzesAttempted !== null ? quizzesAttempted : "Loading..."}
                        </span>
                      </div>
                    </div>
                    {/* Attempted Quizzes List */}
                    {attemptsData && attemptsData.length > 0 && (
                      <div style={{ marginTop: "12px", background: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border-color)", padding: "10px", maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {attemptsData.map((att, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", borderBottom: idx === attemptsData.length - 1 ? "none" : "1px solid var(--border-color)", paddingBottom: "6px", paddingTop: idx === 0 ? "0" : "6px" }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: "700", color: "var(--text-primary)" }}>{att.quizTitle || att.subject || "Untitled Quiz"}</p>
                              <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>{new Date(att.createdAt).toLocaleDateString("en-GB").replace(/\//g, '-')}</span>
                            </div>
                            <span style={{ fontWeight: "700", color: "var(--violet)" }}>{att.score}/{att.total}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PURCHASED MODULES */}
                  <div style={{ display: "flex", flexDirection: "column", padding: "18px 24px", borderBottom: "1.5px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#10B981" }}>
                        <Medal size={18} />
                      </div>
                      <div style={{ width: "160px", paddingLeft: "16px", flexShrink: 0 }}>
                        <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Purchased Exams</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                          {((selectedUser.purchasedExams?.length || 0) + (selectedUser.purchasedPractice?.length || 0))} Modules
                        </span>
                      </div>
                    </div>
                    {/* Purchased Modules List */}
                    {((selectedUser.purchasedExams?.length || 0) > 0 || (selectedUser.purchasedPractice?.length || 0) > 0) ? (
                      <div style={{ marginTop: "12px", background: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border-color)", padding: "10px", maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {selectedUser.purchasedExams?.map((ex, idx) => (
                          <div key={`ex-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", borderBottom: (idx === selectedUser.purchasedExams.length - 1 && (!selectedUser.purchasedPractice || selectedUser.purchasedPractice.length === 0)) ? "none" : "1px solid var(--border-color)", paddingBottom: "6px" }}>
                            <div>
                              <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#10B981", display: "block" }}>Exam Series</span>
                              <p style={{ margin: 0, fontWeight: "700", color: "var(--text-primary)" }}>{ex.title}</p>
                            </div>
                            {ex.price > 0 && <span style={{ fontWeight: "700", color: "var(--text-secondary)" }}>₹{ex.price}</span>}
                          </div>
                        ))}
                        {selectedUser.purchasedPractice?.map((pr, idx) => (
                          <div key={`pr-${idx}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", borderBottom: idx === selectedUser.purchasedPractice.length - 1 ? "none" : "1px solid var(--border-color)", paddingBottom: "6px" }}>
                            <div>
                              <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#3B82F6", display: "block" }}>Practice Set</span>
                              <p style={{ margin: 0, fontWeight: "700", color: "var(--text-primary)" }}>{pr.title}</p>
                            </div>
                            {pr.price > 0 && <span style={{ fontWeight: "700", color: "var(--text-secondary)" }}>₹{pr.price}</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: "8px 0 0 56px", fontSize: "12.5px", color: "var(--text-muted)", fontStyle: "italic" }}>No purchased modules</p>
                    )}
                  </div>

                  {/* JOINED ON */}
                  <div style={{ display: "flex", alignItems: "center", padding: "18px 24px", borderBottom: "1.5px solid var(--border-color)" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(124, 58, 237, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--violet)" }}>
                      <Clock size={18} />
                    </div>
                    <div style={{ width: "160px", paddingLeft: "16px", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Joined On</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                        {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* PHONE NO */}
                  <div style={{ display: "flex", alignItems: "center", padding: "18px 24px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(124, 58, 237, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--violet)" }}>
                      <Phone size={18} />
                    </div>
                    <div style={{ width: "160px", paddingLeft: "16px", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Phone No</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{selectedUser.phone || "Not provided"}</span>
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
                {(() => {
                  const loggedInUser = (() => {
                    const u = localStorage.getItem("user");
                    if (!u) return null;
                    try { return JSON.parse(u); } catch(e) { return null; }
                  })();
                  const canViewPermissions = loggedInUser && (
                    loggedInUser.role === 'superadmin' ||
                    loggedInUser._id === selectedUser?._id
                  );
                  if (!canViewPermissions) return null;
                  return (
                    <>
                      {editForm.role === 'superadmin' && (
                        <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '8px', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={editForm.receiveMonthlyAuditReport || false}
                            onChange={e => setEditForm({...editForm, receiveMonthlyAuditReport: e.target.checked})}
                            disabled={loggedInUser?._id !== selectedUser?._id}
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
                              const isSuperAdmin = editForm.role === 'superadmin';
                              const isChecked = isSuperAdmin ? true : editForm.permissions?.includes(p.key);
                              return (
                                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-primary)', cursor: isSuperAdmin ? 'not-allowed' : 'pointer', opacity: isSuperAdmin ? 0.8 : 1 }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    disabled={isSuperAdmin}
                                    onChange={() => {
                                      if (isSuperAdmin) return;
                                      const newPerms = isChecked
                                        ? (editForm.permissions || []).filter(x => x !== p.key)
                                        : [...(editForm.permissions || []), p.key];
                                      setEditForm({...editForm, permissions: newPerms});
                                    }}
                                    style={{ width: 'auto', height: 'auto', cursor: isSuperAdmin ? 'not-allowed' : 'pointer' }}
                                  />
                                  <span>{p.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
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
              <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px 30px' }}>
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
                    {attemptsData.map((attempt) => {
                      const pct = attempt.total > 0 ? (attempt.score / attempt.total) * 100 : 0;
                      return (
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
                                {attempt.score}/{attempt.total}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {pct.toFixed(1)}%
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
                      );
                    })}
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

                      {(() => {
                        const loggedInUser = (() => {
                          const u = localStorage.getItem("user");
                          if (!u) return null;
                          try { return JSON.parse(u); } catch(e) { return null; }
                        })();
                        if (loggedInUser?.role !== 'superadmin') return null;
                        return (
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
                        );
                      })()}
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