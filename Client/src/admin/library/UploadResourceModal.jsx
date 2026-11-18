import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Upload,
  FileText,
  BookOpen,
  Link,
  CheckCircle2,
  AlertCircle,
  File,
  Eye,
  Info,
  Folder as FolderIcon
} from "lucide-react";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
  "image/webp"
];

const ACCESS_TIERS = [
  {
    key: "free",
    label: "Free Access",
    desc: "Available to all registered students without payment"
  },
  {
    key: "premium_subscriber",
    label: "Premium Subscribers",
    desc: "Requires an active AI / PrepMark premium subscription"
  },
  {
    key: "exam_enrolled",
    label: "Enrolled Students",
    desc: "Only students enrolled in this specific exam series can view"
  }
];

function flattenFolders(roots) {
  const result = [];
  const traverse = (node, depth) => {
    result.push({
      _id: (node._id || "").toString(),
      name: node.name,
      depth
    });
    if (Array.isArray(node.children)) {
      node.children.forEach((c) => traverse(c, depth + 1));
    }
  };
  (roots || []).forEach((r) => traverse(r, 0));
  return result;
}

export default function UploadResourceModal({
  isOpen,
  onClose,
  folder,
  tree = [],
  scope,
  resourceToEdit = null,
  onSubmitFile,
  onUploadFile,
  onSubmitNoteOrLink,
  onCreateNonFile,
  onUpdateResource,
  submitting = false
}) {
  const [activeTab, setActiveTab] = useState("file"); // "file" | "note" | "link"

  // Common Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessTier, setAccessTier] = useState("free");
  const [isDownloadable, setIsDownloadable] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [loading, setLoading] = useState(false);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Link State
  const [linkUrl, setLinkUrl] = useState("");

  // Error State
  const [error, setError] = useState("");

  const flatFolders = useMemo(() => flattenFolders(tree), [tree]);

  useEffect(() => {
    if (isOpen) {
      if (resourceToEdit) {
        setTitle(resourceToEdit.title || "");
        setDescription(resourceToEdit.description || "");
        setAccessTier(resourceToEdit.accessTier || "free");
        setIsDownloadable(resourceToEdit.isDownloadable ?? true);
        setIsPublished(resourceToEdit.isPublished ?? true);
        setSelectedFolderId((resourceToEdit.folderId?._id || resourceToEdit.folderId || "").toString());
        if (resourceToEdit.resourceType === "note") {
          setActiveTab("note");
        } else if (
          resourceToEdit.resourceType === "web_link" ||
          resourceToEdit.resourceType === "video_link"
        ) {
          setActiveTab("link");
          setLinkUrl(resourceToEdit.fileUrl || "");
        } else {
          setActiveTab("file");
        }
      } else {
        setTitle("");
        setDescription("");
        setAccessTier("free");
        setIsDownloadable(true);
        setIsPublished(true);
        setSelectedFile(null);
        setLinkUrl("");
        setActiveTab("file");
        setSelectedFolderId(folder?._id ? folder._id.toString() : (flatFolders.length > 0 ? flatFolders[0]._id : ""));
      }
      setError("");
    }
  }, [isOpen, resourceToEdit, folder, flatFolders]);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    setError("");
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Invalid file type. Allowed formats: PDF, DOC, DOCX, PNG, JPG, WebP.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds maximum 50 MB limit.");
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      // Auto-populate title from clean filename
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Resource title is required");
      return;
    }

    const targetFolderId = selectedFolderId || folder?._id || "root";
    const fileFn = onSubmitFile || onUploadFile;
    const nonFileFn = onSubmitNoteOrLink || onCreateNonFile;
    const updateFn = onUpdateResource;

    setLoading(true);

    try {
      if (resourceToEdit && updateFn) {
        await updateFn(resourceToEdit._id, {
          title: title.trim(),
          description: description.trim(),
          accessTier,
          isDownloadable,
          isPublished
        });
        onClose();
        return;
      }

      if (activeTab === "file") {
        if (!selectedFile && !resourceToEdit) {
          setError("Please choose a file to upload");
          setLoading(false);
          return;
        }

        const formData = new FormData();
        if (selectedFile) {
          formData.append("file", selectedFile);
        }
        formData.append("title", title.trim());
        formData.append("description", description.trim());
        formData.append("folderId", targetFolderId);
        formData.append("accessTier", accessTier);
        formData.append("isDownloadable", isDownloadable);
        formData.append("isPublished", isPublished);

        if (fileFn) {
          await fileFn(formData);
          onClose();
        } else {
          throw new Error("File upload handler is not configured");
        }
      } else if (activeTab === "link") {
        if (!linkUrl.trim()) {
          setError("Target link URL is required");
          setLoading(false);
          return;
        }

        try {
          new URL(linkUrl.trim());
        } catch {
          setError("Please enter a valid URL (e.g. https://...)");
          setLoading(false);
          return;
        }

        if (nonFileFn) {
          await nonFileFn({
            title: title.trim(),
            description: description.trim(),
            folderId: targetFolderId,
            resourceType:
              linkUrl.includes("youtube.com") || linkUrl.includes("youtu.be")
                ? "video_link"
                : "web_link",
            fileUrl: linkUrl.trim(),
            accessTier,
            isDownloadable: false,
            isPublished
          });
          onClose();
        } else {
          throw new Error("Resource creation handler is not configured");
        }
      } else if (activeTab === "note") {
        if (!description.trim()) {
          setError("Note text content is required");
          setLoading(false);
          return;
        }

        if (nonFileFn) {
          await nonFileFn({
            title: title.trim(),
            description: description.trim(),
            folderId: targetFolderId,
            resourceType: "note",
            accessTier,
            isDownloadable: false,
            isPublished
          });
          onClose();
        } else {
          throw new Error("Resource creation handler is not configured");
        }
      }
    } catch (err) {
      console.error("Save study resource error:", err);
      setError(err.response?.data?.message || err.message || "Failed to save resource");
    } finally {
      setLoading(false);
    }
  };

  const selectedFolderObj = useMemo(() => {
    if (folder) return folder;
    return flatFolders.find((f) => f._id === selectedFolderId) || null;
  }, [folder, flatFolders, selectedFolderId]);

  return (
    <div className="library-drawer-overlay" onClick={onClose}>
      <div className="library-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="library-modal-header">
          <div>
            <h3>{resourceToEdit ? "Edit Study Resource" : "Add Study Resource"}</h3>
            <span style={{ fontSize: "12px", color: "var(--text-secondary, #6B7280)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <FolderIcon size={13} />
              Destination Folder: <strong>{selectedFolderObj ? selectedFolderObj.name : "Root / General"}</strong>
            </span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        {!resourceToEdit && (
          <div className="library-drawer-tabs">
            <button
              type="button"
              className="scope-pill-btn"
              style={{
                borderRadius: "0",
                borderBottom: activeTab === "file" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "file" ? "var(--primary)" : "inherit",
                fontWeight: activeTab === "file" ? "700" : "500",
                padding: "12px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                background: "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                cursor: "pointer"
              }}
              onClick={() => {
                setActiveTab("file");
                setError("");
              }}
            >
              <Upload size={15} /> Upload File (PDF, DOCX)
            </button>
            <button
              type="button"
              className="scope-pill-btn"
              style={{
                borderRadius: "0",
                borderBottom: activeTab === "note" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "note" ? "var(--primary)" : "inherit",
                fontWeight: activeTab === "note" ? "700" : "500",
                padding: "12px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                background: "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                cursor: "pointer"
              }}
              onClick={() => {
                setActiveTab("note");
                setError("");
              }}
            >
              <BookOpen size={15} /> Text Note
            </button>
            <button
              type="button"
              className="scope-pill-btn"
              style={{
                borderRadius: "0",
                borderBottom: activeTab === "link" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "link" ? "var(--primary)" : "inherit",
                fontWeight: activeTab === "link" ? "700" : "500",
                padding: "12px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                background: "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                cursor: "pointer"
              }}
              onClick={() => {
                setActiveTab("link");
                setError("");
              }}
            >
              <Link size={15} /> External Link
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div className="library-modal-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px" }}>
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#DC2626",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Destination Folder Selector (when not opened inside a specific folder) */}
            {!folder && !resourceToEdit && (
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <FolderIcon size={14} color="var(--primary)" />
                  Destination Folder <span style={{ color: "var(--red, #ef4444)" }}>*</span>
                </label>
                {flatFolders.length > 0 ? (
                  <select
                    className="form-select"
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color, #E5E7EB)",
                      background: "var(--bg-input, #ffffff)",
                      color: "var(--text-primary, #111827)",
                      fontSize: "13.5px"
                    }}
                  >
                    <option value="">-- Choose Target Folder --</option>
                    {flatFolders.map((f) => (
                      <option key={f._id} value={f._id}>
                        {"— ".repeat(f.depth) + f.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    padding: "8px 12px",
                    background: "rgba(110, 63, 243, 0.08)",
                    border: "1px solid rgba(110, 63, 243, 0.2)",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    color: "var(--text-secondary)"
                  }}>
                    ℹ️ No folders found yet. A default folder will be created automatically.
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: FILE UPLOAD DROPZONE */}
            {activeTab === "file" && (
              <div className="form-group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      validateAndSetFile(e.target.files[0]);
                    }
                  }}
                />

                {!selectedFile ? (
                  <div
                    className={`upload-dropzone ${dragActive ? "drag-active" : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="dropzone-icon">
                      <Upload size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--primary)" }}>
                        Click to browse
                      </span>{" "}
                      <span style={{ fontSize: "14px", color: "var(--text-secondary, #4B5563)" }}>
                        or drag & drop file here
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-muted, #9CA3AF)" }}>
                      Supported: PDF, DOC, DOCX, PNG, JPG, WebP (Max 50 MB)
                    </span>
                  </div>
                ) : (
                  <div className="selected-file-chip">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FileText size={20} color="var(--primary)" />
                      <div>
                        <div style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary, #111827)" }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted, #6B7280)" }}>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #9CA3AF)" }}
                      onClick={() => setSelectedFile(null)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LINK URL INPUT */}
            {activeTab === "link" && (
              <div className="form-group">
                <label className="form-label">
                  Target Web / Video URL <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://www.youtube.com/watch?v=... or https://example.com/doc"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
            )}

            {/* COMMON: Title */}
            <div className="form-group">
              <label className="form-label">
                Resource Title <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Master Formula Sheet 2026"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* COMMON: Description / Note Content */}
            <div className="form-group">
              <label className="form-label">
                {activeTab === "note" ? "Note Content (Text / Markdown) *" : "Description (Optional)"}
              </label>
              <textarea
                className="form-textarea"
                rows={activeTab === "note" ? 6 : 3}
                placeholder={
                  activeTab === "note"
                    ? "Write study notes, key definitions, or guidelines here..."
                    : "Brief description for students..."
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* ACCESS TIER SELECTOR */}
            <div className="form-group">
              <label className="form-label">Access Control Tier</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                {ACCESS_TIERS.map((tier) => {
                  const isSelected = accessTier === tier.key;
                  return (
                    <div
                      key={tier.key}
                      onClick={() => setAccessTier(tier.key)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color, #E5E7EB)",
                        background: isSelected ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "var(--bg-input, #F9FAFB)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setAccessTier(tier.key)}
                        style={{ marginTop: "3px", accentColor: "var(--primary)" }}
                      />
                      <div>
                        <div style={{ fontSize: "13.5px", fontWeight: "700", color: "var(--text-primary, #111827)" }}>
                          {tier.label}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary, #6B7280)" }}>
                          {tier.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TOGGLES: Downloadable & Published */}
            {activeTab === "file" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary, #374151)" }}>
                    Allow Offline File Download
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted, #6B7280)" }}>
                    If disabled, students can only view the resource in the online reader.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isDownloadable}
                  onChange={(e) => setIsDownloadable(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary, #374151)" }}>
                  Publish Immediately
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted, #6B7280)" }}>
                  Uncheck to save as draft hidden from students.
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
              />
            </div>
          </div>

          <div className="library-modal-footer">
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={onClose}
              disabled={submitting || loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-gradient"
              disabled={submitting || loading}
            >
              {(submitting || loading) ? "Saving..." : resourceToEdit ? "Update Resource" : "Save Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
