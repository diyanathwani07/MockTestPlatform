import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Folder as FolderIcon,
  ChevronRight,
  ArrowLeft,
  Search,
  FileText,
  BookOpen,
  Image as ImageIcon,
  Link as LinkIcon,
  Download,
  Lock,
  Eye,
  RefreshCw,
  AlertCircle,
  Shield,
  Layers,
  Sparkles
} from "lucide-react";

export default function StudentFolderView({
  folderId,
  onNavigateFolder,
  onBackToLibrary,
  onOpenResource,
  onLockedClick
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  useEffect(() => {
    if (!folderId) return;

    let isMounted = true;
    const fetchFolder = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/library/folders/${folderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (isMounted) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load folder details:", err);
        if (isMounted) {
          setError(
            err.response?.data?.message ||
            "Unable to access this folder. It may have been archived or requires exam enrollment."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFolder();

    return () => {
      isMounted = false;
    };
  }, [folderId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: "#8B5CF6", margin: "0 auto 16px auto" }} />
        <h4 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: "700" }}>Loading Folder Contents...</h4>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
          Retrieving study materials and permissions
        </p>
      </div>
    );
  }

  if (error || !data?.folder) {
    return (
      <div className="sl-empty-state">
        <div className="sl-empty-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" }}>
          <AlertCircle size={32} />
        </div>
        <h3 className="sl-empty-title">Folder Unavailable</h3>
        <p className="sl-empty-desc">{error || "The requested folder could not be found."}</p>
        <button
          className="sl-btn-upgrade"
          style={{ maxWidth: "200px", margin: "20px auto 0 auto" }}
          onClick={onBackToLibrary}
        >
          <ArrowLeft size={16} />
          <span>Return to Library</span>
        </button>
      </div>
    );
  }

  const { folder, breadcrumbs = [], children = [], resources = [] } = data;

  // Filter resources locally for fast client reactivity
  const filteredResources = resources.filter((res) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = res.title?.toLowerCase().includes(q);
      const matchDesc = res.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    // Type Filter
    if (typeFilter !== "all" && res.resourceType !== typeFilter) {
      return false;
    }
    // Tier Filter
    if (tierFilter !== "all" && res.accessTier !== tierFilter) {
      return false;
    }
    return true;
  });

  return (
    <div>
      {/* ── Breadcrumbs Navigation ── */}
      <nav className="sl-breadcrumb-nav" aria-label="Breadcrumb">
        <button className="sl-breadcrumb-link" onClick={onBackToLibrary}>
          <Layers size={14} />
          <span>Study Library</span>
        </button>

        {breadcrumbs.map((crumb) => {
          const isCurrent = crumb._id.toString() === folder._id.toString();
          return (
            <React.Fragment key={crumb._id}>
              <span className="sl-breadcrumb-separator">/</span>
              {isCurrent ? (
                <span className="sl-breadcrumb-current">{crumb.name}</span>
              ) : (
                <button
                  className="sl-breadcrumb-link"
                  onClick={() => onNavigateFolder(crumb._id)}
                >
                  {crumb.name}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Current Folder Banner ── */}
      <div className="sl-folder-banner">
        <div className="sl-folder-banner-left">
          <button
            onClick={onBackToLibrary}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "transparent",
              border: "1px solid var(--border-color, #E2E8F0)",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div
            className="sl-folder-icon-pill"
            style={{
              backgroundColor: folder.color ? `${folder.color}20` : "rgba(139, 92, 246, 0.15)",
              color: folder.color || "#8B5CF6"
            }}
          >
            <FolderIcon size={22} fill={folder.color || "#8B5CF6"} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>{folder.name}</h2>
              <span className={`sl-tier-badge ${folder.scope === "global" ? "tier-free" : "tier-enrolled"}`}>
                {folder.scope === "global" ? "Global Library" : "Exam Specific"}
              </span>
            </div>
            {folder.description && (
              <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "var(--text-secondary)" }}>
                {folder.description}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "13px", color: "var(--text-secondary)" }}>
          <span>{children.length} {children.length === 1 ? "Folder" : "Folders"}</span>
          <span>•</span>
          <span>{resources.length} {resources.length === 1 ? "Material" : "Materials"}</span>
        </div>
      </div>

      {/* ── Subfolders Grid (Unlimited Nesting) ── */}
      {children.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div className="sl-section-header">
            <h3 className="sl-section-title">
              <FolderIcon size={18} color="#8B5CF6" />
              <span>Subfolders</span>
            </h3>
          </div>
          <div className="sl-folders-grid">
            {children.map((child) => (
              <div
                key={child._id}
                className="sl-folder-card"
                onClick={() => onNavigateFolder(child._id)}
              >
                <div className="sl-folder-card-top">
                  <div
                    className="sl-folder-icon-pill"
                    style={{
                      backgroundColor: child.color ? `${child.color}20` : "rgba(139, 92, 246, 0.12)",
                      color: child.color || "#8B5CF6"
                    }}
                  >
                    <FolderIcon size={20} fill={child.color || "#8B5CF6"} />
                  </div>
                  <ChevronRight size={18} color="#94A3B8" />
                </div>
                <div>
                  <h4 className="sl-folder-name">{child.name}</h4>
                  {child.description && <p className="sl-folder-desc">{child.description}</p>}
                </div>
                <div className="sl-folder-card-footer">
                  <span>Open Folder</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ── */}
      <div className="sl-filter-bar">
        <div className="sl-chips-group">
          {/* Resource Type Filters */}
          <button
            className={`sl-filter-chip ${typeFilter === "all" ? "active" : ""}`}
            onClick={() => setTypeFilter("all")}
          >
            All Types
          </button>
          <button
            className={`sl-filter-chip ${typeFilter === "pdf" ? "active" : ""}`}
            onClick={() => setTypeFilter("pdf")}
          >
            <FileText size={13} /> PDFs
          </button>
          <button
            className={`sl-filter-chip ${typeFilter === "note" ? "active" : ""}`}
            onClick={() => setTypeFilter("note")}
          >
            <BookOpen size={13} /> Notes
          </button>
          <button
            className={`sl-filter-chip ${typeFilter === "image" ? "active" : ""}`}
            onClick={() => setTypeFilter("image")}
          >
            <ImageIcon size={13} /> Images
          </button>
          <button
            className={`sl-filter-chip ${typeFilter === "link" ? "active" : ""}`}
            onClick={() => setTypeFilter("link")}
          >
            <LinkIcon size={13} /> Links
          </button>
          <button
            className={`sl-filter-chip ${typeFilter === "docx" ? "active" : ""}`}
            onClick={() => setTypeFilter("docx")}
          >
            <FileText size={13} /> Word
          </button>
        </div>

        {/* Access Tier Filters */}
        <div className="sl-chips-group">
          <button
            className={`sl-filter-chip ${tierFilter === "all" ? "active" : ""}`}
            onClick={() => setTierFilter("all")}
          >
            All Tiers
          </button>
          <button
            className={`sl-filter-chip ${tierFilter === "free" ? "active" : ""}`}
            onClick={() => setTierFilter("free")}
          >
            Free
          </button>
          <button
            className={`sl-filter-chip ${tierFilter === "premium_subscriber" ? "active" : ""}`}
            onClick={() => setTierFilter("premium_subscriber")}
          >
            <Sparkles size={12} /> Premium
          </button>
        </div>
      </div>

      {/* ── Study Resources Section ── */}
      <div>
        <div className="sl-section-header">
          <h3 className="sl-section-title">
            <BookOpen size={18} color="#8B5CF6" />
            <span>Study Materials ({filteredResources.length})</span>
          </h3>
        </div>

        {filteredResources.length === 0 ? (
          <div className="sl-empty-state">
            <div className="sl-empty-icon">
              <BookOpen size={28} />
            </div>
            <h4 className="sl-empty-title">No Resources Available</h4>
            <p className="sl-empty-desc">
              {searchQuery || typeFilter !== "all" || tierFilter !== "all"
                ? "No study materials match your selected filters."
                : "No study materials have been uploaded to this folder yet."}
            </p>
          </div>
        ) : (
          <div className="sl-resources-grid">
            {filteredResources.map((res) => {
              const isLocked = !res.isUnlocked;

              return (
                <div
                  key={res._id}
                  className={`sl-resource-card ${isLocked ? "locked-card" : ""}`}
                >
                  <div className="sl-resource-top">
                    <div className={`sl-resource-icon-wrap type-${res.resourceType || "pdf"}`}>
                      {res.resourceType === "pdf" && <FileText size={20} />}
                      {res.resourceType === "note" && <BookOpen size={20} />}
                      {res.resourceType === "image" && <ImageIcon size={20} />}
                      {res.resourceType === "link" && <LinkIcon size={20} />}
                      {res.resourceType === "docx" && <FileText size={20} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 className="sl-resource-title" title={res.title}>
                        {res.title}
                      </h4>
                      {res.description && (
                        <p className="sl-resource-desc">{res.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="sl-resource-meta-row">
                    <div>
                      {res.accessTier === "free" && (
                        <span className="sl-tier-badge tier-free">Free</span>
                      )}
                      {res.accessTier === "premium_subscriber" && (
                        <span className="sl-tier-badge tier-premium">
                          <Sparkles size={10} /> Premium
                        </span>
                      )}
                      {res.accessTier === "exam_enrolled" && (
                        <span className="sl-tier-badge tier-enrolled">
                          <Shield size={10} /> Enrolled
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {res.fileSize > 0 && (
                        <span>{(res.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                      )}
                      {res.isDownloadable === false && (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>• Online View Only</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="sl-resource-actions">
                    {isLocked ? (
                      <button
                        className="sl-btn-locked"
                        onClick={() => onLockedClick(res)}
                      >
                        <Lock size={14} />
                        <span>Unlock Access</span>
                      </button>
                    ) : (
                      <>
                        <button
                          className="sl-btn-view"
                          onClick={() => onOpenResource(res)}
                        >
                          <Eye size={14} />
                          <span>{res.resourceType === "note" ? "Read Note" : res.resourceType === "link" ? "Open Link" : "View"}</span>
                        </button>

                        {res.isDownloadable !== false && res.resourceType !== "link" && res.resourceType !== "note" && (
                          <button
                            className="sl-btn-download-icon"
                            title="Download Material"
                            onClick={() => onOpenResource(res)}
                          >
                            <Download size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
