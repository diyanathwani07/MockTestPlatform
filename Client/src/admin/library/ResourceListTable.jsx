import React from "react";
import {
  FileText,
  FileCode,
  Image,
  Link,
  BookOpen,
  Eye,
  Download,
  Edit2,
  Move,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  Sparkles,
  ExternalLink,
  FileCheck,
  ShieldAlert
} from "lucide-react";

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

export default function ResourceListTable({
  resources = [],
  loading = false,
  onPreviewResource,
  onDownloadResource,
  onEditResource,
  onMoveResource,
  onTogglePublish,
  onArchiveResource,
  onPurgeResource,
  isSuperAdmin = false,
  canManageResources = true
}) {
  const getResourceIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FileText size={18} className="resource-type-icon pdf" />;
      case "docx":
        return <FileCode size={18} className="resource-type-icon docx" />;
      case "image":
        return <Image size={18} className="resource-type-icon image" />;
      case "note":
        return <BookOpen size={18} className="resource-type-icon note" />;
      case "video_link":
      case "web_link":
        return <Link size={18} className="resource-type-icon link" />;
      default:
        return <FileText size={18} className="resource-type-icon pdf" />;
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case "free":
        return <span className="badge-tier free">Free Access</span>;
      case "premium_subscriber":
        return <span className="badge-tier premium">Premium Tier</span>;
      case "exam_enrolled":
        return <span className="badge-tier enrolled">Enrolled Only</span>;
      default:
        return <span className="badge-tier free">{tier || "Free"}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted, #9CA3AF)" }}>
        <div style={{ fontSize: "14px", fontWeight: "500" }}>Loading resources...</div>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="empty-state-box">
        <div className="empty-state-icon">
          <BookOpen size={28} />
        </div>
        <h4 className="empty-state-title">No Study Materials Found</h4>
        <p className="empty-state-desc">
          This folder currently contains no resources. Click "Upload Resource" above to add PDFs, notes, or links.
        </p>
      </div>
    );
  }

  return (
    <div className="resources-table-wrapper">
      <table className="resources-table">
        <thead>
          <tr>
            <th>Resource</th>
            <th>Type</th>
            <th>Access Tier</th>
            <th>File Size</th>
            <th>Status</th>
            <th>Updated</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((res) => {
            const isDownloadable = res.isDownloadable !== false;
            const isFile = ["pdf", "docx", "image"].includes(res.resourceType);

            return (
              <tr key={res._id}>
                {/* Title & Description */}
                <td>
                  <div className="resource-info-cell">
                    {getResourceIcon(res.resourceType)}
                    <div>
                      <span className="resource-name-text">{res.title}</span>
                      {res.originalFileName ? (
                        <span className="resource-sub-meta">{res.originalFileName}</span>
                      ) : res.description ? (
                        <span className="resource-sub-meta">
                          {res.description.length > 50
                            ? res.description.substring(0, 50) + "..."
                            : res.description}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>

                {/* Resource Kind */}
                <td>
                  <span style={{ textTransform: "uppercase", fontSize: "11.5px", fontWeight: "700", color: "var(--text-secondary, #4B5563)" }}>
                    {res.resourceType?.replace("_", " ")}
                  </span>
                </td>

                {/* Tier */}
                <td>{getTierBadge(res.accessTier)}</td>

                {/* Size */}
                <td style={{ fontSize: "12.5px", color: "var(--text-secondary, #4B5563)" }}>
                  {formatBytes(res.fileSize)}
                </td>

                {/* Published / Draft status */}
                <td>
                  <span className={`badge-status ${res.isPublished ? "published" : "draft"}`}>
                    {res.isPublished ? (
                      <>
                        <CheckCircle size={11} /> Published
                      </>
                    ) : (
                      <>
                        <Clock size={11} /> Draft
                      </>
                    )}
                  </span>
                </td>

                {/* Updated Date */}
                <td style={{ fontSize: "12px", color: "var(--text-muted, #6B7280)" }}>
                  {formatDate(res.updatedAt || res.createdAt)}
                </td>

                {/* Actions */}
                <td>
                  <div className="action-buttons-cell">
                    {/* View / Preview */}
                    <button
                      type="button"
                      className="action-icon-btn"
                      title="Preview Study Material"
                      onClick={() => onPreviewResource(res)}
                    >
                      <Eye size={15} />
                    </button>

                    {/* Download (if file and downloadable) */}
                    {isFile && (
                      <button
                        type="button"
                        className="action-icon-btn"
                        title={isDownloadable ? "Download Asset" : "Downloading restricted"}
                        disabled={!isDownloadable}
                        onClick={() => onDownloadResource(res)}
                        style={{ opacity: isDownloadable ? 1 : 0.4 }}
                      >
                        <Download size={15} />
                      </button>
                    )}

                    {canManageResources && (
                      <>
                        {/* Edit metadata */}
                        <button
                          type="button"
                          className="action-icon-btn"
                          title="Edit Details"
                          onClick={() => onEditResource(res)}
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Move resource */}
                        <button
                          type="button"
                          className="action-icon-btn"
                          title="Move to Folder"
                          onClick={() => onMoveResource(res)}
                        >
                          <Move size={14} />
                        </button>

                        {/* Soft Archive */}
                        <button
                          type="button"
                          className="action-icon-btn danger"
                          title="Archive Resource"
                          onClick={() => onArchiveResource(res)}
                        >
                          <Trash2 size={14} />
                        </button>

                        {/* Super Admin Permanent Purge */}
                        {isSuperAdmin && (
                          <button
                            type="button"
                            className="action-icon-btn danger"
                            title="Super Admin Permanent Purge"
                            onClick={() => onPurgeResource(res)}
                            style={{ borderColor: "#FCA5A5", color: "#DC2626" }}
                          >
                            <ShieldAlert size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
