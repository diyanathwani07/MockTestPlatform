import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { User, Mail, Phone, Calendar, MapPin, Edit3, Key } from "lucide-react";
import { usePreview } from "../context/PreviewContext";
import StudentSidebar from "../components/StudentSidebar";
import StudentNavbar from "../components/StudentNavbar";
import "../css/StudentDashboard.css"; // Reuse layout styles
import "../css/StudentProfile.css"; // Specific profile styles
import AvatarPickerModal from "../components/AvatarPickerModal";

import MobileProfileFlow from "../components/ProfilePages/MobileProfileFlow";

function StudentProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const { previewMode } = usePreview();
  const [initials, setInitials] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Change Password States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    setChangingPassword(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPasswordSuccess("Password updated successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setActiveScreen("overview");
        setPasswordSuccess("");
      }, 1500);
    } catch (error) {
      setPasswordError(error.response?.data?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSelectAvatar = async (avatarUrlOrBase64) => {
    if (previewMode) return;
    try {
      const token = localStorage.getItem("token");
      const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
      const res = await axios.put(`${baseUrl}/api/auth/profile`, {
        avatar: avatarUrlOrBase64
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      setUser(res.data);
      setShowAvatarPicker(false);
    } catch (error) {
      console.error("Error saving avatar", error);
      alert(error.response?.data?.message || error.message || "Failed to update avatar.");
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    location: "",
    bio: ""
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(storedUser);
    setFormData({
      fullName: storedUser.fullName || storedUser.name || "",
      phone: storedUser.phone || "",
      dateOfBirth: storedUser.dateOfBirth || "",
      gender: storedUser.gender || "",
      location: storedUser.location || (storedUser.district && storedUser.state ? `${storedUser.district}, ${storedUser.state}` : ""),
      bio: storedUser.bio || ""
    });

    const name = storedUser.fullName || storedUser.name || "Student";
    const init = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    setInitials(init);

    // Generate a Student ID based on MongoDB _id or a fallback
    if (storedUser._id) {
      setStudentId("TP" + storedUser._id.toString().slice(-8).toUpperCase());
    } else {
      setStudentId("TP20260014");
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (previewMode) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
      const res = await axios.put(`${baseUrl}/api/auth/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local storage and state
      localStorage.setItem("user", JSON.stringify(res.data));
      setUser(res.data);
      setIsEditing(false); // Flip back on success
    } catch (error) {
      console.error("Error saving profile", error);
      alert(error.response?.data?.message || error.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const [activeScreen, setActiveScreen] = useState("overview");

  // Determine top navbar title for desktop
  let navTitle = "Profile";
  if (activeScreen === "account") navTitle = "Profile > Account Details";
  else if (activeScreen === "transactions") navTitle = "Profile > Subscriptions & Order History";
  else if (activeScreen === "password") navTitle = "Profile > Change Password";
  else if (activeScreen === "notifications") navTitle = "Profile > Notifications";
  else if (activeScreen === "language") navTitle = "Profile > Language";
  else if (activeScreen === "about") navTitle = "Profile > About Us";

  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content mp-wrapper" style={{ 
        background: 'var(--bg-page, #0f0e17)',
        display: 'flex',
        flexDirection: 'column',
        padding: 0
      }}>
        {!isMobile && (
          <StudentNavbar 
            title={navTitle} 
            onNavigateBack={activeScreen !== "overview" ? () => setActiveScreen("overview") : undefined} 
          />
        )}
        
        <div style={{
          flex: 1,
          maxWidth: isMobile ? '100%' : (activeScreen === 'about' ? '100%' : activeScreen === 'transactions' ? '720px' : '540px'),
          margin: '0',
          width: '100%',
          position: 'relative',
          paddingTop: isMobile ? '0' : '20px',
          paddingLeft: isMobile ? '0' : '20px',
          paddingRight: isMobile ? '0' : '20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <MobileProfileFlow 
            user={user}
            studentId={studentId}
            initials={initials}
            previewMode={previewMode}
            showAvatarPicker={showAvatarPicker}
            setShowAvatarPicker={setShowAvatarPicker}
            handleSelectAvatar={handleSelectAvatar}
            formData={formData}
            setFormData={setFormData}
            handleChange={handleChange}
            handleSave={handleSave}
            isSaving={isSaving}
            passwordData={passwordData}
            setPasswordData={setPasswordData}
            handlePasswordSubmit={handlePasswordSubmit}
            passwordError={passwordError}
            passwordSuccess={passwordSuccess}
            changingPassword={changingPassword}
            setShowPasswordModal={setShowPasswordModal}
            isDesktop={!isMobile}
            activeScreen={activeScreen}
            setActiveScreen={setActiveScreen}
          />
        </div>
      </div>
    </div>
  );
}

export default StudentProfile;
