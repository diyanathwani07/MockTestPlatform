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
      className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 rounded-2xl shadow-xs border"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      {/* Left: Search & Filter */}
      <div className="flex items-center gap-2 flex-1 min-w-[280px]">
        {/* Search Input Box */}
        <div
          className="flex items-center gap-2 px-3 h-[38px] rounded-xl flex-1 max-w-sm border transition-all"
          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-color)" }}
        >
          <Search size={15} style={{ color: "var(--text-muted)" }} className="shrink-0" />
          <input
            type="text"
            placeholder={isGlobalSearch ? "Search all quizzes & folders everywhere..." : "Search folders & quizzes in this directory..."}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ color: "var(--text-primary)" }}
            className="w-full bg-transparent border-none text-xs focus:outline-none p-0"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              style={{ color: "var(--text-muted)" }}
              className="hover:opacity-75 bg-transparent border-none p-0 cursor-pointer"
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
            backgroundColor: isGlobalSearch ? "var(--primary, #6E3FF3)" : "var(--bg-input)",
            color: isGlobalSearch ? "#ffffff" : "var(--text-secondary)",
            borderColor: isGlobalSearch ? "var(--primary, #6E3FF3)" : "var(--border-color)"
          }}
          className="flex items-center gap-1.5 px-3 h-[38px] rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0"
          title={isGlobalSearch ? "Searching everywhere across all subfolders" : "Searching only inside this folder. Click to search everywhere"}
        >
          <Globe size={13} className={isGlobalSearch ? "animate-pulse" : ""} style={{ color: isGlobalSearch ? "#ffffff" : "var(--text-muted)" }} />
          <span>{isGlobalSearch ? "Everywhere" : "In Folder"}</span>
        </button>

        {/* Status Filter */}
        <div
          className="flex items-center gap-1.5 px-3 h-[38px] rounded-xl text-xs border shrink-0"
          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
        >
          <Filter size={13} style={{ color: "var(--text-muted)" }} className="shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            style={{ backgroundColor: "transparent", color: "var(--text-primary)" }}
            className="border-none text-xs font-semibold focus:outline-none cursor-pointer p-0"
          >
            <option style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }} value="all">All Status</option>
            <option style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }} value="published">Published</option>
            <option style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }} value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {/* Right: View Toggles & Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Save Order Button (AppX Reshuffle) */}
        {hasPendingSort && (
          <button
            type="button"
            onClick={onSaveSort}
            disabled={isSavingSort}
            className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm border-none cursor-pointer transition-all animate-pulse shrink-0"
          >
            <Save size={14} />
            <span>{isSavingSort ? "Saving Order..." : "Save Order"}</span>
          </button>
        )}

        {/* View Mode Switcher (List vs Grid) */}
        <div
          className="flex items-center p-0.5 h-[38px] rounded-xl border shrink-0"
          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-color)" }}
        >
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            style={{
              backgroundColor: viewMode === "list" ? "var(--bg-card)" : "transparent",
              color: viewMode === "list" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: viewMode === "list" ? "0 1px 3px rgba(0,0,0,0.15)" : "none"
            }}
            className="h-[32px] px-2.5 rounded-lg border-none cursor-pointer transition-all flex items-center justify-center font-bold"
            title="List View (Table)"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            style={{
              backgroundColor: viewMode === "grid" ? "var(--bg-card)" : "transparent",
              color: viewMode === "grid" ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.15)" : "none"
            }}
            className="h-[32px] px-2.5 rounded-lg border-none cursor-pointer transition-all flex items-center justify-center font-bold"
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
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            className="inline-flex items-center gap-1.5 px-3 h-[38px] rounded-xl text-xs font-semibold hover:text-red-500 border transition-colors cursor-pointer shrink-0"
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
            style={{ backgroundColor: "rgba(110, 63, 243, 0.15)", color: "#c4b5fd", borderColor: "rgba(110, 63, 243, 0.4)" }}
            className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-xl text-xs font-bold border cursor-pointer transition-colors hover:opacity-90 shrink-0"
          >
            <Sparkles size={14} className="text-purple-400" />
            <span>Course Builder</span>
          </button>
        )}

        {/* Create Folder Button (Triggers Right Sidebar Drawer) */}
        <button
          type="button"
          onClick={onCreateFolder}
          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
          className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-xl text-xs font-bold border cursor-pointer transition-colors hover:opacity-85 shrink-0"
          title="Create New Folder in Right Sidebar"
        >
          <FolderPlus size={15} className="text-amber-500" />
          <span>New Folder</span>
        </button>

        {/* Create Quiz Button */}
        <button
          type="button"
          onClick={onCreateQuiz}
          style={{ backgroundColor: "#6E3FF3", color: "#ffffff" }}
          className="btn-prepmark-primary inline-flex items-center gap-1.5 px-4 h-[38px] rounded-xl text-xs font-bold transition-all border-none cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Create Quiz</span>
        </button>
      </div>
    </div>
  );
}
