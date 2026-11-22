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
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm animate-fadeIn transition-opacity"
      onClick={onClose}
    >
      {/* ─── RIGHT SIDEBAR DRAWER PANEL ─── */}
      <div 
        className="w-full max-w-md sm:max-w-lg h-full shadow-2xl border-l flex flex-col overflow-hidden animate-slideInRight"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-color)",
          color: "var(--text-primary)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ backgroundColor: "rgba(110, 63, 243, 0.12)", color: "#6E3FF3" }}
            >
              <FolderPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold m-0" style={{ color: "var(--text-primary)" }}>
                {initialData ? "Edit Folder" : parentFolder ? `Create Subfolder` : "Create Root Folder"}
              </h3>
              <p className="text-xs m-0 mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {parentFolder ? `Parent: ${parentFolder.title}` : "Right Sidebar • Course & Directory Setup"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-transparent border-none cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Folder Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Folder Title <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <Folder size={16} className="absolute left-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. BPSC TRE 4.0 / Subject Tests"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)"
                }}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs font-semibold border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Target Exam Series */}
          {examSeriesList && examSeriesList.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Target Exam Series (Optional)
              </label>
              <select
                value={examSeriesId}
                onChange={(e) => setExamSeriesId(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)"
                }}
                className="w-full px-3.5 py-2.5 text-xs font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
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
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of tests or materials inside this folder..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                backgroundColor: "var(--bg-input)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)"
              }}
              className="w-full px-3.5 py-2.5 text-xs font-normal border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none font-sans"
            />
          </div>

          {/* Thumbnail / Banner URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Cover Banner / Thumbnail URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/folder-banner.png"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)"
                }}
                className="flex-1 px-3.5 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {thumbnail && (
                <button
                  type="button"
                  onClick={() => setThumbnail("")}
                  className="px-2.5 py-2 text-xs rounded-xl border bg-transparent cursor-pointer"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                  title="Clear thumbnail"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* AppX Preset Cards */}
            <div className="mt-3">
              <span className="text-[11px] font-semibold mb-2 block" style={{ color: "var(--text-muted)" }}>
                AppX Presets:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_BANNERS.map((preset) => {
                  const isSelected = thumbnail === preset.url;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setThumbnail(preset.url)}
                      className="p-2 rounded-xl border text-left flex items-center justify-between cursor-pointer transition-all"
                      style={{
                        backgroundColor: isSelected ? "rgba(110, 63, 243, 0.12)" : "var(--bg-input)",
                        borderColor: isSelected ? "#6E3FF3" : "var(--border-color)"
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.color }} />
                        <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                          {preset.label}
                        </span>
                      </div>
                      {isSelected && <Check size={13} className="text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Folder Preview Card */}
          <div className="pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
            <span className="text-[11px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-muted)" }}>
              Live Folder Preview
            </span>
            <div
              className="rounded-2xl border overflow-hidden shadow-xs flex flex-col"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <div
                className="h-24 w-full relative overflow-hidden flex items-center justify-center border-b"
                style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-color)" }}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl shadow-xs flex items-center justify-center text-amber-500 border"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
                  >
                    <Folder size={20} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h4 className="text-xs font-bold line-clamp-1 m-0" style={{ color: "var(--text-primary)" }}>
                  {title.trim() || "Untitled Folder"}
                </h4>
                <p className="text-[11px] line-clamp-1 m-0 mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {description.trim() || "Course directory folder"}
                </p>
                <div className="flex items-center justify-between pt-2 border-t mt-2 text-[10px]" style={{ borderColor: "var(--border-color)" }}>
                  <span className="px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)" }}>
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
          className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl transition-colors bg-transparent border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
            style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="btn-prepmark-primary inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl transition-all border-none cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "#6E3FF3", color: "#ffffff" }}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <FolderPlus size={15} />}
            <span>{initialData ? "Save Changes" : "Create Folder"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
