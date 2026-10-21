import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import AvatarPickerModal from '../../components/AvatarPickerModal';
import MobileProfileFlow from '../../components/ProfilePages/MobileProfileFlow';
import '../../css/admin/AdminLayout.css';
import '../../css/StudentProfile.css';

function AdminProfile() {
  const navigate = useNavigate();

  // Read stored user immediately for instant render without blank state
  const getInitialUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  };

  const initialStored = getInitialUser();
  const [user, setUser] = useState(initialStored);

  const computeInitials = (u) => {
    const name = u?.fullName || u?.name || 'Admin';
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || 'AD';
  };

  const computeAdminId = (u) => {
    const dateStr = new Date(u?.createdAt || Date.now()).getFullYear();
    const rawId = u?._id || u?.id || '0001';
    const shortId = String(rawId).slice(-4).toUpperCase();
    return `AD${dateStr}${shortId}`;
  };

  const [initials, setInitials] = useState(() => computeInitials(initialStored));
  const [adminId, setAdminId] = useState(() => computeAdminId(initialStored));
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [formData, setFormData] = useState({
    fullName: initialStored.fullName || initialStored.name || '',
    phone: initialStored.phone || '',
    dateOfBirth: initialStored.dateOfBirth ? new Date(initialStored.dateOfBirth).toISOString().split('T')[0] : '',
    gender: initialStored.gender || '',
    location: initialStored.location || '',
    bio: initialStored.bio || ''
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  
  // For MobileProfileFlow internal routing
  const [activeScreen, setActiveScreen] = useState('overview');

  // Change Password States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      await axios.put(
        `${baseUrl}/api/auth/change-password`,
        { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordSuccess('Password updated successfully');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setActiveScreen('overview'); // go back to overview
      }, 1500);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');

        const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
        const res = await axios.get(`${baseUrl}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const u = res.data?.user || res.data;
        if (u) {
          const merged = { ...getInitialUser(), ...u };
          setUser(merged);
          setInitials(computeInitials(merged));
          setAdminId(computeAdminId(merged));
          localStorage.setItem('user', JSON.stringify(merged));

          setFormData({
            fullName: merged.fullName || merged.name || '',
            phone: merged.phone || '',
            dateOfBirth: merged.dateOfBirth ? new Date(merged.dateOfBirth).toISOString().split('T')[0] : '',
            gender: merged.gender || '',
            location: merged.location || '',
            bio: merged.bio || ''
          });
        }
      } catch (err) {
        console.error('Error fetching admin profile', err);
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectAvatar = async (avatarUrl) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      await axios.put(
        `${baseUrl}/api/auth/profile`,
        { avatar: avatarUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedUser = { ...user, avatar: avatarUrl, profilePicture: avatarUrl };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('user-updated'));
      setShowAvatarPicker(false);
    } catch (err) {
      console.error('Error updating avatar:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
      const res = await axios.put(
        `${baseUrl}/api/auth/profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data?.user || res.data;
      const merged = { ...user, ...updated };
      setUser(merged);
      setInitials(computeInitials(merged));
      localStorage.setItem('user', JSON.stringify(merged));
      window.dispatchEvent(new Event('user-updated'));
      setActiveScreen('overview'); // Go back to overview after saving
    } catch (err) {
      console.error('Error saving profile', err);
      alert(err.response?.data?.message || err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Determine navbar title dynamically
  let navTitle = "Admin Profile";
  if (activeScreen === "account") navTitle = "Admin Profile > Account Details";
  else if (activeScreen === "password") navTitle = "Admin Profile > Change Password";
  else if (activeScreen === "language") navTitle = "Admin Profile > Language";
  else if (activeScreen === "about") navTitle = "Admin Profile > About Us";

  return (
    <div className="admin-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, backgroundColor: 'var(--bg-main)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AdminNavbar 
          title={navTitle} 
          onNavigateBack={activeScreen !== "overview" ? () => setActiveScreen("overview") : undefined} 
        />
        
        <div style={{
          flex: 1,
          width: '100%',
          position: 'relative',
          padding: isMobile ? '16px 12px' : '28px 32px 40px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '100%',
            maxWidth: (activeScreen === 'overview' || activeScreen === 'about') ? '100%' : '600px',
            margin: '0',
          }}>
            <MobileProfileFlow 
              user={user}
              adminId={adminId}
              isAdmin={true}
              initials={initials}
              previewMode={false}
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
    </div>
  );
}

export default AdminProfile;