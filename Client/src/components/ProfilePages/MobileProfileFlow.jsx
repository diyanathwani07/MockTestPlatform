import "../../css/StudentProfile.css";
import { setupWebPushNotifications } from '../../utils/pushNotifications';
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, ChevronRight, User, Clock, Lock, Bell, BellRing, Globe, Info, Edit3, Camera, Mail, Phone, Calendar, MapPin, Check, Loader2, CreditCard, CheckCircle2, Video, ExternalLink, Sparkles, Eye, EyeOff, RefreshCw, Shield, FileText, Copy, CheckCheck, AlertTriangle, AlertCircle, Zap, ShieldCheck, XCircle } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import AvatarPickerModal from "../AvatarPickerModal";
import Logo from "../Logo";
import SimpleFooter from "../SimpleFooter";

export default function MobileProfileFlow({
  user,
  studentId,
  adminId,
  isAdmin,

  initials,
  previewMode,
  showAvatarPicker,
  setShowAvatarPicker,
  handleSelectAvatar,
  formData,
  setFormData,
  handleChange,
  handleSave,
  isSaving,
  passwordData,
  setPasswordData,
  handlePasswordSubmit,
  passwordError,
  passwordSuccess,
  changingPassword,
  activeScreen: controlledActiveScreen,
  setActiveScreen: controlledSetActiveScreen,
  isDesktop
}) {
  const [internalActiveScreen, setInternalActiveScreen] = useState("overview");
  const activeScreen = controlledActiveScreen !== undefined ? controlledActiveScreen : internalActiveScreen;
  const setActiveScreen = controlledSetActiveScreen || setInternalActiveScreen;

  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Sub-screens
  const [notifications, setNotifications] = useState({ push: true, email: true });

  // Initialize notifications from Auth context if available
  useEffect(() => {
    if (user && user.notificationPreferences) {
      setNotifications(user.notificationPreferences);
    }
  }, [user]);

  const updateNotificationPreference = async (key, value) => {
    const newPrefs = { ...notifications, [key]: value };
    
    if (key === 'push' && value === true) {
      // User turned on push, let's request permissions if on Web
      setupWebPushNotifications();
    }
    setNotifications(newPrefs);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`,
        { notificationPreferences: newPrefs },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (typeof updateUserContext === "function") {
        updateUserContext({ notificationPreferences: newPrefs });
      }
    } catch (error) {
      console.error("Failed to update notification preferences", error);
    }
  };
  const [language, setLanguage] = useState("en");

  // Real Transaction History state & fetch
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [copiedOrderRef, setCopiedOrderRef] = useState(null);

  const handleCopyOrderRef = (refText) => {
    if (!refText || refText === "N/A") return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(refText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = refText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedOrderRef(refText);
      setTimeout(() => {
        setCopiedOrderRef((curr) => (curr === refText ? null : curr));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy order ref:", err);
    }
  };

  useEffect(() => {
    if (activeScreen === "transactions" && !isAdmin) {
      const fetchTransactions = async () => {
        setLoadingTransactions(true);
        try {
          const token = localStorage.getItem("token");
          if (!token) return;
          const headers = { Authorization: `Bearer ${token}` };
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
          
          const [subRes, examsRes, practiceRes] = await Promise.all([
            axios.get(`${apiUrl}/api/subscription/my`, { headers }).catch(() => ({ data: [] })),
            axios.get(`${apiUrl}/api/purchase/my-exams`, { headers }).catch(() => ({ data: [] })),
            axios.get(`${apiUrl}/api/purchase/my-practice`, { headers }).catch(() => ({ data: [] }))
          ]);
          
          let allTxns = Array.isArray(subRes.data) ? subRes.data : [];
          
          const exams = Array.isArray(examsRes.data) ? examsRes.data : [];
          const practice = Array.isArray(practiceRes.data) ? practiceRes.data : [];

          const examTxns = exams.map(exam => ({
            _id: `exam-${exam._id}`,
            purchaseId: `EXAM-${exam._id.substring(0, 8).toUpperCase()}`,
            status: "active",
            amount: exam.price || 0,
            paymentGateway: "One-Time",
            planNameSnapshot: `Exam: ${exam.title || 'Custom Exam'}`,
            createdAt: exam.createdAt || new Date(),
            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
            aiTestsUsed: 0,
            maxAITests: "N/A"
          }));

          const practiceTxns = practice.map(p => ({
            _id: `prac-${p._id}`,
            purchaseId: `PRAC-${p._id.substring(0, 8).toUpperCase()}`,
            status: "active",
            amount: p.practicePrice || p.price || 0,
            paymentGateway: "One-Time",
            planNameSnapshot: `Practice: ${p.title || 'Module'}`,
            createdAt: p.createdAt || new Date(),
            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
            aiTestsUsed: 0,
            maxAITests: "N/A"
          }));

          allTxns = [...allTxns, ...examTxns, ...practiceTxns];
          allTxns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          setTransactions(allTxns);
        } catch (err) {
          console.error("Failed to fetch transactions in profile flow:", err);
        } finally {
          setLoadingTransactions(false);
        }
      };
      fetchTransactions();
    }
  }, [activeScreen]);

  // Safely hide the global hamburger menu on sub-pages so it doesn't overlap the Back button
  React.useEffect(() => {
    const toggleBtn = document.querySelector('.mobile-sidebar-toggle');
    if (!toggleBtn) return;
    
    if (activeScreen !== "overview") {
      toggleBtn.style.setProperty('display', 'none', 'important');
    } else {
      toggleBtn.style.setProperty('display', 'flex', 'important');
    }

    // Cleanup when component unmounts
    return () => {
      toggleBtn.style.setProperty('display', 'flex', 'important');
    };
  }, [activeScreen]);

  const goBack = () => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      setActiveScreen("overview");
    }
  };

  const renderHeader = (title) => {
    if (isDesktop || isAdmin) return null;

    return (
      <div className="mp-header" style={{ paddingLeft: title === "Profile" ? "60px" : "20px" }}>
        {title !== "Profile" && (
          <button 
            className="mp-back-btn" 
            onClick={goBack} 
            style={{ 
              position: 'relative', 
              zIndex: 9999,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary, #ffffff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: '4px'
            }}
            aria-label="Go back"
          >
            <ChevronLeft size={24} style={{ color: 'var(--text-primary, #ffffff)', stroke: 'currentColor' }} />
          </button>
        )}
        <h2 className="mp-header-title" style={{ flex: 1, textAlign: title === "Profile" ? "left" : "center", marginLeft: title === "Profile" ? "0" : "-24px" }}>
          {title}
        </h2>
        <div className="mp-header-right">
          {title === "Profile" && <ThemeToggle />}
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="mp-screen mp-overview">
      {renderHeader("Profile")}
      <div className="mp-content mp-scrollable">
        <div className="mp-profile-summary">
          <div className="mp-avatar-wrapper">
            <div className="mp-avatar">
              {(user.avatar || user.profilePicture) ? (
                <img src={user.avatar || user.profilePicture} alt="Profile" />
              ) : (
                <span>{initials || (user.role === "superadmin" ? "SA" : isAdmin ? "AD" : "ST")}</span>
              )}
            </div>
            {!previewMode && (
              <button className="mp-avatar-edit-btn" onClick={() => setShowAvatarPicker(true)}>
                <Camera size={14} />
              </button>
            )}
          </div>
          <h2 className="mp-name">{user.fullName || user.name || (user.role === "superadmin" ? "Super Admin" : isAdmin ? "Admin User" : "Student Name")}</h2>
          <p className="mp-student-id">
            {isAdmin ? (
              user.role === "superadmin" 
                ? (adminId ? `Super Admin ID: ${adminId}` : "Super Admin ID: SA-2026-0001")
                : (adminId ? `Admin ID: ${adminId}` : "Admin ID: AD-2026-0001")
            ) : (
              studentId ? `Student ID: ${studentId}` : ""
            )}
          </p>
          {isAdmin ? (
            <span className={`mp-badge-role ${user.role === 'superadmin' ? 'superadmin' : 'admin'}`}>
              {user.role === 'superadmin' ? 'Super Admin' : 'Admin'}
            </span>
          ) : (
            <span className="mp-badge-role student">Student</span>
          )}
        </div>

        
          {isDesktop ? (
            <div className="mp-menu-group">
              <MenuItem 
                icon={<User size={18} />} 
                title="Account Details" 
                subtitle="View and manage your account information" 
                onClick={() => setActiveScreen("account")} 
              />
              {!isAdmin && (
                <MenuItem 
                  icon={<Clock size={18} />} 
                  title="Subscriptions & Order History" 
                  subtitle="View your active plan, payments & order receipts" 
                  onClick={() => setActiveScreen("transactions")} 
                />
              )}
              <MenuItem 
                icon={<Lock size={18} />} 
                title="Change Password" 
                subtitle="Update your account password" 
                onClick={() => setActiveScreen("password")} 
              />
              <MenuItem 
                icon={<Globe size={18} />} 
                title="Language" 
                subtitle="Choose your preferred language" 
                onClick={() => setActiveScreen("language")} 
              />
              <MenuItem 
                icon={<Info size={18} />} 
                title="About Us" 
                subtitle="Learn more about PrepMark" 
                onClick={() => setActiveScreen("about")} 
              />
            </div>
          ) : (
            <>
              <h4 className="mp-menu-group-title">Account</h4>
              <div className="mp-menu-group">
                <MenuItem 
                  icon={<User size={18} />} 
                  title="Account Details" 
                  subtitle="View and manage your account information" 
                  onClick={() => setActiveScreen("account")} 
                />
                {!isAdmin && (
                  <MenuItem 
                    icon={<Clock size={18} />} 
                    title="Subscriptions & Order History" 
                    subtitle="View your active plan, payments & order receipts" 
                    onClick={() => setActiveScreen("transactions")} 
                  />
                )}
                <MenuItem 
                  icon={<Lock size={18} />} 
                  title="Change Password" 
                  subtitle="Update your account password" 
                  onClick={() => setActiveScreen("password")} 
                />
              </div>

              <h4 className="mp-menu-group-title">Preferences</h4>
              <div className="mp-menu-group">
                <MenuItem 
                  icon={<Globe size={18} />} 
                  title="Language" 
                  subtitle="Choose your preferred language" 
                  onClick={() => setActiveScreen("language")} 
                />
              </div>

              <h4 className="mp-menu-group-title">Information</h4>
              <div className="mp-menu-group">
                <MenuItem 
                  icon={<Info size={18} />} 
                  title="About Us" 
                  subtitle="Learn more about PrepMark" 
                  onClick={() => setActiveScreen("about")} 
                />
              </div>
            </>
          )}

                    <div style={{ marginTop: "32px", paddingBottom: "24px", width: "100%" }}>
            {isDesktop ? (
              <div className="desktop-legal-card">
                <div className="dl-header">
                  <div className="dl-header-left">
                    <div className="dl-icon-wrapper">
                      <Shield size={24} />
                    </div>
                    <div className="dl-header-text">
                      <h4>Legal & Privacy</h4>
                      <p>View our policies and terms of service</p>
                    </div>
                  </div>
                  <span className="dl-badge"><Shield size={14} /> Your privacy matters</span>
                </div>
                <div className="dl-grid">
                  <Link to="/terms" className="dl-item" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <FileText size={20} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ fontWeight: '600' }}>Terms & Conditions</span>
                    </div>
                  </Link>
                  <Link to="/privacy" className="dl-item" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <Shield size={20} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ fontWeight: '600' }}>Privacy Policy</span>
                    </div>
                  </Link>
                  <Link to="/refunds" className="dl-item" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <RefreshCw size={20} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ fontWeight: '600' }}>Refunds & Cancellation Policy</span>
                    </div>
                  </Link>
                </div>
              </div>
            ) : (
              <SimpleFooter />
            )}
          </div>
      </div>
      
      {showAvatarPicker && (
        <AvatarPickerModal 
          onClose={() => setShowAvatarPicker(false)}
          onSelect={handleSelectAvatar}
          currentAvatar={user.avatar}
        />
      )}
      
      {/* Hide the global hamburger menu when on sub-pages so it doesn't overlap the Back button */}
      {activeScreen !== "overview" && (
        <style>
          {`.mobile-sidebar-toggle { display: none !important; }`}
        </style>
      )}
    </div>
  );

  const renderAccountDetails = () => (
    <div className="mp-screen">
      {renderHeader("Account Details")}
      <div className="mp-content mp-scrollable">
        <div className={`sp-flip-container ${isEditing ? "flipped" : ""}`}>
          <div className="sp-flip-inner">
            
            {/* FRONT FACE: View Profile */}
            <div className="sp-flip-front">
              <div className="mp-info-card">
                <h3 className="mp-info-title">Personal Information</h3>
                <InfoRow icon={<User size={16}/>} label="Full Name" value={user.fullName || user.name} />
                <InfoRow icon={<Mail size={16}/>} label="Email" value={user.email} />
                <InfoRow icon={<Phone size={16}/>} label="Phone" value={user.phone} />
                <InfoRow icon={<Calendar size={16}/>} label="Date of Birth" value={user.dateOfBirth} />
                <InfoRow icon={<User size={16}/>} label="Gender" value={user.gender} />
                <InfoRow icon={<MapPin size={16}/>} label="Location" value={user.location || (user.district ? `${user.district}, ${user.state}` : null)} />
                
                <h3 className="mp-info-title" style={{ marginTop: '24px' }}>Bio</h3>
                <p className="mp-bio-text" style={{ marginBottom: '24px' }}>{user.bio || "No bio provided yet."}</p>

                {!previewMode && (
                  <button className="mp-btn-primary" onClick={() => setIsEditing(true)}>
                    <Edit3 size={16} /> Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* BACK FACE: Edit Profile */}
            <div className="sp-flip-back">
              <form className="mp-form" onSubmit={(e) => {
                handleSave(e).then(() => setIsEditing(false));
              }}>
                <div className="mp-form-group">
                  <label>Full Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required />
                </div>
                <div className="mp-form-group">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                <div className="mp-form-group">
                  <label>Date of Birth</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
                </div>
                <div className="mp-form-group">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div className="mp-form-group">
                  <label>Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="City, State" />
                </div>
                <div className="mp-form-group">
                  <label>Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." rows="4"></textarea>
                </div>
                <div className="mp-form-actions">
                  <button type="button" className="mp-btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="mp-btn-save" disabled={isSaving || previewMode}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );

  // Dynamic date-only expiry calculation
  const getSubscriptionExpiryInfo = (expiryDateStr, status, isOneTime = false) => {
    if (isOneTime) {
      return {
        countdownText: "Lifetime Access",
        daysDiff: 99999,
        badgeVariant: "lifetime",
        formattedExpiry: "Lifetime Access",
        isExpired: false
      };
    }

    if (!expiryDateStr) {
      return {
        countdownText: "Active",
        daysDiff: null,
        badgeVariant: "active",
        formattedExpiry: "N/A",
        isExpired: false
      };
    }

    const expiryDate = new Date(expiryDateStr);
    if (isNaN(expiryDate.getTime())) {
      return {
        countdownText: "Active",
        daysDiff: null,
        badgeVariant: "active",
        formattedExpiry: "N/A",
        isExpired: false
      };
    }

    // Date-only calculation without time-of-day / timezone shift
    const now = new Date();
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expOnly = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());

    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.round((expOnly.getTime() - todayOnly.getTime()) / msPerDay);

    const formattedExpiry = expiryDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    if (diffDays > 365 * 2) {
      return {
        countdownText: "Lifetime Access",
        daysDiff: diffDays,
        badgeVariant: "lifetime",
        formattedExpiry: "Lifetime Access",
        isExpired: false
      };
    }

    if (status === "cancelled") {
      return {
        countdownText: "Cancelled",
        daysDiff: diffDays,
        badgeVariant: "cancelled",
        formattedExpiry,
        isExpired: true
      };
    }

    if (status === "refunded") {
      return {
        countdownText: "Refunded",
        daysDiff: diffDays,
        badgeVariant: "cancelled",
        formattedExpiry,
        isExpired: true
      };
    }

    if (diffDays > 1) {
      return {
        countdownText: `${diffDays} days left`,
        daysDiff: diffDays,
        badgeVariant: diffDays <= 3 ? "urgent" : diffDays <= 7 ? "warning" : "active",
        formattedExpiry,
        isExpired: false
      };
    } else if (diffDays === 1) {
      return {
        countdownText: "1 day left",
        daysDiff: 1,
        badgeVariant: "urgent",
        formattedExpiry,
        isExpired: false
      };
    } else if (diffDays === 0) {
      return {
        countdownText: "Expires today",
        daysDiff: 0,
        badgeVariant: "urgent",
        formattedExpiry,
        isExpired: false
      };
    } else {
      const expiredAgo = Math.abs(diffDays);
      const text = expiredAgo === 1 ? "Expired 1 day ago" : `Expired ${expiredAgo} days ago`;
      return {
        countdownText: text,
        daysDiff: diffDays,
        badgeVariant: "expired",
        formattedExpiry,
        isExpired: true
      };
    }
  };

  const renderTransactions = () => {
    const now = new Date();
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Prioritize active subscription from history (excluding one-time purchases)
    const activeSub = transactions.find((sub) => {
      if (sub.paymentGateway === "One-Time" || sub._id?.startsWith("exam-") || sub._id?.startsWith("prac-")) {
        return false;
      }
      if (sub.status !== "active") return false;
      if (!sub.expiryDate) return true;
      const expDate = new Date(sub.expiryDate);
      const expOnly = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      return expOnly >= todayOnly;
    }) || (user?.isPremium ? {
      _id: "active-user-entitlement",
      planNameSnapshot: user.activePlanName || "AI Mock Test Plan",
      purchaseId: user.subscriptionId || "MEMBERSHIP-ACTIVE",
      amount: user.planPrice || 499,
      maxAITests: user.maxAITests || 20,
      aiTestsUsed: user.aiTestsUsed || 0,
      startDate: user.subscriptionStartDate || new Date(),
      expiryDate: user.subscriptionExpiresAt || user.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "active",
      paymentGateway: "PhonePe"
    } : null);

    const activeExpiryInfo = activeSub ? getSubscriptionExpiryInfo(activeSub.expiryDate, activeSub.status, false) : null;
    const activeStartDateStr = activeSub?.startDate || activeSub?.createdAt;
    const formattedActiveStartDate = activeStartDateStr ? new Date(activeStartDateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }) : null;

    return (
      <div className="mp-screen">
        {renderHeader("Subscriptions & Order History")}
        <div className="mp-content mp-scrollable" style={{ padding: "16px 16px 85px 16px" }}>
          {loadingTransactions ? (
            <div className="mp-centered" style={{ gap: "12px", minHeight: "300px" }}>
              <Loader2 size={36} style={{ animation: "spin 1s linear infinite", color: "var(--violet)" }} />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>Loading your transactions & plan history...</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Active Plan Card Header if present */}
              {activeSub ? (
                <div
                  style={{
                    background: "linear-gradient(145deg, rgba(110, 63, 243, 0.16) 0%, rgba(16, 185, 129, 0.08) 100%)",
                    border: "1.5px solid rgba(110, 63, 243, 0.45)",
                    borderRadius: "18px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    boxShadow: "0 8px 24px rgba(110, 63, 243, 0.15)",
                    backdropFilter: "blur(10px)"
                  }}
                >
                  {/* Top Badge & Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(110, 63, 243, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--violet, #6E3FF3)"
                      }}>
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
                          Active Membership
                        </div>
                        <div style={{ fontWeight: "800", fontSize: "18px", color: "var(--text-primary)", lineHeight: 1.2 }}>
                          {activeSub.planNameSnapshot || activeSub.planId?.name || "AI Mock Test Plan"}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      background: "rgba(16, 185, 129, 0.18)",
                      color: "#10B981",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "4px 12px",
                      borderRadius: "100px",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
                      Active
                    </span>
                  </div>

                  {/* Prominent Days Remaining Countdown Hero Banner */}
                  {activeExpiryInfo && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: activeExpiryInfo.badgeVariant === "urgent"
                        ? "linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(239, 68, 68, 0.08))"
                        : activeExpiryInfo.badgeVariant === "warning"
                        ? "linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(245, 158, 11, 0.08))"
                        : "linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.08))",
                      border: `1px solid ${
                        activeExpiryInfo.badgeVariant === "urgent"
                          ? "rgba(239, 68, 68, 0.45)"
                          : activeExpiryInfo.badgeVariant === "warning"
                          ? "rgba(245, 158, 11, 0.45)"
                          : "rgba(16, 185, 129, 0.45)"
                      }`
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Clock size={18} color={
                          activeExpiryInfo.badgeVariant === "urgent"
                            ? "#EF4444"
                            : activeExpiryInfo.badgeVariant === "warning"
                            ? "#F59E0B"
                            : "#10B981"
                        } />
                        <span style={{
                          fontSize: "15px",
                          fontWeight: "800",
                          letterSpacing: "0.8px",
                          color: activeExpiryInfo.badgeVariant === "urgent"
                            ? "#EF4444"
                            : activeExpiryInfo.badgeVariant === "warning"
                            ? "#F59E0B"
                            : "#10B981"
                        }}>
                          {activeExpiryInfo.countdownText.toUpperCase()}
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)" }}>
                        {activeExpiryInfo.isExpired ? "Expired" : "Auto-renews: No"}
                      </span>
                    </div>
                  )}

                  {/* 2-Column Info Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    background: "rgba(0, 0, 0, 0.22)",
                    padding: "14px",
                    borderRadius: "14px",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.06))"
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
                        Valid Until
                      </div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)", marginTop: "3px" }}>
                        {activeExpiryInfo?.formattedExpiry || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
                        Amount Paid
                      </div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)", marginTop: "3px" }}>
                        ₹{activeSub.amount ?? 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
                        AI Tests Remaining
                      </div>
                      <div style={{ fontWeight: "700", fontSize: "14px", color: "#10B981", marginTop: "3px" }}>
                        {Math.max(0, (activeSub.maxAITests || 20) - (activeSub.aiTestsUsed || 0))} / {activeSub.maxAITests || 20}
                      </div>
                    </div>
                    {formattedActiveStartDate ? (
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
                          Purchased On
                        </div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)", marginTop: "3px" }}>
                          {formattedActiveStartDate}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>
                          Gateway
                        </div>
                        <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)", marginTop: "3px" }}>
                          {activeSub.paymentGateway || "PhonePe"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}>
                    <Link
                      to="/pricing"
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "var(--primary, #6E3FF3)",
                        color: "var(--primary-foreground, #ffffff)",
                        fontSize: "13px",
                        fontWeight: "700",
                        textDecoration: "none",
                        boxShadow: "0 2px 10px rgba(110, 63, 243, 0.35)",
                        textAlign: "center"
                      }}
                    >
                      <Sparkles size={15} />
                      Upgrade / Renew
                    </Link>
                    <Link
                      to="/custom-exam"
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        fontWeight: "600",
                        textDecoration: "none",
                        textAlign: "center"
                      }}
                    >
                      <Zap size={15} color="#10B981" />
                      Create AI Test
                    </Link>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--bg-card, #16112a)",
                    border: "1px dashed var(--violet)",
                    borderRadius: "16px",
                    padding: "20px",
                    display: "flex",
                    justify: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px"
                  }}
                >
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "var(--text-primary)", fontWeight: "700" }}>
                      No Active Membership
                    </h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                      Subscribe to access premium mock tests & AI evaluation features.
                    </p>
                  </div>
                  <Link
                    to="/pricing"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "9px 18px",
                      borderRadius: "8px",
                      background: "var(--violet)",
                      color: "var(--primary-foreground)",
                      fontSize: "13px",
                      fontWeight: "700",
                      textDecoration: "none"
                    }}
                  >
                    <Sparkles size={15} />
                    Explore Plans
                  </Link>
                </div>
              )}

              {/* Transactions Header */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                    Payment & Order History
                  </h3>
                  {activeSub && (
                    <Link 
                      to="/pricing" 
                      style={{ 
                        fontSize: "13px", 
                        fontWeight: "600", 
                        color: "var(--violet)", 
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      Browse All Plans &rarr;
                    </Link>
                  )}
                </div>

                {transactions.length === 0 ? (
                  <div className="mp-centered" style={{ minHeight: "200px" }}>
                    <div className="mp-empty-state">
                      <Clock size={44} className="mp-empty-icon" />
                      <h4 style={{ margin: "8px 0 4px 0" }}>No transactions yet</h4>
                      <p>Your subscription & payment history will appear here once you purchase a plan.</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {transactions.map((sub) => {
                      const isOneTime = sub.paymentGateway === "One-Time" || sub._id?.startsWith("exam-") || sub._id?.startsWith("prac-");
                      const expiryInfo = getSubscriptionExpiryInfo(sub.expiryDate, sub.status, isOneTime);
                      const isCurrentActive = sub.status === "active" && !expiryInfo.isExpired;
                      
                      const formattedDate = new Date(sub.startDate || sub.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      });

                      const orderRef = sub.purchaseId || sub._id || "N/A";
                      const isCopied = copiedOrderRef === orderRef;

                      // Status badge styling
                      let statusBg = "rgba(100, 116, 139, 0.15)";
                      let statusColor = "#94A3B8";
                      let statusBorder = "rgba(100, 116, 139, 0.3)";
                      let statusLabel = (sub.status || "COMPLETED").toUpperCase();

                      if (isCurrentActive) {
                        statusBg = "rgba(16, 185, 129, 0.16)";
                        statusColor = "#10B981";
                        statusBorder = "rgba(16, 185, 129, 0.35)";
                        statusLabel = "ACTIVE";
                      } else if (sub.status === "cancelled" || sub.status === "refunded") {
                        statusBg = "rgba(100, 116, 139, 0.16)";
                        statusColor = "#94A3B8";
                        statusBorder = "rgba(100, 116, 139, 0.3)";
                        statusLabel = sub.status.toUpperCase();
                      } else if (sub.status === "pending") {
                        statusBg = "rgba(245, 158, 11, 0.16)";
                        statusColor = "#F59E0B";
                        statusBorder = "rgba(245, 158, 11, 0.35)";
                        statusLabel = "PENDING";
                      } else if (expiryInfo.isExpired) {
                        statusBg = "rgba(239, 68, 68, 0.14)";
                        statusColor = "#EF4444";
                        statusBorder = "rgba(239, 68, 68, 0.3)";
                        statusLabel = "EXPIRED";
                      } else if (isOneTime) {
                        statusBg = "rgba(14, 165, 233, 0.16)";
                        statusColor = "#0EA5E9";
                        statusBorder = "rgba(14, 165, 233, 0.35)";
                        statusLabel = "COMPLETED";
                      }

                      return (
                        <div 
                          key={sub._id || sub.purchaseId}
                          style={{
                            background: "var(--bg-card, #16112a)",
                            border: isCurrentActive ? "1.5px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                            borderRadius: "14px",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            boxShadow: "0 2px 10px rgba(0,0,0,0.12)"
                          }}
                        >
                          {/* Header: Plan Name & Status Badge */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                            <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--text-primary)", lineHeight: 1.3 }}>
                              {sub.planNameSnapshot || sub.planId?.name || "AI Mock Test Plan"}
                            </div>
                            <span style={{
                              background: statusBg,
                              color: statusColor,
                              border: `1px solid ${statusBorder}`,
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "3px 10px",
                              borderRadius: "100px",
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                              letterSpacing: "0.3px",
                              flexShrink: 0
                            }}>
                              {statusLabel}
                            </span>
                          </div>

                          {/* Payment Row: Prominent Amount + Order Ref with 1-click Copy */}
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            background: "rgba(0, 0, 0, 0.18)"
                          }}>
                            <div>
                              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" }}>
                                AMOUNT PAID
                              </div>
                              <div style={{ fontSize: "19px", fontWeight: "800", color: "var(--violet, #6E3FF3)", lineHeight: 1.2 }}>
                                ₹{sub.amount ?? 0}
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px", marginBottom: "2px" }}>
                                ORDER REF
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyOrderRef(orderRef)}
                                title="Click to copy Order ID"
                                style={{
                                  background: isCopied ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                  border: `1px solid ${isCopied ? "rgba(16, 185, 129, 0.4)" : "var(--border-color, rgba(255, 255, 255, 0.1))"}`,
                                  borderRadius: "6px",
                                  padding: "3px 8px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontSize: "11px",
                                  fontFamily: "monospace",
                                  color: isCopied ? "#10B981" : "var(--text-secondary)",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <span>{orderRef.length > 20 ? `${orderRef.substring(0, 16)}...` : orderRef}</span>
                                {isCopied ? <CheckCheck size={12} color="#10B981" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>

                          {/* Subscription Information 2-Column Grid */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px",
                            fontSize: "12px"
                          }}>
                            <div>
                              <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Gateway:</span>
                              <div style={{ fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                                {sub.paymentGateway || "PhonePe"}
                              </div>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Purchased:</span>
                              <div style={{ fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                                {formattedDate}
                              </div>
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>Valid Until:</span>
                              <div style={{ fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                                {isOneTime ? "Lifetime Access" : expiryInfo.formattedExpiry}
                              </div>
                              {!isOneTime && (
                                <div style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  marginTop: "3px",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: expiryInfo.badgeVariant === "urgent"
                                    ? "#EF4444"
                                    : expiryInfo.badgeVariant === "warning"
                                    ? "#F59E0B"
                                    : expiryInfo.isExpired
                                    ? "#94A3B8"
                                    : "#10B981"
                                }}>
                                  <span style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: "currentColor"
                                  }} />
                                  {expiryInfo.countdownText}
                                </div>
                              )}
                            </div>
                            <div>
                              <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase" }}>AI Tests Quota:</span>
                              <div style={{ fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                                {isOneTime ? (sub._id?.startsWith("prac-") ? "Practice Module" : "Full Exam Set") : `${sub.aiTestsUsed || 0} / ${sub.maxAITests || 20} used`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChangePassword = () => (
    <div className="mp-screen">
      {renderHeader("Change Password")}
      <div className="mp-content" style={{ padding: "24px 16px", boxSizing: "border-box" }}>
        <form className="mp-form" onSubmit={(e) => {
          handlePasswordSubmit(e);
        }}>
          {passwordError && <div className="mp-alert mp-alert-error">{passwordError}</div>}
          {passwordSuccess && <div className="mp-alert mp-alert-success">{passwordSuccess}</div>}
          
          <div className="mp-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0", fontSize: "14px" }}>
                Current Password
              </label>
              <Link 
                to="/forgot-password" 
                style={{ 
                  display: "flex", alignItems: "center", gap: "2px",
                  fontSize: "13px", 
                  fontWeight: "600", 
                  color: "#f97316", 
                  textDecoration: "none" 
                }}
              >
                Forgot Password?
                <ChevronRight size={14} />
              </Link>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock size={18} color="#64748b" style={{ position: "absolute", left: "14px" }} />
              <input 
                type={showCurrentPassword ? "text" : "password"} 
                value={passwordData?.currentPassword || ""} 
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} 
                required 
                placeholder="Enter current password" 
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 40px 12px 42px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(148, 163, 184, 0.2)", color: "#f8fafc", outline: "none", fontSize: "14px" }}
              />
              <div 
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                style={{ position: "absolute", right: "14px", cursor: "pointer", color: "#64748b", display: "flex" }}
              >
                {showCurrentPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
            </div>
          </div>

          <div className="mp-form-group" style={{ marginTop: "20px" }}>
            <label style={{ margin: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0", fontSize: "14px" }}>
              New Password
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock size={18} color="#64748b" style={{ position: "absolute", left: "14px" }} />
              <input 
                type={showNewPassword ? "text" : "password"} 
                value={passwordData?.newPassword || ""} 
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} 
                required 
                placeholder="Enter new password" 
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 40px 12px 42px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(148, 163, 184, 0.2)", color: "#f8fafc", outline: "none", fontSize: "14px" }}
              />
              <div 
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{ position: "absolute", right: "14px", cursor: "pointer", color: "#64748b", display: "flex" }}
              >
                {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
            </div>
          </div>

          <div className="mp-form-group" style={{ marginTop: "20px" }}>
            <label style={{ margin: 0, marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px", color: "#e2e8f0", fontSize: "14px" }}>
              Confirm New Password
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Lock size={18} color="#64748b" style={{ position: "absolute", left: "14px" }} />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={passwordData?.confirmPassword || ""} 
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                required 
                placeholder="Confirm new password" 
                style={{ width: "100%", boxSizing: "border-box", padding: "12px 40px 12px 42px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(148, 163, 184, 0.2)", color: "#f8fafc", outline: "none", fontSize: "14px" }}
              />
              <div 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: "absolute", right: "14px", cursor: "pointer", color: "#64748b", display: "flex" }}
              >
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="mp-btn-primary" 
            style={{ 
              marginTop: '24px', 
              width: "100%", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              gap: "8px", 
              background: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)", 
              color: "#fff", 
              padding: "14px", 
              borderRadius: "12px", 
              border: "none", 
              fontWeight: "600",
              fontSize: "15px",
              boxShadow: "0 4px 14px rgba(249, 115, 22, 0.3)"
            }} 
            disabled={changingPassword || previewMode}
          >
            <RefreshCw size={18} style={{ animation: changingPassword ? "spin 1s linear infinite" : "none" }} />
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="mp-screen">
      {renderHeader("Notifications")}

      <div className="mp-content mp-scrollable" style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Push Notifications Card */}
        <div style={{
          background: "var(--bg-card, #16112a)",
          border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
          borderRadius: "18px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(110, 63, 243, 0.25), rgba(147, 51, 234, 0.25))",
              color: "var(--violet, #A78BFA)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Bell size={20} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 2px 0", fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                Push Notifications
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                Receive alerts on your device
              </p>
            </div>
          </div>
          <label className="mp-toggle" style={{ margin: 0 }}>
            <input 
              type="checkbox" 
              checked={notifications.push} 
              onChange={() => setNotifications(prev => ({...prev, push: !prev.push}))} 
            />
            <span className="mp-toggle-slider"></span>
          </label>
        </div>

        {/* Email Notifications Card */}
        <div style={{
          background: "var(--bg-card, #16112a)",
          border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
          borderRadius: "18px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(110, 63, 243, 0.25))",
              color: "#60A5FA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Mail size={20} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 2px 0", fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                Email Notifications
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                Receive updates via email
              </p>
            </div>
          </div>
          <label className="mp-toggle" style={{ margin: 0 }}>
            <input 
              type="checkbox" 
              checked={notifications.email} 
              onChange={() => setNotifications(prev => ({...prev, email: !prev.email}))} 
            />
            <span className="mp-toggle-slider"></span>
          </label>
        </div>

        {/* Hero Illustration / Confirmation Section */}
        <div style={{
          marginTop: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "32px 20px"
        }}>
          {/* Animated Blob Bell Stack */}
          <div style={{ position: "relative", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "40% 60% 70% 30% / 40% 50% 60% 50%",
              background: "radial-gradient(circle, rgba(110, 63, 243, 0.25) 0%, rgba(168, 85, 247, 0.1) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              filter: "drop-shadow(0 8px 24px rgba(110, 63, 243, 0.3))"
            }}>
              <Bell size={48} color="var(--violet, #A78BFA)" />
            </div>
            <div style={{
              position: "absolute",
              bottom: "4px",
              right: "4px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#10B981",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
              border: "2px solid var(--bg-page, #0A0A0A)"
            }}>
              <CheckCircle2 size={16} />
            </div>
          </div>

          <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 8px 0" }}>
            You’re All Set!
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, maxWidth: "260px", lineHeight: 1.5 }}>
            You’ll receive notifications based on your preferences.
          </p>
        </div>

      </div>
    </div>
  );

  const renderLanguage = () => {
    const languages = [
      { code: "en", name: "English" },
      { code: "hi", name: "Hindi (हिन्दी)" },
      { code: "mr", name: "Marathi (मराठी)" },
    ];
    return (
      <div className="mp-screen">
        {renderHeader("Language")}
        <div className="mp-content">
          <div className="mp-language-list">
            {languages.map(lang => (
              <div 
                key={lang.code} 
                className={`mp-language-item ${language === lang.code ? 'selected' : ''}`}
                onClick={() => setLanguage(lang.code)}
              >
                <span>{lang.name}</span>
                {language === lang.code && <Check size={18} className="mp-check-icon" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderAbout = () => (
    <div className="mp-screen">
      {renderHeader("About Us")}
      <div className="mp-content mp-centered mp-about-content" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "left", padding: "30px 20px", maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px", transform: "scale(1.25)", display: "flex", justifyContent: "center", width: "100%" }}>
          <Logo size="large" />
        </div>
        
        <div style={{
          background: "var(--bg-card, rgba(255, 255, 255, 0.03))",
          border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
          borderRadius: "20px",
          padding: "28px",
          width: "100%",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
        }}>
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary, #ffffff)", margin: "0 0 16px 0", letterSpacing: "0.5px" }}>
            ABOUT US
          </h2>

          <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--text-primary, #ffffff)", margin: "0 0 12px 0", fontWeight: "500" }}>
            PrepMark helps you prepare for all competitive exams. We are dedicated to providing the best mock tests for real progress.
          </p>

          <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--text-secondary, #cbd5e1)", margin: "0 0 20px 0" }}>
            Our goal is to provide high-quality educational content and mock tests that will help you to ace your examinations.
          </p>

          <div style={{ margin: "0 0 18px 0" }}>
            <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--violet, #8b5cf6)", margin: "0 0 10px 0" }}>
              PrepMark YouTube channel में आपको मिलेगा:
            </h4>
            <a 
              href="https://www.youtube.com/@teachingpariksha" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 18px",
                borderRadius: "24px",
                background: "#FF0000",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: "700",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(255, 0, 0, 0.4)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(255, 0, 0, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(255, 0, 0, 0.4)";
              }}
            >
              <Video size={18} /> Visit @teachingpariksha on YouTube <ExternalLink size={14} />
            </a>
          </div>

          <ol style={{ paddingLeft: "20px", margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px", lineHeight: "1.6", color: "var(--text-secondary, #e2e8f0)" }}>
            <li>
              <strong>Quality Live Classes</strong> for CTET, UPTET, REET, DSSSB, KVS, BPSC Bihar Teacher और अन्य Teaching Exams की लाइव Classes.
            </li>
            <li>
              PrepMark Members की <strong>Expert Guidance</strong> से आपको मिलेगी, आपकी Preparation में मदद!
            </li>
            <li>
              हर Teaching Exam Analysis और Expected Cut-off !
            </li>
            <li>
              Latest Notification & Teachers' Vacancy With Detailed Full Information.
            </li>
            <li>
              Exam Preparation Tips and Strategies to Crack Any Teaching Exam in the First Attempt.
            </li>
          </ol>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className="mp-version" style={{ display: "inline-block", padding: "6px 18px", borderRadius: "20px", background: "var(--bg-input, rgba(255,255,255,0.05))", border: "1px solid var(--border-color, rgba(255,255,255,0.1))", fontSize: "12px", color: "var(--text-muted, #94a3b8)", fontWeight: "600" }}>
              Version 1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <AvatarPickerModal 
        isOpen={showAvatarPicker} 
        onClose={() => setShowAvatarPicker(false)} 
        onSelect={handleSelectAvatar} 
      />
      {(() => {
        switch (activeScreen) {
          case "account": return renderAccountDetails();
          case "transactions": return renderTransactions();
          case "password": return renderChangePassword();
          case "notifications": return renderNotifications();
          case "language": return renderLanguage();
          case "about": return renderAbout();
          default: return renderOverview();
        }
      })()}
    </>
  );
}

function MenuItem({ icon, title, subtitle, onClick }) {
  return (
    <div className="mp-menu-item" onClick={onClick}>
      <div className="mp-menu-icon">{icon}</div>
      <div className="mp-menu-text">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </div>
      <ChevronRight size={18} className="mp-menu-arrow" />
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="mp-info-row">
      <div className="mp-info-label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mp-info-value">{value || "Not Provided"}</div>
    </div>
  );
}
