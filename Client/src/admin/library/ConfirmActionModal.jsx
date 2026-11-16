import React from "react";
import { AlertTriangle, Trash2, Archive, X } from "lucide-react";

export default function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger", // 'danger' | 'warning' | 'primary'
  isPurge = false,
  extraCheckboxLabel,
  extraCheckboxChecked,
  onExtraCheckboxChange,
  loading = false,
  onConfirm,
  onClose
}) {
  if (!isOpen) return null;

  return (
    <div className="al-modal-overlay" onClick={onClose}>
      <div 
        className="al-modal-card al-modal-confirm" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "480px" }}
      >
        <div className="al-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: confirmVariant === "danger" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: confirmVariant === "danger" ? "#ef4444" : "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <AlertTriangle size={18} />
            </div>
            <h3 className="al-modal-title">{title}</h3>
          </div>
          <button className="al-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="al-modal-body">
          <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            {message}
          </p>

          {isPurge && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
              fontSize: "12.5px",
              color: "#ef4444",
              display: "flex",
              gap: "8px"
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Warning: Permanent Destruction</strong>
                <div style={{ marginTop: "2px", opacity: 0.9 }}>
                  This action cannot be undone. Associated Cloudinary files will be permanently purged and all student access immediately revoked.
                </div>
              </div>
            </div>
          )}

          {extraCheckboxLabel && (
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "var(--text-primary)",
              cursor: "pointer",
              padding: "8px 0"
            }}>
              <input 
                type="checkbox"
                checked={extraCheckboxChecked}
                onChange={(e) => onExtraCheckboxChange && onExtraCheckboxChange(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--primary)" }}
              />
              {extraCheckboxLabel}
            </label>
          )}
        </div>

        <div className="al-modal-footer">
          <button 
            type="button" 
            className="al-btn al-btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className={`al-btn ${confirmVariant === "danger" ? "al-btn-danger" : "al-btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
