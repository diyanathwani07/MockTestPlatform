import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import AvatarPickerModal from '../../components/AvatarPickerModal';
import MobileProfileFlow from '../../components/ProfilePages/MobileProfileFlow';

function AdminProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [initials, setInitials] = useState('');
  const [adminId, setAdminId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [formData, setFormData] = useState({});
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
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/change-password`,
        { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordSuccess('Password updated successfully');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setActiveScreen('overview'); // go back to overview
      }, 2000);
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

        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const u = res.data.user;
        setUser(u);
        
        // Setup initials
        let init = 'A';
        if (u.fullName) {
          const parts = u.fullName.split(' ');
          if (parts.length > 1) {
            init = (parts[0][0] + parts[1][0]).toUpperCase();
          } else {
            init = parts[0].substring(0, 2).toUpperCase();
          }
        }
        setInitials(init);

        // Calculate a dummy Admin ID for display based on timestamp or mongo ID
        const dateStr = new Date(u.createdAt || Date.now()).getFullYear();
        const shortId = u._id ? u._id.substring(u._id.length - 4).toUpperCase() : '0000';
        setAdminId(`AD${dateStr}${shortId}`);

        // Init form data
        setFormData({
          fullName: u.fullName || u.name || '',
          phone: u.phone || '',
          dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString().split('T')[0] : '',
          gender: u.gender || '',
          location: u.location || '',
          bio: u.bio || ''
        });

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
      await axios.put(
        `${import.meta.env.VITE_API_URL}/api/auth/profile`,
        { avatar: avatarUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(prev => ({ ...prev, avatar: avatarUrl }));
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
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/auth/profile`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUser(res.data.user);
      setActiveScreen('overview'); // Go back to overview after saving
    } catch (err) {
      console.error('Error saving profile', err);
      alert(err.response?.data?.message || err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Determine navbar title dynamically if we want
  let navTitle = "Admin Profile";
  if (activeScreen === "account") navTitle = "Admin Profile > Account Details";
  else if (activeScreen === "password") navTitle = "Admin Profile > Change Password";
  else if (activeScreen === "language") navTitle = "Admin Profile > Language";
  else if (activeScreen === "about") navTitle = "Admin Profile > About Us";

  return (
    <div className="admin-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, backgroundColor: 'var(--bg-main)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AdminNavbar title={navTitle} />
        
        <div className="sd-profile-container" style={{ padding: '0', flex: 1, overflow: 'auto' }}>
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
  );
}

export default AdminProfile;