import React from "react";
import { AlertTriangle, Trash2, X, RefreshCcw } from "lucide-react";

export default function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "danger", // 'danger' | 'warning' | 'primary'
  isPurge = false, // Keep prop for backwards compatibility
  isPermanentDelete = false,
  extraCheckboxLabel,
  extraCheckboxChecked,
  onExtraCheckboxChange,
  loading = false,
  onConfirm,
  onClose
}) {
  if (!isOpen) return null;

  const isDestructive = confirmVariant === "danger" || isPurge || isPermanentDelete;

  return (
    <div className="al-modal-overlay" onClick={onClose}>
      <div 
        className="al-modal-card al-modal-confirm" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "480px",
          borderRadius: "18px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.28)",
          overflow: "hidden"
        }}
      >
        <div className="al-modal-header" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: isDestructive ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
              color: isDestructive ? "#EF4444" : "#F59E0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              {isDestructive ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <h3 className="al-modal-title" style={{ fontSize: "17px", fontWeight: "700" }}>
                {title || (isDestructive ? "Delete Resource" : "Confirm Action")}
              </h3>
            </div>
          </div>
          <button 
            className="al-modal-close" 
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="al-modal-body" style={{ padding: "20px 24px" }}>
          <p style={{
            margin: "0 0 16px 0",
            fontSize: "14px",
            color: "var(--text-secondary, #4B5563)",
            lineHeight: "1.6"
          }}>
            {message}
          </p>

          {(isPurge || isPermanentDelete) && (
            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.22)",
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "16px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start"
            }}>
              <AlertTriangle size={18} style={{ color: "#EF4444", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#DC2626" }}>
                  Warning: Irreversible Deletion
                </div>
                <div style={{ marginTop: "3px", fontSize: "12.5px", color: "#EF4444", lineHeight: "1.45", opacity: 0.95 }}>
                  This action cannot be undone. Associated files will be permanently deleted from database and cloud storage, and all student access will be revoked.
                </div>
              </div>
            </div>
          )}

          {extraCheckboxLabel && (
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
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

        <div className="al-modal-footer" style={{ padding: "16px 24px", gap: "10px" }}>
          <button 
            type="button" 
            className="al-btn al-btn-secondary" 
            onClick={onClose}
            disabled={loading}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "13.5px"
            }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className={`al-btn ${confirmVariant === "danger" ? "al-btn-danger" : "al-btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "13.5px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              ...(isDestructive ? {
                background: "linear-gradient(135deg, #EF4444, #DC2626)",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                border: "none",
                color: "#FFFFFF"
              } : {})
            }}
          >
            {loading ? (
              <>
                <RefreshCcw size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {isDestructive && <Trash2 size={15} />}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
