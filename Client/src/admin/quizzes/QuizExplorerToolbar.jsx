import React from "react";
import { Search, LayoutGrid, List, FolderPlus, Plus, Filter, Save, X, Sparkles, Globe, Trash2 } from "lucide-react";

export default function QuizExplorerToolbar({
  searchTerm = "",
  onSearchChange,
  isGlobalSearch = false,
  onToggleGlobalSearch,
  statusFilter = "all",
  onStatusFilterChange,
  viewMode = "grid", // "grid" | "list"
  onViewModeChange,
  onCreateFolder,
  onCreateCourse,
  onCreateQuiz,
  onOpenRecycleBin,
  hasPendingSort = false,
  onSaveSort,
  isSavingSort = false
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "16px",
        padding: "12px 16px",
        borderRadius: "16px",
        border: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-card)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.03)"
      }}
    >
      {/* Left: Search & Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 300px", minWidth: "260px" }}>
        {/* Search Input Box */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 12px",
            height: "38px",
            borderRadius: "10px",
            flex: "1 1 auto",
            maxWidth: "360px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-input)"
          }}
        >
          <Search size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder={isGlobalSearch ? "Search all quizzes & folders everywhere..." : "Search folders & quizzes in this directory..."}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              fontSize: "12.5px",
              color: "var(--text-primary)",
              padding: 0
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              style={{ color: "var(--text-muted)", backgroundColor: "transparent", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Deep Global Search Toggle (Everywhere vs Current Folder) */}
        <button
          type="button"
          onClick={() => onToggleGlobalSearch && onToggleGlobalSearch(!isGlobalSearch)}
          style={{
            height: "38px",
            padding: "0 12px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: "600",
            border: isGlobalSearch ? "1px solid #6E3FF3" : "1px solid var(--border-color)",
            backgroundColor: isGlobalSearch ? "#6E3FF3" : "var(--bg-input)",
            color: isGlobalSearch ? "#ffffff" : "var(--text-secondary)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0,
            transition: "all 0.15s ease"
          }}
          title={isGlobalSearch ? "Searching everywhere across all subfolders" : "Searching only inside this folder. Click to search everywhere"}
        >
          <Globe size={13} className={isGlobalSearch ? "animate-pulse" : ""} style={{ color: isGlobalSearch ? "#ffffff" : "var(--text-muted)" }} />
          <span>{isGlobalSearch ? "Everywhere" : "In Folder"}</span>
        </button>

        {/* Status Filter */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            height: "38px",
            padding: "0 12px",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-input)",
            color: "var(--text-secondary)",
            fontSize: "12px",
            flexShrink: 0
          }}
        >
          <Filter size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            style={{
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              border: "none",
              outline: "none",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              padding: 0
            }}
          >
            <option style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }} value="all">All Status</option>
            <option style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }} value="published">Published</option>
            <option style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }} value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Right: View Toggles & Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {/* Save Order Button (AppX Reshuffle) */}
        {hasPendingSort && (
          <button
            type="button"
            onClick={onSaveSort}
            disabled={isSavingSort}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "38px",
              padding: "0 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "700",
              backgroundColor: "#f59e0b",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            <Save size={14} />
            <span>{isSavingSort ? "Saving Order..." : "Save Order"}</span>
          </button>
        )}

        {/* View Mode Switcher (List vs Grid) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "2px",
            height: "38px",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-input)",
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            style={{
              height: "32px",
              padding: "0 10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: viewMode === "list" ? "var(--bg-card)" : "transparent",
              color: viewMode === "list" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease"
            }}
            title="List View (Table)"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            style={{
              height: "32px",
              padding: "0 10px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: viewMode === "grid" ? "var(--bg-card)" : "transparent",
              color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease"
            }}
            title="Grid View (Cards)"
          >
            <LayoutGrid size={15} />
          </button>
        </div>

        {/* Recycle Bin Quick Drawer */}
        {onOpenRecycleBin && (
          <button
            type="button"
            onClick={onOpenRecycleBin}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "38px",
              padding: "0 12px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "600",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s ease"
            }}
            title="Open Recycle Bin"
          >
            <Trash2 size={13} style={{ color: "var(--text-muted)" }} />
            <span>Recycle Bin</span>
          </button>
        )}

        {/* Create Course / Bundle Button (AppX Master Course Editor) */}
        {onCreateCourse && (
          <button
            type="button"
            onClick={onCreateCourse}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "38px",
              padding: "0 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "700",
              border: "1px solid rgba(110, 63, 243, 0.3)",
              backgroundColor: "rgba(110, 63, 243, 0.12)",
              color: "#6E3FF3",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s ease"
            }}
          >
            <Sparkles size={14} style={{ color: "#6E3FF3" }} />
            <span>Course Builder</span>
          </button>
        )}

        {/* Create Folder Button (Triggers Right Sidebar Drawer) */}
        <button
          type="button"
          onClick={onCreateFolder}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            height: "38px",
            padding: "0 14px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: "700",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            backgroundColor: "rgba(245, 158, 11, 0.12)",
            color: "#d97706",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.15s ease"
          }}
          title="Create New Folder in Right Sidebar"
        >
          <FolderPlus size={15} style={{ color: "#d97706" }} />
          <span>New Folder</span>
        </button>

        {/* Create Quiz Button */}
        <button
          type="button"
          onClick={onCreateQuiz}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            height: "38px",
            padding: "0 16px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: "700",
            border: "none",
            backgroundColor: "#6E3FF3",
            color: "#ffffff",
            cursor: "pointer",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(110, 63, 243, 0.3)",
            transition: "all 0.15s ease"
          }}
        >
          <Plus size={15} />
          <span>Create Quiz</span>
        </button>
      </div>
    </div>
  );
}
