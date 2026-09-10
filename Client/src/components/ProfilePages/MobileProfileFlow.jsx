import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, ChevronRight, User, Clock, Lock, Bell, BellRing, Globe, Info, Edit3, Camera, Mail, Phone, Calendar, MapPin, Check, Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import AvatarPickerModal from "../AvatarPickerModal";
import Logo from "../Logo";

export default function MobileProfileFlow({
  user,
  studentId,
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

  // Sub-screens
  const [notifications, setNotifications] = useState({ push: true, email: true });
  const [language, setLanguage] = useState("en");

  // Real Transaction History state & fetch
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    if (activeScreen === "transactions") {
      const fetchTransactions = async () => {
        setLoadingTransactions(true);
        try {
          const token = localStorage.getItem("token");
          if (!token) return;
          const headers = { Authorization: `Bearer ${token}` };
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
          const res = await axios.get(`${apiUrl}/api/subscription/my`, { headers });
          setTransactions(Array.isArray(res.data) ? res.data : []);
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
    if (isDesktop) return null;

    return (
      <div className="mp-header" style={{ paddingLeft: title === "Profile" ? "60px" : "20px" }}>
        {title !== "Profile" && (
          <button className="mp-back-btn" onClick={goBack} style={{ position: 'relative', zIndex: 9999 }}>
            <ChevronLeft size={24} />
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
              {user.avatar ? (
                <img src={user.avatar} alt="Profile" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {!previewMode && (
              <button className="mp-avatar-edit-btn" onClick={() => setShowAvatarPicker(true)}>
                <Camera size={14} />
              </button>
            )}
          </div>
          <h2 className="mp-name">{user.fullName || user.name || "Student Name"}</h2>
          <p className="mp-student-id">Student ID: {studentId}</p>
          <span className="mp-badge-student">Student</span>
        </div>

        <h4 className="mp-menu-group-title">Account</h4>
        <div className="mp-menu-group">
          <MenuItem 
            icon={<User size={18} />} 
            title="Account Details" 
            subtitle="View and manage your account information" 
            onClick={() => setActiveScreen("account")} 
          />
          <MenuItem 
            icon={<Clock size={18} />} 
            title="Transaction History" 
            subtitle="View your past transactions" 
            onClick={() => setActiveScreen("transactions")} 
          />
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
            icon={<Bell size={18} />} 
            title="Notifications" 
            subtitle="Manage your notification preferences" 
            onClick={() => setActiveScreen("notifications")} 
          />
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
            subtitle="Learn more about Teaching Pariksha" 
            onClick={() => setActiveScreen("about")} 
          />
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

  const renderTransactions = () => (
    <div className="mp-screen">
      {renderHeader("Transaction History")}
      <div className="mp-content mp-scrollable" style={{ padding: "16px" }}>
        {loadingTransactions ? (
          <div className="mp-centered" style={{ gap: "12px", minHeight: "300px" }}>
            <Loader2 size={36} style={{ animation: "spin 1s linear infinite", color: "var(--violet, #6E3FF3)" }} />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>Loading your transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="mp-centered" style={{ minHeight: "300px" }}>
            <div className="mp-empty-state">
              <Clock size={48} className="mp-empty-icon" />
              <h3>No transactions yet</h3>
              <p>Your transaction history will appear here once you purchase a plan.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {transactions.map((sub) => {
              const isCurrentActive = sub.status === "active" && new Date(sub.expiryDate) > new Date();
              const formattedDate = new Date(sub.startDate || sub.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });
              const formattedExpiry = new Date(sub.expiryDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });

              return (
                <div 
                  key={sub._id || sub.purchaseId}
                  style={{
                    background: "var(--bg-card, #16112a)",
                    border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
                  }}
                >
                  {/* Top Row: Plan Name + Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--text-primary)" }}>
                      {sub.planNameSnapshot || sub.planId?.name || "AI Mock Test Plan"}
                    </div>
                    <span style={{
                      background: isCurrentActive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.12)",
                      color: isCurrentActive ? "#10B981" : "#EF4444",
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "3px 10px",
                      borderRadius: "100px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      {isCurrentActive ? "Active" : sub.status || "Expired"}
                    </span>
                  </div>

                  {/* Order Ref & Amount */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>ORDER REF</div>
                      <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-muted)", marginTop: "2px" }}>
                        {sub.purchaseId || "N/A"}
                      </div>
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--violet, #6E3FF3)" }}>
                      ₹{sub.amount}
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--border-color, rgba(255,255,255,0.06))", margin: "2px 0" }} />

                  {/* Details Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Gateway:</span>
                      <div style={{ fontWeight: "600", color: "var(--text-primary)", marginTop: "2px", textTransform: "uppercase" }}>
                        {sub.paymentGateway || "PhonePe"}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Purchased:</span>
                      <div style={{ fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                        {formattedDate}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Valid Until:</span>
                      <div style={{ fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                        {formattedExpiry}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>AI Tests:</span>
                      <div style={{ fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                        {sub.aiTestsUsed || 0} / {sub.maxAITests || 0} Used
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
  );

  const renderChangePassword = () => (
    <div className="mp-screen">
      {renderHeader("Change Password")}
      <div className="mp-content">
        <form className="mp-form" onSubmit={(e) => {
          handlePasswordSubmit(e);
        }}>
          {passwordError && <div className="mp-alert mp-alert-error">{passwordError}</div>}
          {passwordSuccess && <div className="mp-alert mp-alert-success">{passwordSuccess}</div>}
          
          <div className="mp-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ margin: 0 }}>Current Password</label>
              <Link 
                to="/forgot-password" 
                style={{ 
                  fontSize: "12px", 
                  fontWeight: "600", 
                  color: "var(--violet, #6E3FF3)", 
                  textDecoration: "none" 
                }}
                onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                onMouseLeave={(e) => e.target.style.textDecoration = "none"}
              >
                Forgot Password?
              </Link>
            </div>
            <input type="password" value={passwordData?.currentPassword || ""} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} required placeholder="Enter current password" />
          </div>
          <div className="mp-form-group">
            <label>New Password</label>
            <input type="password" value={passwordData?.newPassword || ""} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} required placeholder="Enter new password" />
          </div>
          <div className="mp-form-group">
            <label>Confirm New Password</label>
            <input type="password" value={passwordData?.confirmPassword || ""} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} required placeholder="Confirm new password" />
          </div>
          
          <button type="submit" className="mp-btn-primary" style={{marginTop: '16px'}} disabled={changingPassword || previewMode}>
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
            Teaching Pariksha helps you to prepare for all teaching exams. यहाँ आपका शिक्षक बनने का सपना होता है साकार!
          </p>

          <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--text-secondary, #cbd5e1)", margin: "0 0 20px 0" }}>
            Our goal is to provide high-quality educational content that will help you to ace your Teaching Examinations.
          </p>

          <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--violet, #8b5cf6)", margin: "0 0 12px 0" }}>
            Teaching Pariksha YouTube channel में आपको मिलेगा:
          </h4>

          <ol style={{ paddingLeft: "20px", margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px", lineHeight: "1.6", color: "var(--text-secondary, #e2e8f0)" }}>
            <li>
              <strong>Quality Live Classes</strong> for CTET, UPTET, REET, DSSSB, KVS, BPSC Bihar Teacher और अन्य Teaching Exams की लाइव Classes.
            </li>
            <li>
              Teaching Pariksha Members की <strong>Expert Guidance</strong> से आपको मिलेगी, आपकी Preparation में मदद!
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

  switch (activeScreen) {
    case "account": return renderAccountDetails();
    case "transactions": return renderTransactions();
    case "password": return renderChangePassword();
    case "notifications": return renderNotifications();
    case "language": return renderLanguage();
    case "about": return renderAbout();
    default: return renderOverview();
  }
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
