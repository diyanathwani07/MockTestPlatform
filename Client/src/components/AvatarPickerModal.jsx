import React, { useRef, useState } from 'react';
import { X, Upload, Trash2, Loader2 } from 'lucide-react';
import axios from 'axios';

const PRESET_AVATARS = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Buster",
];

const AvatarPickerModal = ({ isOpen, onClose, onSelect }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      alert("Invalid file type. Only JPG, PNG, and WebP are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload an image smaller than 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("token");
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      };

      const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
      const response = await axios.post(`${API_URL}/api/users/upload-profile`, formData, config);

      if (response.data.success) {
        onSelect(response.data.imageUrl); // Close modal and update UI
        alert("Profile picture updated!");
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(error.response?.data?.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="avatar-modal-overlay" onClick={onClose}>
      <div className="avatar-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-modal-header">
          <h3>Choose Profile Picture</h3>
          <button className="avatar-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="avatar-presets-grid">
          {PRESET_AVATARS.map((url, idx) => (
            <div key={idx} className="avatar-preset-item" onClick={() => onSelect(url)}>
              <img src={url} alt={`Preset ${idx + 1}`} />
            </div>
          ))}
        </div>

        <div className="avatar-upload-divider">
          <div className="avatar-divider-line"></div>
          <span>OR</span>
          <div className="avatar-divider-line"></div>
        </div>

        <div className="avatar-action-buttons">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button 
            className="avatar-btn avatar-btn-primary" 
            onClick={() => fileInputRef.current.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
            {isUploading ? "Uploading..." : "Import from Gallery"}
          </button>
          
          <button 
            className="avatar-btn avatar-btn-secondary" 
            onClick={() => onSelect("")} 
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            disabled={isUploading}
          >
            <Trash2 size={16} /> Remove Picture
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
