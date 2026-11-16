import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { useAuth } from "../context/AuthContext";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminLibrary.css";

import LibraryStatsCards from "./library/LibraryStatsCards";
import LibraryScopeTabs from "./library/LibraryScopeTabs";
import FolderExplorerTree from "./library/FolderExplorerTree";
import FolderBreadcrumbs from "./library/FolderBreadcrumbs";
import ResourceListTable from "./library/ResourceListTable";

import CreateFolderModal from "./library/CreateFolderModal";
import EditFolderModal from "./library/EditFolderModal";
import MoveFolderModal from "./library/MoveFolderModal";
import UploadResourceModal from "./library/UploadResourceModal";
import MoveResourceModal from "./library/MoveResourceModal";
import ResourcePreviewModal from "./library/ResourcePreviewModal";
import ConfirmActionModal from "./library/ConfirmActionModal";

import {
  FolderPlus,
  Upload,
  Move,
  Edit2,
  Archive,
  RefreshCw,
  Folder,
  Layers,
  Sparkles
} from "lucide-react";

export function AdminLibraryView({ embedded = false }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "superadmin";

  const baseUrl = import.meta.env.VITE_API_URL || "";
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // State
  const [scope, setScope] = useState("global"); // 'global' | 'exam_specific'
  const [examSeriesList, setExamSeriesList] = useState([]);
  const [selectedExamSeriesId, setSelectedExamSeriesId] = useState("");
  const [stats, setStats] = useState(null);

  // Folder Explorer State
  const [tree, setTree] = useState([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Root
  const [folderDetail, setFolderDetail] = useState(null); // { folder, breadcrumbs, children, resources, pagination }
  const [loadingFolder, setLoadingFolder] = useState(false);

  // Modals state
  const [createModal, setCreateModal] = useState({ isOpen: false, parentFolder: null });
  const [editModal, setEditModal] = useState({ isOpen: false, folder: null });
  const [moveFolderModal, setMoveFolderModal] = useState({ isOpen: false, folder: null });
  const [uploadModal, setUploadModal] = useState({ isOpen: false, resourceToEdit: null });
  const [moveResourceModal, setMoveResourceModal] = useState({ isOpen: false, resource: null });
  const [previewModal, setPreviewModal] = useState({ isOpen: false, resource: null });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    confirmVariant: "danger",
    isPurge: false,
    extraCheckboxLabel: null,
    extraCheckboxChecked: false,
    action: null
  });

  // Notification Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/admin/library/stats`, getAuthHeaders());
      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to load library stats", err);
    }
  }, [baseUrl]);

  // 2. Fetch Exam Series List
  const fetchExamSeries = useCallback(async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/exam-series`, getAuthHeaders());
      const list = res.data?.examSeries || res.data || [];
      setExamSeriesList(list);
      if (list.length > 0 && !selectedExamSeriesId) {
        setSelectedExamSeriesId(list[0]._id);
      }
    } catch (err) {
      console.error("Failed to load exam series", err);
    }
  }, [baseUrl, selectedExamSeriesId]);

  // 3. Fetch Folder Tree
  const fetchTree = useCallback(async () => {
    if (scope === "exam_specific" && !selectedExamSeriesId) {
      setTree([]);
      return;
    }
    setLoadingTree(true);
    try {
      const params = { scope };
      if (scope === "exam_specific" && selectedExamSeriesId) {
        params.examSeriesId = selectedExamSeriesId;
      }
      const res = await axios.get(`${baseUrl}/api/admin/library/folders/tree`, {
        ...getAuthHeaders(),
        params
      });
      setTree(res.data?.tree || []);
    } catch (err) {
      console.error("Failed to load folder tree", err);
      showToast("Failed to load folder hierarchy", "error");
    } finally {
      setLoadingTree(false);
    }
  }, [baseUrl, scope, selectedExamSeriesId]);

  // 4. Fetch Current Folder Content / Root Content
  const fetchFolderContent = useCallback(async (folderId) => {
    setLoadingFolder(true);
    try {
      if (!folderId) {
        // Root View
        const params = { scope, parentId: "null" };
        if (scope === "exam_specific" && selectedExamSeriesId) {
          params.examSeriesId = selectedExamSeriesId;
        }
        const [foldersRes, resourcesRes] = await Promise.all([
          axios.get(`${baseUrl}/api/admin/library/folders`, { ...getAuthHeaders(), params }),
          axios.get(`${baseUrl}/api/admin/library/resources`, { ...getAuthHeaders(), params: { ...params, folderId: "root" } })
        ]);

        setFolderDetail({
          folder: null,
          breadcrumbs: [],
          children: foldersRes.data?.folders || [],
          resources: resourcesRes.data?.resources || [],
          pagination: resourcesRes.data?.pagination || null
        });
      } else {
        // Specific Folder View
        const res = await axios.get(`${baseUrl}/api/admin/library/folders/${folderId}`, getAuthHeaders());
        setFolderDetail(res.data);
      }
    } catch (err) {
      console.error("Failed to load folder content", err);
      showToast(err.response?.data?.message || "Failed to load folder contents", "error");
    } finally {
      setLoadingFolder(false);
    }
  }, [baseUrl, scope, selectedExamSeriesId]);

  // Initial Load
  useEffect(() => {
    fetchStats();
    fetchExamSeries();
  }, [fetchStats, fetchExamSeries]);

  useEffect(() => {
    fetchTree();
    fetchFolderContent(currentFolderId);
  }, [fetchTree, fetchFolderContent, currentFolderId]);

  // Scope or Exam change resets folder to Root
  const handleScopeChange = (newScope) => {
    setScope(newScope);
    setCurrentFolderId(null);
  };

  const handleExamSeriesChange = (examId) => {
    setSelectedExamSeriesId(examId);
    setCurrentFolderId(null);
  };

  const handleSelectFolder = (folderId) => {
    setCurrentFolderId(folderId);
  };

  // Folder Actions
  const handleCreateFolder = async (formData) => {
    const payload = {
      ...formData,
      scope,
      examSeriesId: scope === "exam_specific" ? selectedExamSeriesId : undefined,
      parentId: formData.parentId || currentFolderId || null
    };

    const res = await axios.post(`${baseUrl}/api/admin/library/folders`, payload, getAuthHeaders());
    showToast(res.data?.message || "Folder created successfully");
    fetchStats();
    fetchTree();
    fetchFolderContent(currentFolderId);
  };

  const handleUpdateFolder = async (folderId, formData) => {
    const res = await axios.patch(`${baseUrl}/api/admin/library/folders/${folderId}`, formData, getAuthHeaders());
    showToast(res.data?.message || "Folder updated successfully");
    fetchTree();
    fetchFolderContent(currentFolderId);
  };

  const handleMoveFolder = async (folderId, targetParentId) => {
    const res = await axios.patch(
      `${baseUrl}/api/admin/library/folders/${folderId}/move`,
      { targetParentId },
      getAuthHeaders()
    );
    showToast(res.data?.message || "Folder moved successfully");
    fetchTree();
    fetchFolderContent(currentFolderId);
  };

  const handleArchiveFolderConfirm = (folder) => {
    let recursive = true;
    setConfirmModal({
      isOpen: true,
      title: "Archive Folder",
      message: `Are you sure you want to archive folder "${folder.name}"? Archived folders and their nested items are hidden from students.`,
      confirmLabel: "Archive Folder",
      confirmVariant: "danger",
      isPurge: false,
      extraCheckboxLabel: "Also archive all subfolders and resources recursively",
      extraCheckboxChecked: recursive,
      onExtraCheckboxChange: (val) => { recursive = val; },
      action: async () => {
        try {
          const res = await axios.delete(
            `${baseUrl}/api/admin/library/folders/${folder._id}?recursive=${recursive}`,
            getAuthHeaders()
          );
          showToast(res.data?.message || "Folder archived");
          setConfirmModal({ isOpen: false });
          if (currentFolderId === folder._id) {
            setCurrentFolderId(folder.parentId || null);
          } else {
            fetchFolderContent(currentFolderId);
          }
          fetchTree();
          fetchStats();
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to archive folder", "error");
        }
      }
    });
  };

  // Resource Actions
  const handleUploadFileResource = async (formData, onProgress) => {
    formData.append("scope", scope);
    if (scope === "exam_specific" && selectedExamSeriesId) {
      formData.append("examSeriesId", selectedExamSeriesId);
    }
    if (currentFolderId) {
      formData.append("folderId", currentFolderId);
    }

    const res = await axios.post(`${baseUrl}/api/admin/library/resources/upload`, formData, {
      ...getAuthHeaders(),
      headers: {
        ...getAuthHeaders().headers,
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress: (evt) => {
        if (evt.total) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          onProgress && onProgress(percent);
        }
      }
    });

    showToast(res.data?.message || "Resource uploaded successfully");
    fetchStats();
    fetchFolderContent(currentFolderId);
  };

  const handleCreateNonFileResource = async (payload) => {
    const data = {
      ...payload,
      scope,
      examSeriesId: scope === "exam_specific" ? selectedExamSeriesId : undefined,
      folderId: currentFolderId || null
    };

    const res = await axios.post(`${baseUrl}/api/admin/library/resources`, data, getAuthHeaders());
    showToast(res.data?.message || "Resource created successfully");
    fetchStats();
    fetchFolderContent(currentFolderId);
  };

  const handleUpdateResource = async (resourceId, payload) => {
    const res = await axios.patch(`${baseUrl}/api/admin/library/resources/${resourceId}`, payload, getAuthHeaders());
    showToast(res.data?.message || "Resource updated successfully");
    fetchFolderContent(currentFolderId);
  };

  const handleMoveResource = async (resourceId, targetFolderId) => {
    const res = await axios.patch(
      `${baseUrl}/api/admin/library/resources/${resourceId}/move`,
      { targetFolderId },
      getAuthHeaders()
    );
    showToast(res.data?.message || "Resource moved successfully");
    fetchFolderContent(currentFolderId);
  };

  const handleTogglePublish = async (resource) => {
    try {
      const nextStatus = resource.status === "published" ? "draft" : "published";
      await handleUpdateResource(resource._id, { status: nextStatus });
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  const handleArchiveResourceConfirm = (resource) => {
    setConfirmModal({
      isOpen: true,
      title: "Archive Resource",
      message: `Are you sure you want to archive "${resource.title}"? Students will no longer see this study material.`,
      confirmLabel: "Archive Resource",
      confirmVariant: "danger",
      isPurge: false,
      action: async () => {
        try {
          const res = await axios.delete(`${baseUrl}/api/admin/library/resources/${resource._id}`, getAuthHeaders());
          showToast(res.data?.message || "Resource archived");
          setConfirmModal({ isOpen: false });
          fetchStats();
          fetchFolderContent(currentFolderId);
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to archive resource", "error");
        }
      }
    });
  };

  const handlePurgeResourceConfirm = (resource) => {
    if (!isSuperAdmin) {
      showToast("Only Super Admins can permanently purge assets", "error");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Permanent Purge Asset",
      message: `Permanently delete "${resource.title}" from PrepMark database and Cloudinary storage?`,
      confirmLabel: "Purge Permanently",
      confirmVariant: "danger",
      isPurge: true,
      action: async () => {
        try {
          const res = await axios.delete(`${baseUrl}/api/admin/library/resources/${resource._id}/permanent`, getAuthHeaders());
          showToast(res.data?.message || "Resource and Cloudinary asset permanently destroyed");
          setConfirmModal({ isOpen: false });
          fetchStats();
          fetchFolderContent(currentFolderId);
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to purge resource", "error");
        }
      }
    });
  };

  const currentFolder = folderDetail?.folder || null;
  const breadcrumbs = folderDetail?.breadcrumbs || [];
  const subfolders = folderDetail?.children || [];
  const resources = folderDetail?.resources || [];

  const libraryContent = (
    <div className={`al-container ${embedded ? "al-container-embedded" : ""}`}>
      {/* Toast Notification */}
      {toast && (
        <div className={`al-toast al-toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

          {/* 1. Dashboard Header */}
          <div className="library-header">
            <div className="library-header-text">
              <h1>Study Library</h1>
              <p>Manage and organize study materials for students across global and exam-specific courses.</p>
            </div>
            <div className="library-header-actions">
              <button
                type="button"
                className="btn-secondary-outline"
                onClick={() => setCreateModal({ isOpen: true, parentFolder: currentFolder })}
              >
                <FolderPlus size={16} />
                <span>{currentFolder ? "New Subfolder" : "Create Folder"}</span>
              </button>
              <button
                type="button"
                className="btn-primary-gradient"
                onClick={() => setUploadModal({ isOpen: true, resourceToEdit: null })}
              >
                <Upload size={16} />
                <span>Upload Resource</span>
              </button>
            </div>
          </div>

          {/* 2. KPI Stats Overview */}
          <LibraryStatsCards stats={stats} />

          {/* 3. Scope Switching Tabs */}
          <LibraryScopeTabs
            scope={scope}
            onScopeChange={handleScopeChange}
            examSeriesList={examSeriesList}
            selectedExamSeriesId={selectedExamSeriesId}
            onExamSeriesChange={handleExamSeriesChange}
          />

          {/* 4. Main 2-Column Explorer Workspace */}
          <div className="al-workspace-grid">
            {/* Left Column: Scalable Infinite Folder Explorer Tree */}
            <div className="al-left-pane">
              <FolderExplorerTree
                tree={tree}
                loading={loadingTree}
                selectedFolderId={currentFolderId}
                onSelectFolder={handleSelectFolder}
                onCreateRootFolder={() => setCreateModal({ isOpen: true, parentFolder: null })}
                onRefreshTree={fetchTree}
              />
            </div>

            {/* Right Column: Folder Viewport & Resources List */}
            <div className="al-right-pane">
              {/* Breadcrumb Navigation & Top Actions */}
              <div className="al-content-header-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <FolderBreadcrumbs
                    breadcrumbs={breadcrumbs}
                    currentFolder={currentFolder}
                    onNavigate={handleSelectFolder}
                  />

                  <div className="al-action-btn-group">
                    <button
                      type="button"
                      className="al-btn al-btn-secondary"
                      onClick={() => setCreateModal({ isOpen: true, parentFolder: currentFolder })}
                      title="Add a nested subfolder here"
                    >
                      <FolderPlus size={15} />
                      <span>{currentFolder ? "New Subfolder" : "New Folder"}</span>
                    </button>

                    <button
                      type="button"
                      className="al-btn al-btn-primary"
                      onClick={() => setUploadModal({ isOpen: true, resourceToEdit: null })}
                      title="Upload PDF, Docx, Note or Link"
                    >
                      <Upload size={15} />
                      <span>Upload Material</span>
                    </button>

                    {currentFolder && (
                      <>
                        <button
                          type="button"
                          className="al-btn al-btn-secondary"
                          onClick={() => setEditModal({ isOpen: true, folder: currentFolder })}
                          title="Rename or edit folder description"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="al-btn al-btn-secondary"
                          onClick={() => setMoveFolderModal({ isOpen: true, folder: currentFolder })}
                          title="Move this folder to another location"
                        >
                          <Move size={14} />
                        </button>
                        <button
                          type="button"
                          className="al-btn al-btn-danger-outline"
                          onClick={() => handleArchiveFolderConfirm(currentFolder)}
                          title="Archive folder"
                        >
                          <Archive size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Current Directory Info Banner */}
                <div className="al-current-folder-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      className="al-folder-dot"
                      style={{ backgroundColor: currentFolder?.color || (scope === "global" ? "var(--primary)" : "#F59E0B") }}
                    />
                    <h2 className="al-folder-title">
                      {currentFolder 
                        ? currentFolder.name 
                        : (scope === "global" 
                            ? "Global Library (Root Directory)" 
                            : `${examSeriesList.find(e => e._id === selectedExamSeriesId)?.title || "Exam Series"} (Root Directory)`)}
                    </h2>
                    <span className="al-tree-badge">
                      {currentFolder ? `Level ${currentFolder.depth || 1}` : "Root Directory"}
                    </span>
                  </div>
                  <p className="al-folder-desc">
                    {currentFolder?.description || (scope === "global" 
                      ? "Top-level shared materials. Browse subfolders or upload general study resources." 
                      : "Top-level materials for this exam series. Browse subfolders or upload exam-dedicated resources.")}
                  </p>
                </div>
              </div>

              {/* Subfolders Quick-Access Cards */}
              {subfolders.length > 0 && (
                <div className="al-subfolders-section">
                  <div className="al-subfolders-header">
                    <span>Subfolders ({subfolders.length})</span>
                  </div>
                  <div className="al-subfolders-grid">
                    {subfolders.map((sf) => (
                      <div
                        key={sf._id}
                        className="al-subfolder-card"
                        onClick={() => handleSelectFolder(sf._id)}
                      >
                        <div className="al-sf-icon" style={{ backgroundColor: sf.color ? `${sf.color}20` : "color-mix(in srgb, var(--primary) 14%, transparent)", color: sf.color || "var(--primary)" }}>
                          <Folder size={18} />
                        </div>
                        <div className="al-sf-details">
                          <span className="al-sf-name">{sf.name}</span>
                          <span className="al-sf-meta">
                            {sf.resourceCount || 0} items
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State when Directory is completely empty */}
              {subfolders.length === 0 && resources.length === 0 && !loadingFolder && (
                <div className="al-empty-folder-box">
                  <div className="al-empty-folder-icon">
                    <Folder size={30} />
                  </div>
                  <h4>No materials in this directory</h4>
                  <p>Organize your study library by creating structured subfolders or uploading resources directly into this folder.</p>
                  <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                    <button
                      type="button"
                      className="al-btn al-btn-secondary"
                      onClick={() => setCreateModal({ isOpen: true, parentFolder: currentFolder })}
                    >
                      <FolderPlus size={15} />
                      <span>{currentFolder ? "Add Subfolder" : "Create Folder"}</span>
                    </button>
                    <button
                      type="button"
                      className="al-btn al-btn-primary"
                      onClick={() => setUploadModal({ isOpen: true, resourceToEdit: null })}
                    >
                      <Upload size={15} />
                      <span>Upload Material</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Resources Table */}
              {(resources.length > 0 || loadingFolder) && (
                <div className="al-resources-section">
                  <div className="al-section-header">
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "var(--text-primary)" }}>
                        Study Materials & Resources
                      </h3>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                        {resources.length} materials in this directory
                      </span>
                    </div>
                    <button
                      type="button"
                      className="al-btn-icon"
                      onClick={() => fetchFolderContent(currentFolderId)}
                      title="Refresh resources list"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>

                  <ResourceListTable
                    resources={resources}
                    loading={loadingFolder}
                    isSuperAdmin={isSuperAdmin}
                    onPreviewResource={(res) => setPreviewModal({ isOpen: true, resource: res })}
                    onEditResource={(res) => setUploadModal({ isOpen: true, resourceToEdit: res })}
                    onMoveResource={(res) => setMoveResourceModal({ isOpen: true, resource: res })}
                    onTogglePublish={handleTogglePublish}
                    onArchiveResource={handleArchiveResourceConfirm}
                    onPurgeResource={handlePurgeResourceConfirm}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Modals Container */}
          <CreateFolderModal
            isOpen={createModal.isOpen}
            parentFolder={createModal.parentFolder}
            onClose={() => setCreateModal({ isOpen: false, parentFolder: null })}
            onSubmit={handleCreateFolder}
          />

          <EditFolderModal
            isOpen={editModal.isOpen}
            folder={editModal.folder}
            onClose={() => setEditModal({ isOpen: false, folder: null })}
            onSubmit={handleUpdateFolder}
          />

          <MoveFolderModal
            isOpen={moveFolderModal.isOpen}
            folder={moveFolderModal.folder}
            tree={tree}
            onClose={() => setMoveFolderModal({ isOpen: false, folder: null })}
            onSubmit={handleMoveFolder}
          />

          <UploadResourceModal
            isOpen={uploadModal.isOpen}
            resourceToEdit={uploadModal.resourceToEdit}
            onClose={() => setUploadModal({ isOpen: false, resourceToEdit: null })}
            onUploadFile={handleUploadFileResource}
            onCreateNonFile={handleCreateNonFileResource}
            onUpdateResource={handleUpdateResource}
          />

          <MoveResourceModal
            isOpen={moveResourceModal.isOpen}
            resource={moveResourceModal.resource}
            tree={tree}
            onClose={() => setMoveResourceModal({ isOpen: false, resource: null })}
            onSubmit={handleMoveResource}
          />

          <ResourcePreviewModal
            isOpen={previewModal.isOpen}
            resource={previewModal.resource}
            baseUrl={baseUrl}
            onClose={() => setPreviewModal({ isOpen: false, resource: null })}
          />

          <ConfirmActionModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmLabel={confirmModal.confirmLabel}
            confirmVariant={confirmModal.confirmVariant}
            isPurge={confirmModal.isPurge}
            extraCheckboxLabel={confirmModal.extraCheckboxLabel}
            extraCheckboxChecked={confirmModal.extraCheckboxChecked}
            onExtraCheckboxChange={confirmModal.onExtraCheckboxChange}
            onConfirm={confirmModal.action}
            onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          />
        </div>
  );

  if (embedded) {
    return libraryContent;
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Study Library" />
        <div className="admin-content">
          {libraryContent}
        </div>
      </div>
    </div>
  );
}

export default function AdminLibrary() {
  return <AdminLibraryView embedded={false} />;
}
