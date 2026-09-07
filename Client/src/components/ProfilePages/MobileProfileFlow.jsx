import React, { useState } from "react";
import { ChevronLeft, ChevronRight, User, Clock, Lock, Bell, Globe, Info, Edit3, Camera, Mail, Phone, Calendar, MapPin, Check } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import AvatarPickerModal from "../AvatarPickerModal";

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
  isDesktop
}) {
  const [activeScreen, setActiveScreen] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);

  // Sub-screens
  const [notifications, setNotifications] = useState({ push: true, email: true });
  const [language, setLanguage] = useState("en");

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
    if (isDesktop && title === "Profile") return null;

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
        <div style={{ height: '120px', flexShrink: 0, width: '100%' }} />
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="mp-screen">
      {renderHeader("Transaction History")}
      <div className="mp-content mp-centered">
        <div className="mp-empty-state">
          <Clock size={48} className="mp-empty-icon" />
          <h3>No transactions yet</h3>
          <p>Your transaction history will appear here.</p>
        </div>
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
            <label>Current Password</label>
            <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} required placeholder="Enter current password" />
          </div>
          <div className="mp-form-group">
            <label>New Password</label>
            <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} required placeholder="Enter new password" />
          </div>
          <div className="mp-form-group">
            <label>Confirm New Password</label>
            <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} required placeholder="Confirm new password" />
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
      <div className="mp-content">
        <div className="mp-settings-list">
          <div className="mp-setting-item">
            <div className="mp-setting-info">
              <h4>Push Notifications</h4>
              <p>Receive alerts on your device</p>
            </div>
            <label className="mp-toggle">
              <input type="checkbox" checked={notifications.push} onChange={() => setNotifications(prev => ({...prev, push: !prev.push}))} />
              <span className="mp-toggle-slider"></span>
            </label>
          </div>
          <div className="mp-setting-item">
            <div className="mp-setting-info">
              <h4>Email Notifications</h4>
              <p>Receive updates via email</p>
            </div>
            <label className="mp-toggle">
              <input type="checkbox" checked={notifications.email} onChange={() => setNotifications(prev => ({...prev, email: !prev.email}))} />
              <span className="mp-toggle-slider"></span>
            </label>
          </div>
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
      <div className="mp-content mp-centered mp-about-content">
        <div className="mp-logo-placeholder">
          TP
        </div>
        <h3>Teaching Pariksha</h3>
        <p>Your ultimate platform for exam preparation and success. We provide comprehensive tools and mock tests to help you achieve your goals.</p>
        <div className="mp-version">Version 1.0.0</div>
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
