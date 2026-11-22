import React, { useState } from "react";
import {
  Folder,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Edit3,
  FolderInput,
  Copy,
  Trash2,
  GripVertical,
  CheckCircle2,
  EyeOff,
  X,
  BarChart3,
  Download
} from "lucide-react";

export default function QuizTableView({
  folders = [],
  quizzes = [],
  currentFolderName = "Home",
  onNavigateFolder,
  onEditFolder,
  onMoveFolder,
  onDeleteFolder,
  onEditQuiz,
  onManageQuestions,
  onMoveQuiz,
  onDuplicateQuiz,
  onDeleteQuiz,
  onSortChange,
  onReorderItems,
  onBulkMove,
  onBulkPublish,
  onBulkUnpublish,
  onBulkDelete,
  onCloneFolder,
  onViewAnalytics,
  onExportFolder,
  isSavingSort = false
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Combine items for unified S.No & Sort By table
  const allItems = [
    ...folders.map((f) => ({ ...f, itemType: "folder" })),
    ...quizzes.map((q) => ({ ...q, itemType: "quiz" }))
  ];

  if (allItems.length === 0) {
    return (
      <div
        className="rounded-2xl border p-12 text-center"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <Folder size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm font-semibold m-0" style={{ color: "var(--text-primary)" }}>No folders or quizzes in this directory</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Use the buttons above to create folders or quizzes</p>
      </div>
    );
  }

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === allItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItems.map((item) => item._id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Drag and drop handlers
  const handleDragStart = (e, index, item) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (item) {
      e.dataTransfer.setData("application/json", JSON.stringify({ id: item._id, type: item.itemType }));
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder array
    const updated = [...allItems];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);

    // Call reorder with recalculating sortOrder
    if (onReorderItems) {
      onReorderItems(updated);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div className="relative">
      <div
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className="border-b font-bold uppercase tracking-wider text-[11px]"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-secondary)"
                }}
              >
                {/* Drag Handle & Checkbox */}
                <th className="py-3.5 px-3 w-16 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selectedCount > 0 && selectedCount === allItems.length}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                      title="Select All"
                    />
                  </div>
                </th>
                <th className="py-3.5 px-2 w-12 text-gray-400 dark:text-gray-500">#</th>
                <th className="py-3.5 px-4 min-w-[280px]">ITEM NAME</th>
                <th className="py-3.5 px-4">CATEGORY / FOLDER</th>
                <th className="py-3.5 px-4">PRICE / DETAILS</th>
                <th className="py-3.5 px-4 w-36 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span>SORT BY</span>
                    {isSavingSort && <span className="text-[10px] text-primary lowercase">(saving...)</span>}
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-border font-medium text-gray-700 dark:text-gray-200">
              {allItems.map((item, index) => {
                const isFolder = item.itemType === "folder";
                const isMenuOpen = activeMenuId === item._id;
                const isPublished = isFolder
                  ? item.isPublished !== false
                  : item.status === "Published" || item.published;
                const isSelected = selectedIds.has(item._id);
                const isDragOver = dragOverIndex === index;

                return (
                  <tr
                    key={item._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index, item)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`transition-all duration-150 group cursor-default ${
                      isSelected ? "bg-primary/10" : "hover:bg-gray-50/70 dark:hover:bg-accent/40"
                    } ${isDragOver ? "border-t-2 border-primary bg-primary/10" : ""}`}
                  >
                    {/* Drag Handle & Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
                          title="Drag to reshuffle order"
                        >
                          <GripVertical size={14} />
                        </span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item._id)}
                          className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* S. NO. */}
                    <td className="py-3 px-2 font-mono text-gray-400 dark:text-gray-500 text-xs">
                      {index + 1}
                    </td>

                    {/* ITEM NAME */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isFolder ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                          }`}
                        >
                          {isFolder ? <Folder size={17} /> : <HelpCircle size={17} />}
                        </div>
                        <div>
                          {isFolder ? (
                            <button
                              type="button"
                              onClick={() => onNavigateFolder(item._id)}
                              className="text-xs font-bold text-gray-900 dark:text-foreground hover:text-primary dark:hover:text-primary transition-colors text-left bg-transparent border-none p-0 cursor-pointer line-clamp-1"
                            >
                              {item.title}
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-gray-900 dark:text-foreground line-clamp-1">
                              {item.title}
                            </span>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                isPublished
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50"
                                  : "bg-gray-100 dark:bg-secondary text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-border"
                              }`}
                            >
                              {isPublished ? "Published" : "Unpublished"}
                            </span>
                            {isFolder && (
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">
                                ({item.quizCount || 0} items)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CATEGORY / FOLDER */}
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                      <span className="truncate max-w-[200px] block" title={item.folderPath || currentFolderName}>
                        {item.folderPath ? (
                          <span className="text-primary font-semibold text-[11px] flex items-center gap-1">
                            <span>📍</span>
                            <span className="truncate">{item.folderPath}</span>
                          </span>
                        ) : isFolder ? (
                          "Directory"
                        ) : (
                          currentFolderName
                        )}
                      </span>
                    </td>

                    {/* PRICE / DETAILS */}
                    <td className="py-3 px-4">
                      {isFolder ? (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">Folder</span>
                      ) : (
                        <div className="text-xs">
                          <span className="font-bold text-gray-900 dark:text-foreground">
                            {item.isPaid ? `₹${item.price}` : "Free"}
                          </span>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500">
                            {item.questionCount || 0} Qs • {item.duration || 0}m
                          </div>
                        </div>
                      )}
                    </td>

                    {/* SORT BY (Manual numerical rank) */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-input border border-gray-200 dark:border-border rounded-lg px-2 py-1">
                        <input
                          type="number"
                          step="0.1"
                          value={item.sortOrder ?? 0}
                          onChange={(e) =>
                            onSortChange(item._id, item.itemType, parseFloat(e.target.value) || 0)
                          }
                          className="w-14 text-center bg-transparent border-none text-xs font-bold text-gray-800 dark:text-foreground focus:outline-none p-0"
                        />
                        <div className="flex flex-col gap-0.5 text-gray-400 dark:text-gray-500 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onSortChange(item._id, item.itemType, (item.sortOrder || 0) - 1)
                            }
                            className="hover:text-primary dark:hover:text-primary bg-transparent border-none p-0 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp size={10} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onSortChange(item._id, item.itemType, (item.sortOrder || 0) + 1)
                            }
                            className="hover:text-primary dark:hover:text-primary bg-transparent border-none p-0 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown size={10} />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="py-3 px-4 text-right relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(isMenuOpen ? null : item._id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer"
                        style={{
                          backgroundColor: "var(--bg-input)",
                          borderColor: "var(--border-color)",
                          color: "var(--text-secondary)"
                        }}
                      >
                        <span>Actions</span>
                        <MoreVertical size={13} />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="absolute right-4 mt-1 w-36 rounded-xl shadow-xl border py-1 z-30 animate-fadeIn text-left"
                          style={{
                            backgroundColor: "var(--bg-card)",
                            borderColor: "var(--border-color)"
                          }}
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          {isFolder ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onNavigateFolder(item._id);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <Folder size={13} />
                                <span>Open</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEditFolder(item);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <Edit3 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onMoveFolder(item._id);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <FolderInput size={13} />
                                <span>Move</span>
                              </button>
                              {onCloneFolder && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onCloneFolder(item);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                                >
                                  <Copy size={13} className="text-indigo-600 dark:text-indigo-400" />
                                  <span>Clone Tree</span>
                                </button>
                              )}
                              {onViewAnalytics && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onViewAnalytics(item);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                                >
                                  <BarChart3 size={13} className="text-blue-600 dark:text-blue-400" />
                                  <span>Analytics</span>
                                </button>
                              )}
                              {onExportFolder && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onExportFolder(item);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                                >
                                  <Download size={13} className="text-gray-500 dark:text-gray-400" />
                                  <span>Export JSON</span>
                                </button>
                              )}
                              <div className="h-px bg-gray-100 dark:bg-border my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDeleteFolder(item);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onEditQuiz(item._id);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <Edit3 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onManageQuestions(item._id);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <HelpCircle size={13} />
                                <span>Questions</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onMoveQuiz(item._id);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <FolderInput size={13} />
                                <span>Move</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDuplicateQuiz(item);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-accent flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <Copy size={13} />
                                <span>Duplicate</span>
                              </button>
                              <div className="h-px bg-gray-100 dark:bg-border my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onDeleteQuiz(item);
                                }}
                                className="w-full px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 border-none bg-transparent cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Actions Bar (Appears when items are selected) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-4 animate-slideInUp border border-gray-800">
          <div className="flex items-center gap-2 pr-2 border-r border-gray-700">
            <span className="w-5 h-5 rounded-full bg-primary text-[11px] font-bold flex items-center justify-center">
              {selectedCount}
            </span>
            <span className="text-xs font-semibold text-gray-200">Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onBulkMove(Array.from(selectedIds))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 border-none cursor-pointer transition-colors"
            >
              <FolderInput size={14} className="text-amber-400" />
              <span>Move to Folder</span>
            </button>

            <button
              type="button"
              onClick={() => onBulkPublish(Array.from(selectedIds))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 cursor-pointer transition-colors"
            >
              <CheckCircle2 size={14} />
              <span>Publish</span>
            </button>

            <button
              type="button"
              onClick={() => onBulkUnpublish(Array.from(selectedIds))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border-none cursor-pointer transition-colors"
            >
              <EyeOff size={14} />
              <span>Unpublish</span>
            </button>

            <button
              type="button"
              onClick={() => onBulkDelete(Array.from(selectedIds))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 cursor-pointer transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>

          <button
            type="button"
            onClick={clearSelection}
            className="text-gray-400 hover:text-white p-1 rounded-lg bg-transparent border-none cursor-pointer transition-colors"
            title="Deselect all"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
