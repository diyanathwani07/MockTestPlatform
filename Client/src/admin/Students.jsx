import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";
import "../css/AdminTickets.css";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X, User, Clock, Activity, Phone, BarChart2, AlertTriangle, Edit,
  History, UserMinus, UserCheck, Key, Trash2, ArrowLeft, Calendar,
  Medal, Mail, ExternalLink, ChevronDown, ChevronRight, MoreVertical, FileText, Sparkles,
  GraduationCap, Upload, Download, CheckCircle, Search, Target, BookOpen, Ticket
} from 'lucide-react';

function Students() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState("active"); // "active" or "archived"
  
  // Left Sidebar Manage Actions Drawer State
  const [actionsDrawerOpen, setActionsDrawerOpen] = useState(false);
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [drawerSubView, setDrawerSubView] = useState('menu'); // 'menu' | 'ai_plan' | 'tickets' | 'suspend' | 'reset' | 'archive'
  const [drawerTickets, setDrawerTickets] = useState([]);
  const [drawerTicketsLoading, setDrawerTicketsLoading] = useState(false);

  const openActionsDrawer = (student, initialSubView = 'menu') => {
    if (!student) return;
    setDrawerStudent(student);
    setDrawerSubView(initialSubView);
    setActionsDrawerOpen(true);
    if (student.tickets && student.tickets.length > 0) {
      setDrawerTickets(student.tickets);
    } else {
      setDrawerTicketsLoading(true);
      const token = localStorage.getItem("token");
      axios.get(`${import.meta.env.VITE_API_URL}/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const filtered = (res.data || []).filter(t => (t.userId?._id || t.userId) === student._id);
        setDrawerTickets(filtered);
      })
      .catch(err => console.error("Error fetching tickets for drawer:", err))
      .finally(() => setDrawerTicketsLoading(false));
    }

    if (initialSubView === 'ai_plan') {
      setSelectedStudent(student);
      setSelectedPlanId("");
      fetchAiPlans();
    }
  };
  
  // Drawer & Modal State
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: null, bottom: null, right: 0 });

  const toggleActionDropdown = (e, studentId) => {
    if (activeDropdown === studentId) {
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
    setActiveDropdown(studentId);
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
  const [activeModal, setActiveModal] = useState(null); // 'edit', 'suspend', 'reset', 'delete', 'ai_plan'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewedProfileStudent, setViewedProfileStudent] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [studentNotFound, setStudentNotFound] = useState(false);
  const { userId } = useParams();
  const navigate = useNavigate();

  // Add / CSV Import States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState('manual'); // 'manual' | 'csv'
  const [addForm, setAddForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvParsed, setCsvParsed] = useState([]);
  const [csvStep, setCsvStep] = useState('upload'); // 'upload' | 'preview' | 'result'
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const csvInputRef = useRef(null);

  // AI Plans & Subscription States
  const [aiPlans, setAiPlans] = useState([]);
  const [aiPlansLoading, setAiPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [aiActionLoading, setAiActionLoading] = useState(false);

  // Student metrics & attempts
  const [quizzesAttempted, setQuizzesAttempted] = useState(null);
  const [attemptsData, setAttemptsData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Tickets & AI Tests States
  const [userTickets, setUserTickets] = useState([]);
  const [userAiTests, setUserAiTests] = useState([]);
  const [ticketsModalOpen, setTicketsModalOpen] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Common UI States
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [profileActionsOpen, setProfileActionsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [permanentDeleteConfirm, setPermanentDeleteConfirm] = useState(null);

  const currentUserRole = localStorage.getItem("role");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const endpoint = viewTab === "archived" 
        ? `${import.meta.env.VITE_API_URL}/api/admin/students/deleted`
        : `${import.meta.env.VITE_API_URL}/api/admin/students`;

      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data);
    } catch (error) {
      console.error("Fetch Students Error:", error);
      showToast("Failed to fetch students", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAiPlans = async () => {
    setAiPlansLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/ai-plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiPlans(res.data || []);
    } catch (e) {
      console.error("Fetch AI plans error:", e);
    } finally {
      setAiPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAiPlans();
  }, [viewTab]);

  // Fetch viewedProfileStudent details when userId param is present
  useEffect(() => {
    const fetchProfileDetails = async () => {
      if (!userId) {
        setViewedProfileStudent(null);
        setStudentNotFound(false);
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      setStudentNotFound(false);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/students/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setViewedProfileStudent(res.data);
      } catch (err) {
        console.error("Fetch profile student error:", err);
        setViewedProfileStudent(null);
        setStudentNotFound(true);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfileDetails();
  }, [userId]);

  // Fetch quizzes attempted & results for viewedProfileStudent
  useEffect(() => {
    const targetStudent = viewedProfileStudent || selectedStudent;
    if (targetStudent && (viewedProfileStudent || activeModal === 'profile_drawer')) {
      setQuizzesAttempted("Loading...");
      setHistoryLoading(true);
      axios.get(`${import.meta.env.VITE_API_URL}/api/results/${targetStudent._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
        .then(res => {
          setQuizzesAttempted(res.data.length);
          setAttemptsData(res.data);
          setHistoryLoading(false);
        })
        .catch(err => {
          console.error("Error fetching quizzes attempted:", err);
          setQuizzesAttempted("0");
          setAttemptsData([]);
          setHistoryLoading(false);
        });
    } else {
      setQuizzesAttempted(null);
      setAttemptsData([]);
    }
  }, [selectedStudent, viewedProfileStudent, activeModal]);

  // Synchronize userTickets and userAiTests when viewedProfileStudent changes
  useEffect(() => {
    if (!viewedProfileStudent) {
      setUserTickets([]);
      setUserAiTests([]);
      return;
    }
    setUserAiTests(viewedProfileStudent.aiTests || []);
    if (viewedProfileStudent.tickets) {
      setUserTickets(viewedProfileStudent.tickets);
    } else {
      setTicketsLoading(true);
      const token = localStorage.getItem("token");
      axios.get(`${import.meta.env.VITE_API_URL}/api/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const filtered = (res.data || []).filter(t => (t.userId?._id || t.userId) === viewedProfileStudent._id);
        setUserTickets(filtered);
      })
      .catch(err => console.error("Error fetching tickets:", err))
      .finally(() => setTicketsLoading(false));
    }
  }, [viewedProfileStudent]);

  const handleRestoreStudent = async (studentId) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/students/${studentId}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Student account restored successfully");
      fetchStudents();
    } catch (error) {
      console.error("Restore Student Error:", error);
      showToast("Failed to restore student", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async (studentId) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/students/${studentId}/permanent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Student permanently deleted");
      setPermanentDeleteConfirm(null);
      fetchStudents();
    } catch (error) {
      console.error("Permanent Delete Error:", error);
      showToast(error.response?.data?.message || "Failed to permanently delete student", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (student) => {
    setActionLoading(true);
    const newStatus = (student.status || 'Active') === 'Active' ? 'Suspended' : 'Active';
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/students/${student._id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Student status updated to ${newStatus}`);
      fetchStudents();
      setDrawerStudent(prev => prev && prev._id === student._id ? { ...prev, status: newStatus } : prev);
      if (viewedProfileStudent && viewedProfileStudent._id === student._id) {
        setViewedProfileStudent(prev => ({ ...prev, status: newStatus }));
      }
      setDrawerSubView('menu');
      setActiveModal(null);
    } catch (err) {
      console.error("Update Status Error:", err);
      showToast("Failed to update status", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (student) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/students/${student._id}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Password reset email sent to student");
      setDrawerSubView('menu');
      setActiveModal(null);
    } catch (err) {
      console.error("Reset Password Error:", err);
      showToast("Failed to reset password", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSoftDelete = async (student) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/students/${student._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Student account archived successfully");
      fetchStudents();
      setActionsDrawerOpen(false);
      setActiveModal(null);
      if (userId) {
        navigate("/admin/students");
      }
    } catch (err) {
      console.error("Soft Delete Error:", err);
      showToast("Failed to archive student", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageAiSubscription = async (action) => {
    const targetStudent = drawerStudent || selectedStudent;
    if (!targetStudent) return;
    setAiActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/admin/students/${targetStudent._id}/ai-subscription`,
        { action, planId: selectedPlanId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(action === "cancel" ? "AI plan cancelled" : "AI plan subscription updated");
      fetchStudents();
      const profRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/students/${targetStudent._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDrawerStudent(profRes.data);
      if (viewedProfileStudent && viewedProfileStudent._id === targetStudent._id) {
        setViewedProfileStudent(profRes.data);
      }
      setDrawerSubView('menu');
      setActiveModal(null);
    } catch (e) {
      console.error("Manage AI error:", e);
      showToast("Failed to update AI subscription", "error");
    } finally {
      setAiActionLoading(false);
    }
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/students`,
        addForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Student account created successfully");
      setIsAddModalOpen(false);
      setAddForm({ fullName: "", email: "", phone: "", password: "" });
      fetchStudents();
    } catch (err) {
      console.error("Add Student Error:", err);
      showToast(err.response?.data?.message || "Failed to create student", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // CSV parsing
  const handleCSVFileChange = (file) => {
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== "");
      if (lines.length <= 1) {
        alert("CSV file is empty or only contains headers.");
        return;
      }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
      const emailIdx = headers.findIndex(h => h === "email" || h === "email address");
      const passwordIdx = headers.findIndex(h => h === "password");
      const nameIdx = headers.findIndex(h => h === "name" || h === "fullname" || h === "full name");

      if (emailIdx === -1 || passwordIdx === -1) {
        alert("CSV must contain 'email' and 'password' columns.");
        return;
      }

      const dataRows = [];
      const batchEmails = [];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ''));
        const email = row[emailIdx] || "";
        const password = row[passwordIdx] || "";
        let name = nameIdx !== -1 ? row[nameIdx] : "";
        if (!name && email) {
          name = email.split('@')[0];
        }

        let status = "valid";
        let reason = "";
        if (!email || !emailRegex.test(email)) {
          status = "error";
          reason = "Invalid email";
        } else if (!password) {
          status = "error";
          reason = "Password required";
        } else if (batchEmails.includes(email.toLowerCase())) {
          status = "error";
          reason = "Duplicate in file";
        } else {
          batchEmails.push(email.toLowerCase());
        }

        dataRows.push({ name, email, password, status, reason, rawIndex: i });
      }

      try {
        const token = localStorage.getItem("token");
        const validEmails = dataRows.filter(r => r.status === "valid").map(r => r.email);
        if (validEmails.length > 0) {
          const res = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/admin/students/validate-emails`,
            { emails: validEmails },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const existing = new Set((res.data.existing || []).map(e => e.toLowerCase()));
          dataRows.forEach(row => {
            if (row.status === "valid" && existing.has(row.email.toLowerCase())) {
              row.status = "warning";
              row.reason = "Already registered";
            }
          });
        }
      } catch (err) {
        console.error("CSV email validate error:", err);
      }

      setCsvParsed(dataRows);
      setCsvStep('preview');
    };
    reader.readAsText(file);
  };

  const handleCSVImportSubmit = async () => {
    const importable = csvParsed.filter(r => r.status === "valid");
    if (importable.length === 0) {
      alert("No valid students to import.");
      return;
    }

    setCsvImporting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/admin/students/import-csv`,
        { users: importable },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCsvResult({
        imported: res.data.created ? res.data.created.length : 0,
        skipped: res.data.skipped ? res.data.skipped.length : 0,
        errors: res.data.errors ? res.data.errors.length : 0
      });
      setCsvStep('result');
      fetchStudents();
    } catch (err) {
      console.error("CSV import error:", err);
      showToast(err.response?.data?.message || "Failed to import CSV", "error");
    } finally {
      setCsvImporting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      (s.fullName || "").toLowerCase().includes(term) ||
      (s.email || "").toLowerCase().includes(term) ||
      (s.phone || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-page)" }}>
        <AdminNavbar 
          title={userId ? "User Profile" : "Manage Users"} 
          parentText={userId ? "Manage Users" : "Dashboard"} 
          parentLink={userId ? "/admin/students" : "/admin/dashboard"} 
          onNavigateBack={userId ? () => navigate("/admin/students") : undefined}
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

          {/* Full Screen Student Profile View if userId URL param is present */}
          {userId ? (
            profileLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px', width: '100%' }}>
                <div className="practice-loading-spinner" />
              </div>
            ) : studentNotFound ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', gap: '16px', color: 'var(--text-secondary)', width: '100%', textAlign: 'center' }}>
                <AlertTriangle size={48} style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Student Not Found</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>The student you are looking for does not exist or has been deleted.</p>
                <button 
                  onClick={() => navigate("/admin/students")}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--violet)', color: "#ffffff", border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', marginTop: '8px' }}
                >
                  <ArrowLeft size={16} /> Back to Students
                </button>
              </div>
            ) : viewedProfileStudent ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', color: 'var(--text-primary)' }}>
                {/* Top Navigation Bar with Back & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <button 
                    onClick={() => navigate('/admin/students')} 
                    className="create-quiz-pill-btn" 
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    <ArrowLeft size={16} /> Back to Students
                  </button>

                  <div>
                    <button 
                      onClick={() => openActionsDrawer(viewedProfileStudent, 'menu')}
                      className="create-quiz-pill-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px', cursor: 'pointer' }}
                    >
                      Student Actions <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Profile Header Card */}
                <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '24px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {viewedProfileStudent.avatar || viewedProfileStudent.profilePhoto ? (
                      <img 
                        src={viewedProfileStudent.avatar || viewedProfileStudent.profilePhoto} 
                        alt="Profile" 
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(124, 58, 237, 0.2)' }} 
                      />
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '32px', fontWeight: '700', textTransform: 'uppercase' }}>
                        {viewedProfileStudent.fullName?.[0] || 'S'}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>{viewedProfileStudent.fullName || 'Unknown'}</h2>
                        <span style={{
                          background: viewedProfileStudent.status === 'Suspended' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: viewedProfileStudent.status === 'Suspended' ? '#ef4444' : '#10b981',
                          borderRadius: '100px', padding: '2px 10px', fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: viewedProfileStudent.status === 'Suspended' ? '#ef4444' : '#10b981' }} />
                          {viewedProfileStudent.status || 'Active'}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>Student Account</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Joined on {viewedProfileStudent.createdAt ? new Date(viewedProfileStudent.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                        <Mail size={16} />
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Email Address</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{viewedProfileStudent.email || 'N/A'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                        <Phone size={16} />
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Phone No.</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{viewedProfileStudent.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                        <Clock size={16} />
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Joined On</span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{viewedProfileStudent.createdAt ? new Date(viewedProfileStudent.createdAt).toLocaleDateString('en-GB') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metric Cards Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                      <Activity size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Tests Attempted</span>
                      <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{quizzesAttempted !== 'Loading' && quizzesAttempted !== 'Error' && quizzesAttempted !== null ? quizzesAttempted : '0'}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Attempts</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Enrolled Exams</span>
                      <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{((viewedProfileStudent.purchasedExams?.length || 0) + (viewedProfileStudent.purchasedPractice?.length || 0))}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Modules</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899' }}>
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>AI Tests Made</span>
                      <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{userAiTests.length}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Custom Generated</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => setTicketsModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '18px', cursor: 'pointer', transition: 'border-color 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    title="Click to view raised tickets"
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                      <Ticket size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Support Tickets</span>
                      <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{userTickets.length}</h3>
                      <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '600' }}>{userTickets.filter(t => t.status === 'Open').length} Open Tickets</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                      <BarChart2 size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Average Score</span>
                      <h3 style={{ margin: '4px 0 2px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {attemptsData && attemptsData.length > 0 ? (attemptsData.reduce((acc, curr) => acc + (curr.total > 0 ? (curr.score / curr.total) * 100 : 0), 0) / attemptsData.length).toFixed(1) : '0.0'}%
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Overall Average</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: viewedProfileStudent.isPremium ? 'rgba(16, 185, 129, 0.08)' : 'rgba(100, 116, 139, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: viewedProfileStudent.isPremium ? '#10b981' : 'var(--text-muted)' }}>
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>AI Plan Status</span>
                      <h3 style={{ margin: '4px 0 2px 0', fontSize: '15px', fontWeight: '700', color: viewedProfileStudent.isPremium ? '#10b981' : 'var(--text-muted)' }}>
                        {viewedProfileStudent.isPremium ? 'Premium Active' : 'Free Tier'}
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Subscription</span>
                    </div>
                  </div>
                </div>

                {/* Attempted Subjects & Purchased Exams side-by-side */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  {/* Attempted Subjects */}
                  <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Attempted Subjects</h3>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {attemptsData && attemptsData.length > 0 ? (
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
                            avgScore: (subjectStats[name].scoreSum / subjectStats[name].count).toFixed(1)
                          }));
                          
                          return subjectStatsList.map((stat, idx) => (
                            <div key={idx} style={{ flex: '0 0 180px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(124, 58, 237, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--violet)' }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {((viewedProfileStudent.purchasedExams?.length || 0) > 0 || (viewedProfileStudent.purchasedPractice?.length || 0) > 0) ? (
                        <>
                          {viewedProfileStudent.purchasedExams?.map((ex, idx) => (
                            <div key={`ex-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                  <Medal size={14} />
                                </div>
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{ex.title || ex.name || 'Exam Series'}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Exam Series</span>
                                </div>
                              </div>
                              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '100px', padding: '2px 8px', fontSize: '10px', fontWeight: '700' }}>Active</span>
                            </div>
                          ))}
                          {viewedProfileStudent.purchasedPractice?.map((pr, idx) => (
                            <div key={`pr-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.04)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                  <Medal size={14} />
                                </div>
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{pr.title || pr.name || 'Practice Set'}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Practice Set</span>
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
                    {attemptsData && attemptsData.length > 5 && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Showing last 10 attempts</span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 3fr) minmax(120px, 2fr) minmax(80px, 1fr) minmax(110px, 2fr) minmax(90px, 1fr)', padding: '0 16px 8px 16px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div>Test / Quiz Name</div>
                      <div>Subject</div>
                      <div>Score</div>
                      <div>Date</div>
                      <div style={{ textAlign: 'center' }}>Status</div>
                    </div>

                    {historyLoading ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading attempts...</div>
                    ) : attemptsData && attemptsData.length > 0 ? (
                      attemptsData.slice(0, 10).map((att, idx) => {
                        const pct = att.total > 0 ? (att.score / att.total) * 100 : 0;
                        return (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 3fr) minmax(120px, 2fr) minmax(80px, 1fr) minmax(110px, 2fr) minmax(90px, 1fr)', alignItems: 'center', padding: '12px 16px', borderBottom: idx === Math.min(attemptsData.length, 10) - 1 ? 'none' : '1px solid var(--border-color)', fontSize: '13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '30px', height: '30px', borderRadius: '8px',
                                background: idx % 3 === 0 ? 'rgba(239, 68, 68, 0.1)' : (idx % 3 === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(124, 58, 237, 0.1)'),
                                color: idx % 3 === 0 ? '#ef4444' : (idx % 3 === 1 ? '#10b981' : 'var(--violet)'),
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                              }}>
                                {idx % 3 === 0 ? <Clock size={14} /> : (idx % 3 === 1 ? <Target size={14} /> : <BookOpen size={14} />)}
                              </div>
                              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{att.quizTitle || 'Untitled Test'}</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>{att.subject || 'General'}</div>
                            <div style={{ fontWeight: '700', color: 'var(--violet)' }}>{pct.toFixed(0)}%</div>
                            <div style={{ color: 'var(--text-secondary)' }}>{att.createdAt ? new Date(att.createdAt).toLocaleDateString('en-GB') : 'N/A'}</div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '100px', padding: '3px 10px', fontSize: '11px', fontWeight: '700' }}>Completed</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                        No recent activity.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : null
          ) : (
            <>
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
              {/* Header Row: Title & Count on Left, Tabs & Add Student on Right */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? "18px" : "22px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                    Manage Users
                  </h2>
                  <span style={{ fontSize: "13px", color: "var(--primary, #7c3aed)", fontWeight: "600", marginTop: "4px", display: "inline-block" }}>
                    {filteredStudents.length} {viewTab === "active" ? "Active" : "Archived"} Users
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
                      Active Users
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
                      Archived Users
                    </button>
                  </div>

                  <button 
                    onClick={() => { setIsAddModalOpen(true); setAddMode('manual'); }}
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
                    + Add User
                  </button>
                </div>
              </div>

              {/* Filter Row: Search Input */}
              <div style={{ display: "flex", gap: "12px", width: "100%", flexWrap: "wrap", alignItems: "center" }}>
                <div className="pill-search-container" style={{ margin: 0, flex: "1 1 280px", maxWidth: "360px", display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", height: "38px" }}>
                  <Search size={15} className="pill-search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
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

                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    style={{ background: "transparent", border: "none", color: "var(--violet)", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: "6px 10px" }}
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>

          {/* Student Table */}
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
                  <th>User</th>
                  <th>Email Address</th>
                  <th>Phone</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, r) => (
                      <tr key={`sk-${r}`}>
                        <td><Skeleton width={140} height={16} /></td>
                        <td><Skeleton width={160} height={14} /></td>
                        <td><Skeleton width={100} height={14} /></td>
                        <td><Skeleton width={90} height={14} /></td>
                        <td><Skeleton width={60} height={20} rounded={10} /></td>
                        <td style={{ textAlign: 'center' }}><Skeleton width={32} height={32} rounded={8} style={{ margin: '0 auto' }} /></td>
                      </tr>
                    ))
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => {
                      const isActive = (s.status || 'Active') === 'Active';
                      const dateStr = s.createdAt 
                        ? new Date(s.createdAt).toLocaleDateString('en-GB')
                        : "N/A";

                      return (
                        <tr key={s._id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div 
                              className="user-info-cell" 
                              onClick={() => navigate("/admin/students/" + s._id)} 
                              style={{ cursor: "pointer", display: 'flex', alignItems: 'center', gap: '10px' }}
                              title="Click to view details"
                            >
                              <div className="user-avatar-circle" style={{ overflow: 'hidden' }}>
                                {s.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "S"}
                              </div>
                              <div>
                                <div className="user-name-text" style={{ fontWeight: '600' }}>{s.fullName}</div>
                                {s.isPremium && (
                                  <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Sparkles size={11} /> AI Premium
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="user-email-text" style={{ whiteSpace: "nowrap" }}>{s.email}</td>
                          <td style={{ whiteSpace: "nowrap", fontSize: '13px', color: 'var(--text-secondary)' }}>{s.phone || '—'}</td>

                          <td style={{ whiteSpace: "nowrap", fontSize: '12.5px', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Calendar size={13} style={{ opacity: 0.7 }} /> {dateStr}
                            </div>
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
                                  onClick={() => handleRestoreStudent(s._id)}
                                >
                                  <UserCheck size={13} /> Restore
                                </button>
                                <button 
                                  style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', background: '#ef4444', border: 'none', cursor: 'pointer', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handlePermanentDelete(s._id)}
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
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
            </>
          )}

          {/* Add Student Modal (Manual & CSV) */}
          {isAddModalOpen && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Add New Student
                  </h3>
                  <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button 
                    onClick={() => setAddMode('manual')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none',
                      background: addMode === 'manual' ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' : 'transparent',
                      color: addMode === 'manual' ? '#fff' : 'var(--text-secondary)',
                      boxShadow: addMode === 'manual' ? '0 2px 8px rgba(124, 58, 237, 0.3)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Manual Form
                  </button>
                  <button 
                    onClick={() => setAddMode('csv')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: 'none',
                      background: addMode === 'csv' ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)' : 'transparent',
                      color: addMode === 'csv' ? '#fff' : 'var(--text-secondary)',
                      boxShadow: addMode === 'csv' ? '0 2px 8px rgba(124, 58, 237, 0.3)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    CSV Bulk Import
                  </button>
                </div>

                {addMode === 'manual' ? (
                  <form onSubmit={handleAddStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Phone Number</label>
                      <input 
                        type="tel"
                        value={addForm.phone}
                        onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Initial Password</label>
                      <input 
                        type="password"
                        placeholder="Leave blank for default: StudentPass123!"
                        value={addForm.password}
                        onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
                        style={{ padding: '8px 18px', fontSize: '13px' }}
                      >
                        {actionLoading ? "Creating..." : "Create Student"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    {csvStep === 'upload' && (
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleCSVFileChange(e.dataTransfer.files[0]); }}
                        style={{
                          border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-color)'}`,
                          borderRadius: '12px', padding: '36px', textAlign: 'center', cursor: 'pointer',
                          background: dragOver ? 'rgba(110,63,243,0.05)' : 'transparent'
                        }}
                        onClick={() => csvInputRef.current?.click()}
                      >
                        <Upload size={32} color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Click to upload or drag & drop CSV</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Required headers: email, password, name</p>
                        <input 
                          type="file" ref={csvInputRef} accept=".csv" style={{ display: 'none' }}
                          onChange={(e) => handleCSVFileChange(e.target.files[0])}
                        />
                      </div>
                    )}

                    {csvStep === 'preview' && (
                      <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px' }}>
                          Parsed {csvParsed.length} rows ({csvParsed.filter(r => r.status === 'valid').length} valid).
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button onClick={() => setCsvStep('upload')} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)' }}>Back</button>
                          <button onClick={handleCSVImportSubmit} disabled={csvImporting} className="create-quiz-pill-btn" style={{ padding: '8px 18px', fontSize: '13px' }}>
                            {csvImporting ? "Importing..." : "Confirm & Import"}
                          </button>
                        </div>
                      </div>
                    )}

                    {csvStep === 'result' && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
                        <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Import Finished</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '8px 0 16px 0' }}>
                          Created: {csvResult?.imported}, Skipped: {csvResult?.skipped}, Errors: {csvResult?.errors}
                        </p>
                        <button onClick={() => { setIsAddModalOpen(false); setCsvStep('upload'); }} className="create-quiz-pill-btn" style={{ padding: '8px 20px', fontSize: '13px' }}>Done</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Support Tickets Modal */}
          {ticketsModalOpen && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '620px', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                      <Ticket size={16} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Support Tickets: {viewedProfileStudent?.fullName}
                    </h3>
                  </div>
                  <button onClick={() => setTicketsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                  {ticketsLoading ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading tickets...</div>
                  ) : userTickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                      <Ticket size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '13px' }}>No support tickets raised by this student.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {userTickets.map((t) => (
                        <div key={t._id} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', background: 'var(--bg-page)', padding: '2px 8px', borderRadius: '4px' }}>
                              {t.category || "General"}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontWeight: '700',
                              background: t.status === 'Resolved' ? 'rgba(34, 197, 94, 0.15)' : t.status === 'Open' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                              color: t.status === 'Resolved' ? '#22c55e' : t.status === 'Open' ? '#3b82f6' : '#6b7280'
                            }}>
                              {t.status}
                            </span>
                          </div>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{t.subject}</h4>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.message}</p>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Raised on: {t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color)', marginTop: '16px' }}>
                  <button 
                    onClick={() => { setTicketsModalOpen(false); navigate('/admin/tickets'); }}
                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#3b82f6', padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    Open in Helpdesk <ExternalLink size={13} />
                  </button>
                  <button 
                    onClick={() => setTicketsModalOpen(false)}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px 18px', borderRadius: '8px', fontSize: '12.5px', cursor: 'pointer' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= MANAGE ACTIONS LEFT SIDEBAR / DRAWER ================= */}
          {actionsDrawerOpen && drawerStudent && (
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
                      {drawerSubView === 'menu' && "Student Actions"}
                      {drawerSubView === 'ai_plan' && "Manage AI Plan"}
                      {drawerSubView === 'tickets' && `Support Tickets (${drawerTickets.length})`}
                      {drawerSubView === 'suspend' && ((drawerStudent.status || 'Active') === 'Active' ? "Suspend Student" : "Activate Student")}
                      {drawerSubView === 'reset' && "Reset Password"}
                      {drawerSubView === 'archive' && "Archive Student"}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setActionsDrawerOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Target Student Mini-Profile Card */}
                <div style={{ padding: '16px 20px 0 20px' }}>
                  <div className="actions-drawer-user-card">
                    {drawerStudent.avatar || drawerStudent.profilePhoto ? (
                      <img 
                        src={drawerStudent.avatar || drawerStudent.profilePhoto} 
                        alt={drawerStudent.fullName} 
                        style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
                      />
                    ) : (
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '700', fontSize: '18px', flexShrink: 0 }}>
                        {drawerStudent.fullName?.charAt(0)?.toUpperCase() || 'S'}
                      </div>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {drawerStudent.fullName}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '700', 
                          padding: '2px 8px', 
                          borderRadius: '100px', 
                          background: (drawerStudent.status || 'Active') === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: (drawerStudent.status || 'Active') === 'Active' ? '#10b981' : '#ef4444' 
                        }}>
                          {drawerStudent.status || 'Active'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {drawerStudent.email || 'No email provided'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                        <span style={{ 
                          fontSize: '10.5px', 
                          fontWeight: '700', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          background: drawerStudent.isPremium ? 'rgba(124, 58, 237, 0.12)' : 'rgba(107, 114, 128, 0.12)',
                          color: drawerStudent.isPremium ? 'var(--primary)' : 'var(--text-muted)'
                        }}>
                          <Sparkles size={11} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                          {drawerStudent.isPremium ? (typeof drawerStudent.activePlan === 'object' ? drawerStudent.activePlan.name : 'Premium Active') : 'Free Tier'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drawer Body */}
                <div className="actions-drawer-body">
                  {drawerSubView === 'menu' && (
                    <div className="actions-menu-list">
                      {/* View Profile */}
                      <div 
                        className="actions-menu-item"
                        onClick={() => { setActionsDrawerOpen(false); navigate("/admin/students/" + drawerStudent._id); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                            <User size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>View Full Profile</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Attempt history, score analytics & purchased tests</div>
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>

                      {/* Manage AI Plan */}
                      <div 
                        className="actions-menu-item"
                        onClick={() => { setSelectedStudent(drawerStudent); setSelectedPlanId(""); fetchAiPlans(); setDrawerSubView('ai_plan'); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                            <Sparkles size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Manage AI Plan</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Grant tier, upgrade plan, or cancel access</div>
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>

                      {/* Support Tickets */}
                      <div 
                        className="actions-menu-item"
                        onClick={() => setDrawerSubView('tickets')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Ticket size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Support Tickets</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{drawerTickets.length} total tickets raised</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            {drawerTickets.length}
                          </span>
                          <ChevronRight size={16} color="var(--text-muted)" />
                        </div>
                      </div>

                      {/* Suspend / Activate Student */}
                      <div 
                        className="actions-menu-item"
                        onClick={() => setDrawerSubView('suspend')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: (drawerStudent.status || 'Active') === 'Active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (drawerStudent.status || 'Active') === 'Active' ? '#ef4444' : '#10b981' }}>
                            {(drawerStudent.status || 'Active') === 'Active' ? <UserMinus size={18} /> : <UserCheck size={18} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {(drawerStudent.status || 'Active') === 'Active' ? 'Suspend Student' : 'Activate Student'}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {(drawerStudent.status || 'Active') === 'Active' ? 'Temporarily lock account login' : 'Restore full account access'}
                            </div>
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

                      {/* Archive Student */}
                      <div 
                        className="actions-menu-item danger"
                        onClick={() => setDrawerSubView('archive')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <Trash2 size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>Archive Student</div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Move account to recycle bin</div>
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    </div>
                  )}

                  {/* SUBVIEW: AI PLAN */}
                  {drawerSubView === 'ai_plan' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Current Status:</span>
                          <strong style={{ 
                            padding: '2px 10px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            background: drawerStudent.isPremium ? 'rgba(16, 185, 129, 0.12)' : 'rgba(107, 114, 128, 0.12)',
                            color: drawerStudent.isPremium ? '#10b981' : 'var(--text-muted)'
                          }}>
                            {drawerStudent.isPremium ? 'Premium Active' : 'Free Tier'}
                          </strong>
                        </div>
                        {drawerStudent.activePlan && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Active Plan:</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {typeof drawerStudent.activePlan === 'object' ? drawerStudent.activePlan.name : 'Subscribed'}
                            </span>
                          </div>
                        )}
                        {drawerStudent.premiumExpiresAt && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Expires:</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {new Date(drawerStudent.premiumExpiresAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                          Assign or Upgrade Plan
                        </label>
                        {aiPlansLoading ? (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', padding: '10px' }}>Loading plans...</div>
                        ) : (
                          <select 
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            style={{ width: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-input, #1B1B32)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                          >
                            <option value="">-- Choose AI Plan --</option>
                            {aiPlans.map(p => (
                              <option key={p._id} value={p._id}>
                                {p.name} — {p.sellingPrice ? `₹${p.sellingPrice}` : 'Free'} ({p.durationValue} {p.durationUnit})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        <button 
                          onClick={() => handleManageAiSubscription('upgrade')} 
                          disabled={!selectedPlanId || aiActionLoading}
                          className="create-quiz-pill-btn" 
                          style={{ padding: '11px', width: '100%', fontSize: '13px', opacity: (!selectedPlanId || aiActionLoading) ? 0.6 : 1 }}
                        >
                          {aiActionLoading ? "Updating..." : "Grant / Upgrade Plan"}
                        </button>
                        {drawerStudent.isPremium && (
                          <button 
                            onClick={() => handleManageAiSubscription('cancel')} 
                            disabled={aiActionLoading}
                            style={{ padding: '11px', borderRadius: '10px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
                          >
                            {aiActionLoading ? "Processing..." : "Cancel Current Subscription"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUBVIEW: TICKETS */}
                  {drawerSubView === 'tickets' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {drawerTicketsLoading ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading tickets...</div>
                      ) : drawerTickets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                          <Ticket size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
                          <p style={{ margin: 0, fontSize: '13px' }}>No support tickets raised by this student.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {drawerTickets.map((t) => (
                            <div key={t._id} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{t.subject || 'No Subject'}</span>
                                <span style={{ 
                                  fontSize: '11px', 
                                  fontWeight: '700', 
                                  padding: '2px 8px', 
                                  borderRadius: '100px',
                                  background: t.status === 'Resolved' ? 'rgba(16, 185, 129, 0.12)' : t.status === 'In Progress' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                                  color: t.status === 'Resolved' ? '#10b981' : t.status === 'In Progress' ? '#f59e0b' : '#3b82f6'
                                }}>
                                  {t.status || 'Open'}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {t.message || t.description || 'No description provided.'}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <span>Priority: <strong style={{ color: t.priority === 'High' ? '#ef4444' : 'var(--text-primary)' }}>{t.priority || 'Medium'}</strong></span>
                                <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-GB') : ''}</span>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => { setActionsDrawerOpen(false); navigate('/admin/tickets'); }}
                            style={{ marginTop: '8px', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#3b82f6', borderRadius: '8px', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <ExternalLink size={14} /> View in Support Tickets Hub
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUBVIEW: SUSPEND CONFIRMATION */}
                  {drawerSubView === 'suspend' && (
                    <div style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: (drawerStudent.status || 'Active') === 'Active' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: (drawerStudent.status || 'Active') === 'Active' ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        {(drawerStudent.status || 'Active') === 'Active' ? <UserMinus size={24} /> : <UserCheck size={24} />}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {(drawerStudent.status || 'Active') === 'Active' ? 'Suspend Student Account?' : 'Activate Student Account?'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {(drawerStudent.status || 'Active') === 'Active' 
                            ? `Suspending ${drawerStudent.fullName} will temporarily block them from logging in and taking assessments.`
                            : `Activating ${drawerStudent.fullName} will immediately restore their account access and test privileges.`}
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
                          onClick={() => handleToggleStatus(drawerStudent)}
                          disabled={actionLoading}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: (drawerStudent.status || 'Active') === 'Active' ? '#ef4444' : '#10b981', color: '#ffffff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                          {actionLoading ? "Processing..." : ((drawerStudent.status || 'Active') === 'Active' ? "Confirm Suspend" : "Confirm Activate")}
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
                          Send Password Reset Link?
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          A secure password reset email will be dispatched to <strong>{drawerStudent.email}</strong> allowing the student to set a new password.
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
                          onClick={() => handleResetPassword(drawerStudent)}
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
                          Archive Student Account?
                        </h4>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          This will archive <strong>{drawerStudent.fullName}</strong> and move them to the recycle bin. Their test records will be preserved and can be restored anytime.
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
                          onClick={() => handleSoftDelete(drawerStudent)}
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
          {activeModal === 'ai_plan' && selectedStudent && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.35)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Sparkles size={16} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      AI Plan: {selectedStudent.fullName}
                    </h3>
                  </div>
                  <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <X size={18} />
                  </button>
                </div>
                
                <div style={{ marginBottom: '16px', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Current Status:</span>
                    <strong style={{ 
                      padding: '2px 10px',
                      borderRadius: '100px',
                      fontSize: '12px',
                      background: selectedStudent.isPremium ? 'rgba(16, 185, 129, 0.12)' : 'rgba(107, 114, 128, 0.12)',
                      color: selectedStudent.isPremium ? '#10b981' : 'var(--text-muted)'
                    }}>
                      {selectedStudent.isPremium ? 'Premium Active' : 'Free Tier'}
                    </strong>
                  </div>
                  {selectedStudent.activePlan && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Active Plan:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {typeof selectedStudent.activePlan === 'object' ? selectedStudent.activePlan.name : 'Subscribed'}
                      </span>
                    </div>
                  )}
                  {selectedStudent.premiumExpiresAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Expires:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {new Date(selectedStudent.premiumExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                    Select Plan to Grant
                  </label>
                  {aiPlansLoading ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '10px 0' }}>Loading available AI plans...</div>
                  ) : aiPlans.length === 0 ? (
                    <div style={{ padding: '12px', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      No AI plans found in the system. Please create a plan under <strong style={{ color: 'var(--primary)' }}>AI Plans</strong> first.
                    </div>
                  ) : (
                    <select 
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)', 
                        background: 'var(--bg-input, #1B1B32)', 
                        color: 'var(--text-primary)', 
                        fontSize: '13px', 
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select an AI Plan to assign...</option>
                      {aiPlans.map(p => (
                        <option key={p._id} value={p._id}>
                          {p.name} — {p.sellingPrice ? `₹${p.sellingPrice}` : 'Free'} ({p.durationValue} {p.durationUnit})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                  {selectedStudent.isPremium ? (
                    <button 
                      onClick={() => handleManageAiSubscription('cancel')} 
                      disabled={aiActionLoading}
                      style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      {aiActionLoading ? "Cancelling..." : "Cancel Plan"}
                    </button>
                  ) : <div />}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setActiveModal(null)} 
                      style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12.5px' }}
                    >
                      Close
                    </button>
                    <button 
                      onClick={() => handleManageAiSubscription('upgrade')} 
                      disabled={!selectedPlanId || aiActionLoading}
                      className="create-quiz-pill-btn" 
                      style={{ padding: '8px 18px', fontSize: '12.5px', opacity: (!selectedPlanId || aiActionLoading) ? 0.6 : 1 }}
                    >
                      {aiActionLoading ? "Updating..." : "Grant Plan"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Students;
