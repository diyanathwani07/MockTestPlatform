import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  AlertTriangle,
  RefreshCw,
  Clock,
  BookOpen,
  Image as ImageIcon
} from "lucide-react";

export default function ResourcePreviewModal({
  isOpen,
  onClose,
  resource
}) {
  const [loading, setLoading] = useState(true);
  const [deliveryData, setDeliveryData] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchSecureView = async () => {
    if (!resource) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/library/resources/${resource._id}/view`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDeliveryData(res.data);
    } catch (err) {
      console.error("Preview fetch error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to generate secure preview URL. Please verify your permissions."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && resource) {
      fetchSecureView();
    } else {
      setDeliveryData(null);
      setError("");
    }
  }, [isOpen, resource]);

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/admin/library/resources/${resource._id}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.deliveryUrl) {
        window.open(res.data.deliveryUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert(err.response?.data?.message || "Failed to initiate secure download.");
    }
  };

  if (!isOpen || !resource) return null;

  const isPdf = resource.resourceType === "pdf";
  const isImage = resource.resourceType === "image";
  const isDoc = resource.resourceType === "docx" || resource.resourceType === "doc";
  const isNote = resource.resourceType === "note";
  const isLink = ["video_link", "web_link"].includes(resource.resourceType);

  return (
    <div className="library-modal-overlay" onClick={onClose}>
      <div
        className="library-modal-card"
        style={{ maxWidth: "880px", height: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="library-modal-header">
          <div>
            <h3>{resource.title}</h3>
            <span style={{ fontSize: "12px", color: "var(--text-secondary, #6B7280)" }}>
              {resource.originalFileName || resource.resourceType?.toUpperCase()}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Direct Download Button */}
            {resource.isDownloadable !== false && !isNote && (
              <button
                type="button"
                className="btn-secondary-outline"
                style={{ padding: "6px 12px", fontSize: "12.5px" }}
                onClick={handleDownload}
              >
                <Download size={14} /> Download File
              </button>
            )}

            <button type="button" className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Viewer */}
        <div
          className="library-modal-body"
          style={{ flex: 1, padding: "0", background: "var(--bg-input, #F3F4F6)" }}
        >
          {loading ? (
            <div style={{ padding: "80px 20px", textAlign: "center", color: "var(--text-muted, #6B7280)" }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
              <div>Generating expiring authenticated delivery token...</div>
            </div>
          ) : error ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <AlertTriangle size={36} color="#DC2626" style={{ margin: "0 auto 12px auto" }} />
              <h4 style={{ color: "#DC2626", marginBottom: "6px" }}>Preview Unavailable</h4>
              <p style={{ fontSize: "13.5px", color: "var(--text-secondary, #4B5563)", maxWidth: "420px", margin: "0 auto 16px auto" }}>
                {error}
              </p>
              <button
                type="button"
                className="btn-primary-gradient"
                onClick={() => {
                  setRefreshing(true);
                  fetchSecureView();
                }}
              >
                <RefreshCw size={14} /> Retry Access
              </button>
            </div>
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
              {/* PDF Viewer */}
              {isPdf && deliveryData?.deliveryUrl && (
                <iframe
                  src={`${deliveryData.deliveryUrl}#toolbar=1`}
                  title={resource.title}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              )}

              {/* Image Viewer */}
              {isImage && deliveryData?.deliveryUrl && (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                  <img
                    src={deliveryData.deliveryUrl}
                    alt={resource.title}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }}
                  />
                </div>
              )}

              {/* DOC / DOCX Fallback Notice */}
              {isDoc && (
                <div style={{ padding: "60px 20px", textAlign: "center", margin: "auto" }}>
                  <FileText size={48} color="#3B82F6" style={{ margin: "0 auto 16px auto" }} />
                  <h4 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "8px" }}>
                    Word Document ({resource.originalFileName})
                  </h4>
                  <p style={{ fontSize: "13.5px", color: "var(--text-secondary, #4B5563)", maxWidth: "440px", margin: "0 auto 20px auto" }}>
                    Browser inline rendering is not supported for Word document binaries. Download the signed file to view it in Microsoft Word or Google Docs.
                  </p>
                  <button type="button" className="btn-primary-gradient" onClick={handleDownload}>
                    <Download size={16} /> Download {resource.originalFileName || "Document"}
                  </button>
                </div>
              )}

              {/* Text Note Viewer */}
              {isNote && (
                <div style={{ padding: "30px", background: "var(--bg-card, #FFFFFF)", flex: 1, overflowY: "auto" }}>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.7", color: "var(--text-primary, #1F2937)" }}>
                    {deliveryData?.noteContent || resource.description}
                  </div>
                </div>
              )}

              {/* External Link Viewer */}
              {isLink && (
                <div style={{ padding: "60px 20px", textAlign: "center", margin: "auto" }}>
                  <ExternalLink size={48} color="var(--primary)" style={{ margin: "0 auto 16px auto" }} />
                  <h4 style={{ fontSize: "17px", fontWeight: "700", marginBottom: "8px" }}>
                    External Web Resource
                  </h4>
                  <p style={{ fontSize: "13.5px", color: "var(--text-secondary, #4B5563)", maxWidth: "400px", margin: "0 auto 20px auto" }}>
                    {deliveryData?.deliveryUrl || resource.fileUrl}
                  </p>
                  <a
                    href={deliveryData?.deliveryUrl || resource.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary-gradient"
                    style={{ textDecoration: "none", display: "inline-flex" }}
                  >
                    <ExternalLink size={16} /> Open in New Tab
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Expiry info */}
        <div className="library-modal-footer" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted, #9CA3AF)" }}>
            <Clock size={13} />
            <span>Expiring delivery token active (60 min validity)</span>
          </div>

          <button
            type="button"
            className="btn-secondary-outline"
            onClick={() => {
              setRefreshing(true);
              fetchSecureView();
            }}
            disabled={refreshing || loading}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh URL
          </button>
        </div>
      </div>
    </div>
  );
}
