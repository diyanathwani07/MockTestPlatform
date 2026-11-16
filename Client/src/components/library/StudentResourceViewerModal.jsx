import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Link as LinkIcon,
  RefreshCw,
  AlertCircle,
  Check,
  Copy,
  Lock,
  Maximize2
} from "lucide-react";

export default function StudentResourceViewerModal({
  isOpen,
  onClose,
  resourceId,
  initialResource
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !resourceId) return;

    let isMounted = true;
    const fetchDelivery = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/library/resources/${resourceId}/view`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (isMounted) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Student resource view fetch failed:", err);
        if (isMounted) {
          const msg =
            err.response?.data?.message ||
            "Unable to access this study resource. You may need an active subscription or exam enrollment.";
          setError(msg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDelivery();

    return () => {
      isMounted = false;
    };
  }, [isOpen, resourceId]);

  if (!isOpen) return null;

  const resource = data?.resource || initialResource || {};
  const deliveryUrl = data?.deliveryUrl || resource.fileUrl;
  const noteContent = data?.noteContent || resource.contentText || resource.description;

  const handleDownload = async () => {
    if (!resourceId) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/library/resources/${resourceId}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.deliveryUrl) {
        const a = document.createElement("a");
        a.href = res.data.deliveryUrl;
        a.download = res.data.originalFileName || resource.originalFileName || "study-resource";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert(err.response?.data?.message || "Failed to download resource.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyNote = () => {
    if (noteContent) {
      navigator.clipboard.writeText(noteContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="sl-modal-overlay" onClick={onClose}>
      <div 
        className="sl-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: resource.resourceType === "pdf" ? "960px" : "780px" }}
      >
        {/* Header */}
        <div className="sl-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div className={`sl-resource-icon-wrap type-${resource.resourceType || "pdf"}`} style={{ width: "36px", height: "36px" }}>
              {resource.resourceType === "pdf" && <FileText size={18} />}
              {resource.resourceType === "note" && <BookOpen size={18} />}
              {resource.resourceType === "image" && <ImageIcon size={18} />}
              {resource.resourceType === "link" && <LinkIcon size={18} />}
              {resource.resourceType === "docx" && <FileText size={18} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {resource.title || "Study Resource"}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                {resource.accessTier === "free" && (
                  <span className="sl-tier-badge tier-free">Free</span>
                )}
                {resource.accessTier === "premium_subscriber" && (
                  <span className="sl-tier-badge tier-premium">Premium</span>
                )}
                {resource.accessTier === "exam_enrolled" && (
                  <span className="sl-tier-badge tier-enrolled">Enrolled</span>
                )}
                {resource.fileSize > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {(resource.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {deliveryUrl && resource.resourceType === "pdf" && (
              <button 
                className="sl-modal-close-btn" 
                onClick={() => window.open(deliveryUrl, "_blank")}
                title="Open in Full Window"
              >
                <Maximize2 size={16} />
              </button>
            )}
            <button className="sl-modal-close-btn" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="sl-modal-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <RefreshCw size={36} className="animate-spin" style={{ color: "#8B5CF6", margin: "0 auto 16px auto" }} />
              <p style={{ margin: 0, fontWeight: "600", color: "var(--text-secondary)" }}>
                Validating access and preparing secure delivery...
              </p>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.12)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px auto" }}>
                <AlertCircle size={28} />
              </div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "17px", fontWeight: "700" }}>Access Denied</h4>
              <p style={{ margin: "0 auto 20px auto", color: "var(--text-secondary)", maxWidth: "400px", fontSize: "13.5px", lineHeight: "1.5" }}>
                {error}
              </p>
            </div>
          ) : (
            <>
              {/* PDF Viewer */}
              {resource.resourceType === "pdf" && deliveryUrl && (
                <div>
                  <iframe
                    src={deliveryUrl}
                    className="sl-pdf-frame"
                    title={resource.title}
                  />
                </div>
              )}

              {/* Image Viewer */}
              {resource.resourceType === "image" && deliveryUrl && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <img
                    src={deliveryUrl}
                    alt={resource.title}
                    style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                  />
                </div>
              )}

              {/* Note Content */}
              {resource.resourceType === "note" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                    <button
                      onClick={handleCopyNote}
                      style={{
                        background: "rgba(139, 92, 246, 0.1)",
                        border: "1px solid rgba(139, 92, 246, 0.25)",
                        color: "#8B5CF6",
                        padding: "5px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer"
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? "Copied!" : "Copy Notes"}</span>
                    </button>
                  </div>
                  <div className="sl-note-content-box">
                    {noteContent || "No content provided for this study note."}
                  </div>
                </div>
              )}

              {/* External Link */}
              {resource.resourceType === "link" && deliveryUrl && (
                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                  <div className="sl-empty-icon" style={{ background: "rgba(139, 92, 246, 0.12)" }}>
                    <ExternalLink size={28} />
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: "700" }}>{resource.title}</h4>
                  <p style={{ margin: "0 0 20px 0", color: "var(--text-secondary)", fontSize: "13.5px", maxWidth: "460px", marginLeft: "auto", marginRight: "auto" }}>
                    {resource.description || "This resource points to an external educational link."}
                  </p>
                  <button
                    className="sl-btn-upgrade"
                    style={{ maxWidth: "260px", margin: "0 auto" }}
                    onClick={() => window.open(deliveryUrl, "_blank", "noopener,noreferrer")}
                  >
                    <span>Open External Resource</span>
                    <ExternalLink size={16} />
                  </button>
                </div>
              )}

              {/* DOC / DOCX Unsupported in browser */}
              {resource.resourceType === "docx" && (
                <div style={{ textAlign: "center", padding: "30px 20px" }}>
                  <div className="sl-empty-icon" style={{ background: "rgba(99, 102, 241, 0.12)", color: "#6366F1" }}>
                    <FileText size={28} />
                  </div>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: "700" }}>Word Document</h4>
                  <p style={{ margin: "0 0 20px 0", color: "var(--text-secondary)", fontSize: "13.5px", maxWidth: "460px", marginLeft: "auto", marginRight: "auto" }}>
                    Word documents (.docx) cannot be previewed directly in the web browser. Download the file to view it on your device.
                  </p>
                  {resource.isDownloadable !== false ? (
                    <button
                      className="sl-btn-upgrade"
                      style={{ maxWidth: "240px", margin: "0 auto" }}
                      onClick={handleDownload}
                      disabled={downloading}
                    >
                      <Download size={16} />
                      <span>{downloading ? "Preparing..." : "Download Document"}</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      Online viewing only (Download disabled by admin).
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sl-modal-footer">
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {data?.expiresInSeconds && (
              <span>Authenticated session active (expires in ~60m)</span>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {resource.isDownloadable !== false && resource.resourceType !== "link" && resource.resourceType !== "note" && !error && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  background: "#F1F5F9",
                  border: "1px solid #CBD5E1",
                  color: "#1E293B",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                <Download size={15} />
                <span>{downloading ? "Downloading..." : "Download File"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                background: "#8B5CF6",
                border: "none",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
