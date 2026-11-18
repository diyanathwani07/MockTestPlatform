import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

const COLOR_PRESETS = [
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#6366F1"
];

export default function EditFolderModal({
  isOpen,
  onClose,
  onSubmit,
  folder,
  submitting = false
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#8B5CF6");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (folder) {
      setName(folder.name || "");
      setDescription(folder.description || "");
      setColor(folder.color || "#8B5CF6");
      setError("");
      setIsSubmitting(false);
    }
  }, [folder]);

  if (!isOpen || !folder) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onSubmit(folder._id, {
        name: name.trim(),
        description: description.trim(),
        color
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="library-modal-overlay" onClick={onClose}>
      <div className="library-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="library-modal-header">
          <h3>Edit Folder: {folder.name}</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="library-modal-body">
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#DC2626",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "500"
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Folder Name <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={name}
                maxLength={120}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Color Accent</label>
              <div className="color-picker-row">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-dot-btn ${color === c ? "selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  >
                    {color === c && <Check size={14} color="#FFF" style={{ margin: "auto" }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="library-modal-footer">
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={onClose}
              disabled={submitting || isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-gradient"
              disabled={submitting || isSubmitting || !name.trim()}
            >
              {(submitting || isSubmitting) ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
