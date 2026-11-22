import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Folder, Layers, RefreshCw, CheckCircle2, AlertCircle, FolderPlus, Plus, Sparkles, FolderOpen, FileText } from "lucide-react";
import QuizBreadcrumbs from "./QuizBreadcrumbs";
import QuizExplorerToolbar from "./QuizExplorerToolbar";
import QuizFolderGrid from "./QuizFolderGrid";
import QuizCardsGrid from "./QuizCardsGrid";
import QuizTableView from "./QuizTableView";
import CreateQuizFolderModal from "./CreateQuizFolderModal";
import MoveQuizModal from "./MoveQuizModal";
import AppXCourseEditorModal from "./AppXCourseEditorModal";
import CourseAnalyticsModal from "./CourseAnalyticsModal";
import RecycleBinDrawer from "./RecycleBinDrawer";

export default function QuizExplorerWorkspace({
  baseUrl = "",
  onCreateQuiz,
  onEditQuiz,
  onManageQuestions,
  onDuplicateQuiz,
  onDeleteQuiz,
  examSeriesList = []
}) {
  const [currentFolderId, setCurrentFolderId] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("folderId") || null;
    } catch {
      return null;
    }
  });
  const [breadcrumbs, setBreadcrumbs] = useState([{ _id: null, title: "Home" }]);
  const [folders, setFolders] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [searchTerm, setSearchTerm] = useState("");
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Re-shuffle & Order state
  const [pendingSorts, setPendingSorts] = useState({}); // { [id]: { type, sortOrder } }
  const [isSavingSort, setIsSavingSort] = useState(false);

  // Modals state
  const [folderModal, setFolderModal] = useState({ isOpen: false, data: null });
  const [courseEditorModal, setCourseEditorModal] = useState({ isOpen: false, folderId: null });
  const [analyticsModal, setAnalyticsModal] = useState({ isOpen: false, folderId: null, folderTitle: "" });
  const [recycleBinOpen, setRecycleBinOpen] = useState(false);
  const [moveModal, setMoveModal] = useState({ isOpen: false, itemIds: [], itemType: "quiz" });
  const [toast, setToast] = useState(null); // { text, type: "success" | "error" }

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Fetch Folder Explorer Contents
  const fetchExplorer = useCallback(async (folderId = currentFolderId) => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (folderId && (!isGlobalSearch || !searchTerm)) q.set("folderId", folderId);
      if (searchTerm) {
        q.set("search", searchTerm);
        if (isGlobalSearch) q.set("global", "true");
      }

      const res = await axios.get(`${baseUrl}/api/quizzes/explorer?${q.toString()}`, getAuthHeaders());
      if (res.data?.success) {
        setBreadcrumbs(res.data.breadcrumbs || [{ _id: null, title: "Home" }]);
        setFolders(res.data.folders || []);
        setQuizzes(res.data.quizzes || []);
        setPendingSorts({});
      }
    } catch (err) {
      console.error("Failed to load explorer contents:", err);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, currentFolderId, searchTerm, isGlobalSearch]);

  useEffect(() => {
    fetchExplorer(currentFolderId);
  }, [currentFolderId, fetchExplorer]);

  // Handle URL action trigger e.g. from AdminSidebar (?action=create-folder)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("action") === "create-folder") {
        setFolderModal({ isOpen: true, data: null });
        // Clean URL parameter without reloading
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("action");
        window.history.replaceState({}, "", cleanUrl.toString());
      }
    } catch {
      // fallback
    }
  }, []);

  // Navigate folder drill-down / drill-up
  const handleNavigateFolder = (folderId) => {
    setCurrentFolderId(folderId);
    try {
      const url = new URL(window.location.href);
      if (folderId) {
        url.searchParams.set("folderId", folderId);
      } else {
        url.searchParams.delete("folderId");
      }
      window.history.pushState({}, "", url.toString());
    } catch {
      // fallback
    }
  };

  // Reshuffle / Sort changes
  const handleSortChange = (id, type, newOrder) => {
    setPendingSorts(prev => ({
      ...prev,
      [id]: { id, type, sortOrder: newOrder }
    }));

    // Update in-memory for immediate UI feedback
    if (type === "folder") {
      setFolders(prev => prev.map(f => f._id === id ? { ...f, sortOrder: newOrder } : f));
    } else {
      setQuizzes(prev => prev.map(q => q._id === id ? { ...q, sortOrder: newOrder } : q));
    }
  };

  const handleSaveSort = async () => {
    const items = Object.values(pendingSorts);
    if (items.length === 0) return;

    setIsSavingSort(true);
    try {
      const res = await axios.patch(`${baseUrl}/api/quizzes/reshuffle`, { items }, getAuthHeaders());
      if (res.data?.success) {
        setPendingSorts({});
        fetchExplorer(currentFolderId);
        showToast("Order reshuffled and saved successfully.");
      }
    } catch (err) {
      console.error("Failed to save reshuffled order:", err);
      showToast("Failed to save order", "error");
    } finally {
      setIsSavingSort(false);
    }
  };

  // Folder Operations
  const handleFolderSubmit = async (formData) => {
    try {
      if (folderModal.data?._id) {
        // Edit
        await axios.patch(`${baseUrl}/api/quizzes/folders/${folderModal.data._id}`, formData, getAuthHeaders());
        showToast("Folder updated successfully.");
      } else {
        // Create
        const res = await axios.post(`${baseUrl}/api/quizzes/folders`, formData, getAuthHeaders());
        if (res.data?.success) {
          showToast(`Folder "${formData.title}" created successfully.`);
        }
      }
      setFolderModal({ isOpen: false, data: null });
      fetchExplorer(currentFolderId);
    } catch (err) {
      console.error("Failed to save folder:", err);
      showToast(err.response?.data?.message || "Failed to save folder", "error");
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Delete folder "${folder.title}"? Child quizzes will be moved to upper level.`)) {
      return;
    }
    try {
      await axios.delete(`${baseUrl}/api/quizzes/folders/${folder._id}`, getAuthHeaders());
      fetchExplorer(currentFolderId);
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  // Filter quizzes by status
  const filteredQuizzes = quizzes.filter(q => {
    if (statusFilter === "all") return true;
    if (statusFilter === "published") return q.status === "Published" || q.published;
    if (statusFilter === "draft") return q.status !== "Published" && !q.published;
    return true;
  });

  // Phase 2: Live Drag-and-Drop Reshuffle
  const handleReorderItems = async (reorderedItems) => {
    const newFolders = [];
    const newQuizzes = [];
    const itemsPayload = [];

    reorderedItems.forEach((item, index) => {
      const newOrder = (index + 1) * 10;
      itemsPayload.push({
        id: item._id,
        type: item.itemType,
        sortOrder: newOrder
      });

      if (item.itemType === "folder") {
        newFolders.push({ ...item, sortOrder: newOrder });
      } else {
        newQuizzes.push({ ...item, sortOrder: newOrder });
      }
    });

    // Optimistically update local state immediately
    setFolders(newFolders);
    setQuizzes(newQuizzes);

    // Persist to server
    try {
      setIsSavingSort(true);
      await axios.patch(`${baseUrl}/api/quizzes/reshuffle`, { items: itemsPayload }, getAuthHeaders());
    } catch (err) {
      console.error("Failed to persist reshuffled order:", err);
      fetchExplorer(currentFolderId);
    } finally {
      setIsSavingSort(false);
    }
  };

  // Phase 2: Bulk Actions
  const handleBulkMove = (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) return;
    setMoveModal({ isOpen: true, itemIds: selectedIds, itemType: "quiz" });
  };

  const handleBulkPublish = async (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) return;
    try {
      await axios.patch(
        `${baseUrl}/api/quizzes/bulk-status`,
        { itemIds: selectedIds, quizIds: selectedIds, published: true },
        getAuthHeaders()
      );
      fetchExplorer(currentFolderId);
      showToast(`Published ${selectedIds.length} item(s) successfully.`);
    } catch (err) {
      console.error("Failed to bulk publish:", err);
      showToast(err.response?.data?.message || "Failed to bulk publish", "error");
    }
  };

  const handleBulkUnpublish = async (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) return;
    try {
      await axios.patch(
        `${baseUrl}/api/quizzes/bulk-status`,
        { itemIds: selectedIds, quizIds: selectedIds, published: false },
        getAuthHeaders()
      );
      fetchExplorer(currentFolderId);
      showToast(`Unpublished ${selectedIds.length} item(s) successfully.`);
    } catch (err) {
      console.error("Failed to bulk unpublish:", err);
      showToast(err.response?.data?.message || "Failed to bulk unpublish", "error");
    }
  };

  const handleBulkDelete = async (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) return;
    if (!window.confirm(`Move ${selectedIds.length} selected item(s) to the recycle bin?`)) return;
    try {
      await axios.post(
        `${baseUrl}/api/quizzes/bulk-delete`,
        { itemIds: selectedIds, quizIds: selectedIds },
        getAuthHeaders()
      );
      fetchExplorer(currentFolderId);
      showToast(`Moved ${selectedIds.length} item(s) to the recycle bin.`);
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      showToast(err.response?.data?.message || "Failed to bulk delete", "error");
    }
  };

  const handleTogglePublish = async (id, shouldPublish) => {
    try {
      await axios.patch(
        `${baseUrl}/api/quizzes/bulk-status`,
        { itemIds: [id], quizIds: [id], published: shouldPublish },
        getAuthHeaders()
      );
      fetchExplorer(currentFolderId);
      showToast(shouldPublish ? "Published item successfully." : "Unpublished item successfully.");
    } catch (err) {
      console.error("Failed to toggle status:", err);
      showToast("Failed to toggle status", "error");
    }
  };

  // Phase 5: Clone Entire Folder Hierarchy
  const handleCloneFolder = async (folder) => {
    if (!window.confirm(`Clone folder "${folder.title}" and its entire subfolder/quiz structure?`)) {
      return;
    }
    try {
      const res = await axios.post(
        `${baseUrl}/api/quizzes/folders/${folder._id}/clone`,
        {},
        getAuthHeaders()
      );
      if (res.data?.success) {
        fetchExplorer(currentFolderId);
        showToast(`Cloned "${folder.title}" and all contents successfully.`);
      }
    } catch (err) {
      console.error("Failed to clone folder:", err);
      showToast(err.response?.data?.message || "Failed to clone folder.", "error");
    }
  };

  // Phase 5: Drag-to-Breadcrumb Quick Move
  const handleDropOnBreadcrumb = async (itemId, itemType, destinationFolderId) => {
    try {
      await axios.patch(
        `${baseUrl}/api/quizzes/move`,
        {
          itemIds: [itemId],
          itemType,
          destinationFolderId
        },
        getAuthHeaders()
      );
      fetchExplorer(currentFolderId);
      showToast("Moved item successfully.");
    } catch (err) {
      console.error("Failed to move item via breadcrumb drop:", err);
      showToast(err.response?.data?.message || "Failed to move item.", "error");
    }
  };

  // Phase 6: Export Course JSON Package
  const handleExportFolder = (folder) => {
    const token = localStorage.getItem("token");
    const exportUrl = `${baseUrl}/api/quizzes/folders/${folder._id}/export`;
    fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(folder.title || "course").replace(/[^a-z0-9]/gi, "_")}_package.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => {
        console.error("Export error:", err);
        alert("Failed to export folder package.");
      });
  };

  const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.title || "Home";

  return (
    <div className="w-full">
      {/* 1. Directory Navigation & Metrics Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "12px",
          padding: "8px 16px",
          borderRadius: "14px",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-card)",
          flexWrap: "wrap"
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: "180px" }}>
          <QuizBreadcrumbs
            breadcrumbs={breadcrumbs}
            onNavigate={handleNavigateFolder}
            onDropOnBreadcrumb={handleDropOnBreadcrumb}
          />
        </div>

        {/* Directory Metrics Chips: Unified Sleek Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              color: "var(--text-secondary)"
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Folder size={13} style={{ color: "#f59e0b" }} />
              <strong style={{ color: "var(--text-primary)" }}>{folders.length}</strong>
              <span>Folder{folders.length !== 1 ? "s" : ""}</span>
            </span>

            <span style={{ color: "var(--border-color)" }}>|</span>

            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <FileText size={13} style={{ color: "var(--primary)" }} />
              <strong style={{ color: "var(--text-primary)" }}>{quizzes.length}</strong>
              <span>Quiz{quizzes.length !== 1 ? "zes" : ""}</span>
            </span>

            {quizzes.length > 0 && (
              <>
                <span style={{ color: "var(--border-color)" }}>|</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10b981", fontWeight: "700" }}>
                  <CheckCircle2 size={13} />
                  <span>{quizzes.filter(q => q.status === "Published" || q.published).length} Published</span>
                </span>
                {quizzes.some(q => q.status !== "Published" && !q.published) && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontWeight: "700", marginLeft: "4px" }}>
                    <AlertCircle size={13} />
                    <span>{quizzes.filter(q => q.status !== "Published" && !q.published).length} Draft</span>
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`mb-3 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border animate-fadeIn ${toast.type === "error"
              ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
            }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "error" ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
            <span>{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent border-none cursor-pointer p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Explorer Toolbar */}
      <QuizExplorerToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isGlobalSearch={isGlobalSearch}
        onToggleGlobalSearch={setIsGlobalSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateFolder={() => setFolderModal({ isOpen: true, data: null })}
        onCreateCourse={() => setCourseEditorModal({ isOpen: true, folderId: null })}
        onCreateQuiz={() => onCreateQuiz && onCreateQuiz(currentFolderId)}
        onOpenRecycleBin={() => setRecycleBinOpen(true)}
        hasPendingSort={Object.keys(pendingSorts).length > 0}
        onSaveSort={handleSaveSort}
        isSavingSort={isSavingSort}
      />

      {/* 3. Main Explorer Body */}
      {loading ? (
        <div
          className="p-16 text-center rounded-2xl border flex flex-col items-center justify-center shadow-xs"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <RefreshCw size={24} className="animate-spin text-primary mb-2" />
          <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Loading directory contents...</span>
        </div>
      ) : viewMode === "grid" ? (
        <div>
          {/* Folders in Current Level */}
          <QuizFolderGrid
            folders={folders}
            onNavigateFolder={handleNavigateFolder}
            onEditFolder={(f) => setCourseEditorModal({ isOpen: true, folderId: f._id })}
            onMoveFolder={(id) => setMoveModal({ isOpen: true, itemIds: [id], itemType: "folder" })}
            onDeleteFolder={handleDeleteFolder}
            onTogglePublish={handleTogglePublish}
            onCloneFolder={handleCloneFolder}
            onViewAnalytics={(f) => setAnalyticsModal({ isOpen: true, folderId: f._id, folderTitle: f.title })}
            onExportFolder={handleExportFolder}
          />

          {/* Quizzes in Current Level */}
          <QuizCardsGrid
            quizzes={filteredQuizzes}
            onEditQuiz={onEditQuiz}
            onManageQuestions={onManageQuestions}
            onMoveQuiz={(id) => setMoveModal({ isOpen: true, itemIds: [id], itemType: "quiz" })}
            onDuplicateQuiz={onDuplicateQuiz}
            onDeleteQuiz={onDeleteQuiz}
            onTogglePublish={handleTogglePublish}
          />

          {folders.length === 0 && filteredQuizzes.length === 0 && (
            <div
              className="py-16 px-6 text-center rounded-2xl border flex flex-col items-center justify-center my-4 transition-all"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm"
                style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)" }}
              >
                <FolderOpen size={32} className="text-primary" />
              </div>
              <h3 className="text-base font-bold m-0" style={{ color: "var(--text-primary)" }}>
                This directory is empty
              </h3>
              <p className="text-xs max-w-sm mt-1.5 mb-6" style={{ color: "var(--text-secondary)" }}>
                Create a folder to organize your exams or add your first quiz.
              </p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => setFolderModal({ isOpen: true, data: null })}
                  className="btn-prepmark-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                  style={{ backgroundColor: "#6E3FF3", color: "#ffffff" }}
                >
                  <FolderPlus size={15} />
                  <span>Create Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCreateQuiz && onCreateQuiz(currentFolderId)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)"
                  }}
                >
                  <Plus size={15} />
                  <span>Create Exam</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List / Table View (AppX Enterprise Table) */
        <QuizTableView
          folders={folders}
          quizzes={filteredQuizzes}
          currentFolderName={currentFolderName}
          onNavigateFolder={handleNavigateFolder}
          onEditFolder={(f) => setCourseEditorModal({ isOpen: true, folderId: f._id })}
          onMoveFolder={(id) => setMoveModal({ isOpen: true, itemIds: [id], itemType: "folder" })}
          onDeleteFolder={handleDeleteFolder}
          onEditQuiz={onEditQuiz}
          onManageQuestions={onManageQuestions}
          onMoveQuiz={(id) => setMoveModal({ isOpen: true, itemIds: [id], itemType: "quiz" })}
          onDuplicateQuiz={onDuplicateQuiz}
          onDeleteQuiz={onDeleteQuiz}
          onSortChange={handleSortChange}
          onReorderItems={handleReorderItems}
          onBulkMove={handleBulkMove}
          onBulkPublish={handleBulkPublish}
          onBulkUnpublish={handleBulkUnpublish}
          onBulkDelete={handleBulkDelete}
          onCloneFolder={handleCloneFolder}
          onViewAnalytics={(f) => setAnalyticsModal({ isOpen: true, folderId: f._id, folderTitle: f.title })}
          onExportFolder={handleExportFolder}
          isSavingSort={isSavingSort}
        />
      )}

      {/* Folder Create/Edit Modal */}
      <CreateQuizFolderModal
        isOpen={folderModal.isOpen}
        onClose={() => setFolderModal({ isOpen: false, data: null })}
        onSubmit={handleFolderSubmit}
        initialData={folderModal.data}
        parentFolder={currentFolderId ? { _id: currentFolderId, title: currentFolderName } : null}
        examSeriesList={examSeriesList}
      />

      {/* Move Items Modal */}
      <MoveQuizModal
        isOpen={moveModal.isOpen}
        onClose={() => setMoveModal({ isOpen: false, itemIds: [], itemType: "quiz" })}
        onSuccess={(msg) => {
          fetchExplorer(currentFolderId);
          showToast(msg || "Moved items successfully.");
        }}
        itemIds={moveModal.itemIds}
        itemType={moveModal.itemType}
        currentFolderId={currentFolderId}
        baseUrl={baseUrl}
      />

      {/* AppX Course & Test Bundle Editor Modal (Screenshot 8) */}
      <AppXCourseEditorModal
        isOpen={courseEditorModal.isOpen}
        onClose={() => setCourseEditorModal({ isOpen: false, folderId: null })}
        onSaveSuccess={() => {
          fetchExplorer(currentFolderId);
          showToast("Course saved successfully.");
        }}
        folderId={courseEditorModal.folderId}
        parentFolderId={currentFolderId}
        baseUrl={baseUrl}
        examSeriesList={examSeriesList}
      />

      {/* Course Performance & Learner Analytics Modal */}
      <CourseAnalyticsModal
        isOpen={analyticsModal.isOpen}
        onClose={() => setAnalyticsModal({ isOpen: false, folderId: null, folderTitle: "" })}
        folderId={analyticsModal.folderId}
        folderTitle={analyticsModal.folderTitle}
        baseUrl={baseUrl}
      />

      {/* Recycle Bin Recovery Drawer */}
      <RecycleBinDrawer
        isOpen={recycleBinOpen}
        onClose={() => setRecycleBinOpen(false)}
        onItemRestored={() => {
          fetchExplorer(currentFolderId);
          showToast("Restored quiz from recycle bin.");
        }}
        baseUrl={baseUrl}
      />
    </div>
  );
}
