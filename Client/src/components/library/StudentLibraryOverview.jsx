import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Folder as FolderIcon,
  Search,
  BookOpen,
  Layers,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Shield,
  X,
  FileText,
  Lock,
  Eye,
  RefreshCw,
  ExternalLink,
  ArrowRight
} from "lucide-react";

export default function StudentLibraryOverview({
  globalTree = [],
  examTrees = [],
  enrolledExams = [],
  loading = false,
  onSelectFolder,
  onSelectExam,
  onOpenResource,
  onLockedClick
}) {
  const navigate = useNavigate();
  const [scopeFilter, setScopeFilter] = useState("all"); // "all", "global", "exam_specific"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Debounced server search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/library/search?q=${encodeURIComponent(searchQuery.trim())}&scope=${scopeFilter}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error("Library search failed:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, scopeFilter]);

  // Aggregate counts
  const totalGlobalFolders = globalTree.length;
  const totalExamTrees = examTrees.length;
  const totalEnrolledExams = enrolledExams.length;

  return (
    <div>
      {/* ── Hero Header ── */}
      <div className="sl-hero-header">
        <div className="sl-hero-title-row">
          <div>
            <h1 className="sl-hero-title">
              <BookOpen size={28} color="#8B5CF6" />
              <span>Study Library</span>
            </h1>
            <p className="sl-hero-subtitle">
              Browse syllabus-aligned study notes, downloadable reference materials, and exam prep bundles.
            </p>
          </div>

          <div className="sl-stats-bar">
            <div className="sl-stat-chip">
              <Layers size={14} color="#8B5CF6" />
              <span>{totalGlobalFolders} Global Subjects</span>
            </div>
            <div className="sl-stat-chip">
              <GraduationCap size={14} color="#10B981" />
              <span>{totalEnrolledExams} Enrolled Exams</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="sl-search-box">
          <Search size={18} className="sl-search-icon-left" />
          <input
            type="text"
            className="sl-search-input"
            placeholder="Search study materials, notes, PDFs, or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="sl-search-clear-btn"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Scope Filter Tabs ── */}
      <div className="sl-scope-tabs">
        <button
          className={`sl-scope-btn ${scopeFilter === "all" ? "active" : ""}`}
          onClick={() => setScopeFilter("all")}
        >
          <Layers size={15} />
          <span>All Library</span>
        </button>
        <button
          className={`sl-scope-btn ${scopeFilter === "global" ? "active" : ""}`}
          onClick={() => setScopeFilter("global")}
        >
          <BookOpen size={15} />
          <span>Global Materials</span>
        </button>
        <button
          className={`sl-scope-btn ${scopeFilter === "exam_specific" ? "active" : ""}`}
          onClick={() => setScopeFilter("exam_specific")}
        >
          <GraduationCap size={15} />
          <span>My Exam Materials</span>
        </button>
      </div>

      {/* ── Loading State ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <RefreshCw size={36} className="animate-spin" style={{ color: "#8B5CF6", margin: "0 auto 16px auto" }} />
          <h4 style={{ margin: "0 0 6px 0", fontSize: "17px", fontWeight: "700" }}>Loading Study Library...</h4>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
            Synchronizing global resources and enrolled exam packages
          </p>
        </div>
      ) : searchResults ? (
        /* ── Search Results View ── */
        <div>
          <div className="sl-section-header">
            <h3 className="sl-section-title">
              <Search size={18} color="#8B5CF6" />
              <span>
                Search Results for "{searchQuery}"
                {searchLoading && <RefreshCw size={14} className="animate-spin" style={{ marginLeft: "8px" }} />}
              </span>
            </h3>
            <button
              style={{ background: "transparent", border: "none", color: "#8B5CF6", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          </div>

          {/* Matched Folders */}
          {searchResults.folders?.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-secondary)", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Matching Folders ({searchResults.folders.length})
              </h4>
              <div className="sl-folders-grid">
                {searchResults.folders.map((f) => (
                  <div
                    key={f._id}
                    className="sl-folder-card"
                    onClick={() => {
                      setSearchQuery("");
                      onSelectFolder(f._id);
                    }}
                  >
                    <div className="sl-folder-card-top">
                      <div
                        className="sl-folder-icon-pill"
                        style={{
                          backgroundColor: f.color ? `${f.color}20` : "rgba(139, 92, 246, 0.12)",
                          color: f.color || "#8B5CF6"
                        }}
                      >
                        <FolderIcon size={20} fill={f.color || "#8B5CF6"} />
                      </div>
                      <span className={`sl-tier-badge ${f.scope === "global" ? "tier-free" : "tier-enrolled"}`}>
                        {f.scope === "global" ? "Global" : "Exam"}
                      </span>
                    </div>
                    <div>
                      <h4 className="sl-folder-name">{f.name}</h4>
                      {f.description && <p className="sl-folder-desc">{f.description}</p>}
                    </div>
                    <div className="sl-folder-card-footer">
                      <span>Browse Folder</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Resources */}
          {searchResults.resources?.length > 0 ? (
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-secondary)", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Matching Materials ({searchResults.resources.length})
              </h4>
              <div className="sl-resources-grid">
                {searchResults.resources.map((res) => {
                  const isLocked = !res.isUnlocked;

                  return (
                    <div key={res._id} className={`sl-resource-card ${isLocked ? "locked-card" : ""}`}>
                      <div className="sl-resource-top">
                        <div className={`sl-resource-icon-wrap type-${res.resourceType || "pdf"}`}>
                          <FileText size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 className="sl-resource-title" title={res.title}>{res.title}</h4>
                          {res.description && <p className="sl-resource-desc">{res.description}</p>}
                        </div>
                      </div>

                      <div className="sl-resource-meta-row">
                        <span className={`sl-tier-badge tier-${res.accessTier === "free" ? "free" : res.accessTier === "premium_subscriber" ? "premium" : "enrolled"}`}>
                          {res.accessTier === "free" ? "Free" : res.accessTier === "premium_subscriber" ? "Premium" : "Enrolled"}
                        </span>
                        {res.folder?.name && (
                          <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                            in {res.folder.name}
                          </span>
                        )}
                      </div>

                      <div className="sl-resource-actions">
                        {isLocked ? (
                          <button className="sl-btn-locked" onClick={() => onLockedClick(res)}>
                            <Lock size={14} />
                            <span>Unlock Access</span>
                          </button>
                        ) : (
                          <button className="sl-btn-view" onClick={() => onOpenResource(res)}>
                            <Eye size={14} />
                            <span>View Resource</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : searchResults.folders?.length === 0 ? (
            <div className="sl-empty-state">
              <div className="sl-empty-icon">
                <Search size={28} />
              </div>
              <h4 className="sl-empty-title">No Matching Results</h4>
              <p className="sl-empty-desc">
                We couldn't find any study materials or folders matching "{searchQuery}". Try different keywords.
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        /* ── Standard Library Home View ── */
        <>
          {/* 1. Global Library Section */}
          {(scopeFilter === "all" || scopeFilter === "global") && (
            <div style={{ marginBottom: "36px" }}>
              <div className="sl-section-header">
                <h3 className="sl-section-title">
                  <BookOpen size={20} color="#8B5CF6" />
                  <span>Global Study Library</span>
                </h3>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Available to all students
                </span>
              </div>

              {globalTree.length === 0 ? (
                <div className="sl-empty-state">
                  <div className="sl-empty-icon">
                    <BookOpen size={28} />
                  </div>
                  <h4 className="sl-empty-title">No Global Materials</h4>
                  <p className="sl-empty-desc">
                    Global study notes and materials will appear here once published by administrators.
                  </p>
                </div>
              ) : (
                <div className="sl-folders-grid">
                  {globalTree.map((folder) => (
                    <div
                      key={folder._id}
                      className="sl-folder-card"
                      onClick={() => onSelectFolder(folder._id)}
                    >
                      <div className="sl-folder-card-top">
                        <div
                          className="sl-folder-icon-pill"
                          style={{
                            backgroundColor: folder.color ? `${folder.color}20` : "rgba(139, 92, 246, 0.12)",
                            color: folder.color || "#8B5CF6"
                          }}
                        >
                          <FolderIcon size={22} fill={folder.color || "#8B5CF6"} />
                        </div>
                        <span className="sl-tier-badge tier-free">Global</span>
                      </div>

                      <div>
                        <h4 className="sl-folder-name">{folder.name}</h4>
                        <p className="sl-folder-desc">
                          {folder.description || "General study materials, notes, and revision summaries."}
                        </p>
                      </div>

                      <div className="sl-folder-card-footer">
                        <span>Browse Folder</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. My Exam Materials Section */}
          {(scopeFilter === "all" || scopeFilter === "exam_specific") && (
            <div style={{ marginBottom: "36px" }}>
              <div className="sl-section-header">
                <h3 className="sl-section-title">
                  <GraduationCap size={20} color="#10B981" />
                  <span>My Exam Materials</span>
                </h3>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Curated for your enrolled exams
                </span>
              </div>

              {enrolledExams.length === 0 ? (
                <div className="sl-empty-state" style={{ padding: "40px 20px" }}>
                  <div className="sl-empty-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }}>
                    <GraduationCap size={32} />
                  </div>
                  <h4 className="sl-empty-title">No Enrolled Exam Series</h4>
                  <p className="sl-empty-desc">
                    You have not enrolled in any Exam Series yet. Enroll in target exams (e.g. UPTET, SSC, Banking) to access exam-specific study libraries and test bundles.
                  </p>
                  <button
                    className="sl-btn-upgrade"
                    style={{ maxWidth: "220px", margin: "20px auto 0 auto" }}
                    onClick={() => navigate("/dashboard/exams")}
                  >
                    <span>Browse Exam Series</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="sl-exams-grid">
                  {enrolledExams.map((exam) => {
                    // Check if exam has folders in examTrees
                    const matchingTree = examTrees.find(
                      (t) => t.examSeriesId?.toString() === exam._id.toString()
                    );
                    const rootFolders = matchingTree?.tree || [];
                    const folderCount = rootFolders.length;

                    return (
                      <div
                        key={exam._id}
                        className="sl-exam-card"
                        onClick={() => {
                          if (folderCount === 1) {
                            // If exactly one root folder, jump directly into it
                            onSelectFolder(rootFolders[0]._id);
                          } else {
                            onSelectExam(exam._id);
                          }
                        }}
                      >
                        <div>
                          <div className="sl-exam-badge-row">
                            <span className="sl-enrolled-badge">
                              <Shield size={12} />
                              <span>Enrolled</span>
                            </span>
                            {exam.category && (
                              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>
                                {exam.category}
                              </span>
                            )}
                          </div>

                          <h4 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: "12px 0 6px 0", lineHeight: "1.3" }}>
                            {exam.title}
                          </h4>

                          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.45" }}>
                            {exam.description || "Comprehensive syllabus notes and mock study materials."}
                          </p>
                        </div>

                        <div className="sl-folder-card-footer">
                          <span>
                            {folderCount > 0
                              ? `${folderCount} ${folderCount === 1 ? "Study Folder" : "Study Folders"}`
                              : "Explore Materials"}
                          </span>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
