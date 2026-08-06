import React from 'react';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  title = "Confirm Action", 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "danger" // "danger", "warning", "info"
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 size={28} style={{ color: '#ef4444' }} />;
      case 'warning':
        return <AlertTriangle size={28} style={{ color: '#f59e0b' }} />;
      case 'info':
      default:
        return <HelpCircle size={28} style={{ color: '#6E3FF3' }} />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger':
        return 'rgba(239, 68, 68, 0.15)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.15)';
      case 'info':
      default:
        return 'rgba(110, 63, 243, 0.15)';
    }
  };

  const getConfirmBtnBg = () => {
    switch (type) {
      case 'danger':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
      default:
        return '#6E3FF3';
    }
  };

  const getConfirmBtnShadow = () => {
    switch (type) {
      case 'danger':
        return '0 4px 14px rgba(239, 68, 68, 0.4)';
      case 'warning':
        return '0 4px 14px rgba(245, 158, 11, 0.4)';
      case 'info':
      default:
        return '0 4px 14px rgba(110, 63, 243, 0.4)';
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(10, 10, 20, 0.75)",
      backdropFilter: "blur(10px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 999999,
    }}>
      <div style={{
        background: "var(--bg-card, #131428)",
        border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
        borderRadius: "20px",
        padding: "32px 28px",
        maxWidth: "420px",
        width: "90%",
        textAlign: "center",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px"
      }}>
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: getIconBg(),
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          {getIcon()}
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>{title}</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
            {message}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "8px" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: "30px",
              border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.1))",
              background: "transparent",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px 20px",
              borderRadius: "30px",
              border: "none",
              background: getConfirmBtnBg(),
              color: "#ffffff",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: getConfirmBtnShadow()
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
