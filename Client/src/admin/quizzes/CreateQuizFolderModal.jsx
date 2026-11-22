import React, { useState, useEffect } from "react";
import { FolderPlus, X, RefreshCw, Image, Folder, Layers, Sparkles, Check } from "lucide-react";

const PRESET_BANNERS = [
  { label: "Indigo Modern", url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80", color: "#6366f1" },
  { label: "Amber Study", url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80", color: "#f59e0b" },
  { label: "Emerald Exam", url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&auto=format&fit=crop&q=80", color: "#10b981" },
  { label: "Purple Accent", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80", color: "#8b5cf6" }
];

export default function CreateQuizFolderModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  parentFolder = null,
  examSeriesList = [],
  loading = false
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [examSeriesId, setExamSeriesId] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setThumbnail(initialData.thumbnail || "");
      setExamSeriesId(initialData.examSeriesId || "");
    } else {
      setTitle("");
      setDescription("");
      setThumbnail("");
      setExamSeriesId(parentFolder?.examSeriesId || "");
    }
  }, [initialData, parentFolder, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      thumbnail: thumbnail.trim(),
      examSeriesId: examSeriesId || null,
      parentId: initialData ? initialData.parentId : parentFolder?._id || null
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end"
      }}
      onClick={onClose}
    >
      {/* ─── RIGHT SIDEBAR DRAWER PANEL ─── */}
      <div 
        style={{
          width: "100%",
          maxWidth: "480px",
          height: "100%",
          backgroundColor: "var(--bg-card)",
          borderLeft: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          boxShadow: "-10px 0 35px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-card)",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(110, 63, 243, 0.12)",
                color: "#6E3FF3",
                flexShrink: 0
              }}
            >
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
                {initialData ? "Edit Folder" : parentFolder ? `Create Subfolder` : "Create Folder"}
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                {parentFolder ? `Inside: ${parentFolder.title}` : "Organize quizzes into structured directories"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer"
            }}
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Folder Title */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Folder Title <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Folder size={16} style={{ position: "absolute", left: "14px", color: "var(--text-muted)", pointerEvents: "none" }} />
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. BPSC TRE 4.0 / Subject Tests"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  height: "42px",
                  paddingLeft: "42px",
                  paddingRight: "14px",
                  fontSize: "13px",
                  fontWeight: "600",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  outline: "none"
                }}
              />
            </div>
          </div>

          {/* Target Exam Series */}
          {examSeriesList && examSeriesList.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Target Exam Series (Optional)
              </label>
              <select
                value={examSeriesId}
                onChange={(e) => setExamSeriesId(e.target.value)}
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 14px",
                  fontSize: "13px",
                  fontWeight: "500",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                  No Specific Series (General Folder)
                </option>
                {examSeriesList.map((exam) => (
                  <option key={exam._id} value={exam._id} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                    {exam.title || exam.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of tests or materials inside this folder..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "13px",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                color: "var(--text-primary)",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Thumbnail / Banner URL */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>
              Cover Banner / Thumbnail URL
            </label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              <input
                type="url"
                placeholder="https://example.com/folder-banner.png"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                style={{
                  flex: 1,
                  height: "40px",
                  padding: "0 14px",
                  fontSize: "12.5px",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  color: "var(--text-primary)",
                  outline: "none"
                }}
              />
              {thumbnail && (
                <button
                  type="button"
                  onClick={() => setThumbnail("")}
                  style={{
                    padding: "0 12px",
                    height: "40px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "transparent",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="Clear thumbnail"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* AppX Preset Cards */}
            <div>
              <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                Quick Preset Banners:
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {PRESET_BANNERS.map((preset) => {
                  const isSelected = thumbnail === preset.url;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setThumbnail(preset.url)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: isSelected ? "1.5px solid #6E3FF3" : "1px solid var(--border-color)",
                        backgroundColor: isSelected ? "rgba(110, 63, 243, 0.12)" : "var(--bg-input)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: preset.color, display: "inline-block" }} />
                        <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--text-primary)" }}>
                          {preset.label}
                        </span>
                      </div>
                      {isSelected && <Check size={14} style={{ color: "#6E3FF3" }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Folder Preview Card */}
          <div style={{ paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
            <span style={{ display: "block", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "8px" }}>
              Live Folder Card Preview
            </span>
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid var(--border-color)",
                overflow: "hidden",
                backgroundColor: "var(--bg-card)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
              }}
            >
              <div
                style={{
                  height: "90px",
                  width: "100%",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--bg-input)",
                  borderBottom: "1px solid var(--border-color)"
                }}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f59e0b",
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    <Folder size={22} />
                  </div>
                )}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {title.trim() || "Untitled Folder"}
                </h4>
                <p style={{ margin: "3px 0 0 0", fontSize: "11.5px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {description.trim() || "Course directory folder"}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border-color)", marginTop: "8px", fontSize: "10.5px" }}>
                  <span style={{ padding: "2px 6px", borderRadius: "4px", fontWeight: "600", backgroundColor: "var(--bg-input)", color: "var(--text-secondary)" }}>
                    Folder
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>0 quizzes</span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Drawer Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "16px 24px",
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-card)",
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              height: "40px",
              padding: "0 18px",
              fontSize: "12.5px",
              fontWeight: "600",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-secondary)",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            style={{
              height: "40px",
              padding: "0 22px",
              fontSize: "12.5px",
              fontWeight: "700",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#6E3FF3",
              color: "#ffffff",
              cursor: loading || !title.trim() ? "not-allowed" : "pointer",
              opacity: loading || !title.trim() ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 10px rgba(110, 63, 243, 0.35)"
            }}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <FolderPlus size={15} />}
            <span>{initialData ? "Save Changes" : "Create Folder"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
