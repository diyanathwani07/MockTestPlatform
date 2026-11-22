import React, { useState } from "react";
import { Folder, MoreVertical, Edit2, FolderInput, Trash2, Layers, CheckCircle2, EyeOff, Copy, BarChart3, Download } from "lucide-react";

export default function QuizFolderGrid({
  folders = [],
  onNavigateFolder,
  onEditFolder,
  onMoveFolder,
  onDeleteFolder,
  onTogglePublish,
  onCloneFolder,
  onViewAnalytics,
  onExportFolder
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  if (!folders || folders.length === 0) return null;

  return (
    <div className="mb-6">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <Layers size={16} style={{ color: "#f59e0b" }} />
        <h3 style={{ margin: 0, fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-primary)" }}>
          Folders & Directories
        </h3>
        <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          {folders.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {folders.map((folder) => {
          const isMenuOpen = activeMenuId === folder._id;

          return (
            <div
              key={folder._id}
              onClick={() => onNavigateFolder(folder._id)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("application/json", JSON.stringify({ id: folder._id, type: "folder" }));
              }}
              className="group relative rounded-2xl overflow-hidden border hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer flex flex-col active:opacity-80"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)"
              }}
            >
              {/* Thumbnail / Header Banner */}
              <div
                className="h-28 w-full relative overflow-hidden flex items-center justify-center border-b"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-color)"
                }}
              >
                {folder.thumbnail ? (
                  <img
                    src={folder.thumbnail}
                    alt={folder.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl shadow-xs flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform border"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
                  >
                    <Folder size={24} />
                  </div>
                )}

                {/* 3-Dot Action Menu Button */}
                <div
                  className="absolute top-2.5 right-2.5 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setActiveMenuId(isMenuOpen ? null : folder._id)}
                    className="w-7 h-7 rounded-lg border shadow-xs flex items-center justify-center transition-colors cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-secondary)"
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div 
                      className="absolute right-0 mt-1 w-36 rounded-xl shadow-xl border py-1 z-20 animate-fadeIn"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border-color)"
                      }}
                      onMouseLeave={() => setActiveMenuId(null)}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onEditFolder(folder);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onMoveFolder(folder._id);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <FolderInput size={13} />
                        <span>Move</span>
                      </button>
                      {onCloneFolder && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onCloneFolder(folder);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <Copy size={13} className="text-primary" />
                          <span>Clone Tree</span>
                        </button>
                      )}
                      {onViewAnalytics && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onViewAnalytics(folder);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <BarChart3 size={13} className="text-blue-500" />
                          <span>Analytics</span>
                        </button>
                      )}
                      {onExportFolder && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onExportFolder(folder);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                          style={{ color: "var(--text-primary)" }}
                        >
                          <Download size={13} style={{ color: "var(--text-muted)" }} />
                          <span>Export JSON</span>
                        </button>
                      )}
                      {onTogglePublish && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onTogglePublish(folder._id, !(folder.isPublished !== false));
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {folder.isPublished !== false ? (
                            <EyeOff size={13} className="text-amber-500" />
                          ) : (
                            <CheckCircle2 size={13} className="text-emerald-500" />
                          )}
                          <span>{folder.isPublished !== false ? "Unpublish" : "Publish"}</span>
                        </button>
                      )}
                      <div className="h-px my-1" style={{ backgroundColor: "var(--border-color)" }} />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onDeleteFolder(folder);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Folder Details */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4
                    className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-1 m-0 mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {folder.title}
                  </h4>
                  {folder.description ? (
                    <p
                      className="text-xs line-clamp-1 m-0 mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {folder.description}
                    </p>
                  ) : null}
                </div>

                <div
                  className="flex items-center justify-between pt-2 text-xs border-t mt-1"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                    style={{
                      backgroundColor: "var(--bg-input)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    Folder
                  </span>
                  <span className="font-medium text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {folder.quizCount || 0} quiz{folder.quizCount !== 1 ? "zes" : ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
