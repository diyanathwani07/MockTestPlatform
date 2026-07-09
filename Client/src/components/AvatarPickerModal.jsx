import React, { useRef } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';

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
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      onSelect(event.target.result);
    };
    reader.readAsDataURL(file);
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
          <button className="avatar-btn avatar-btn-primary" onClick={() => fileInputRef.current.click()}>
            <Upload size={16} /> Import from Gallery
          </button>
          
          <button className="avatar-btn avatar-btn-secondary" onClick={() => onSelect("")} style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <Trash2 size={16} /> Remove Picture
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarPickerModal;
