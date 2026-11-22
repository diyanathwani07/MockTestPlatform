import React, { useState, useEffect } from "react";
import axios from "axios";
import { Folder, FolderInput, X, RefreshCw, Check } from "lucide-react";

export default function MoveQuizModal({
  isOpen,
  onClose,
  onSuccess,
  itemIds = [],
  itemType = "quiz", // "quiz" | "folder"
  currentFolderId = null,
  baseUrl = ""
}) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestId, setSelectedDestId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    fetchFolderTree();
    setSelectedDestId(null);
    setError("");
  }, [isOpen]);

  const fetchFolderTree = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Fetch all folders for picker
      const res = await axios.get(`${baseUrl}/api/quizzes/folders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setFolders(res.data.folders || []);
      }
    } catch (err) {
      console.error("Failed to fetch folders for move:", err);
      setError("Failed to load available folders");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleMove = async () => {
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${baseUrl}/api/quizzes/move`,
        {
          itemIds,
          itemType,
          destinationFolderId: selectedDestId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        onSuccess(res.data.message || "Moved successfully");
        onClose();
      } else {
        setError(res.data?.message || "Failed to move items");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error moving items");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden transform transition-all"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderInput size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-foreground m-0">
                Move {itemType === "folder" ? "Folder" : "Quiz(zes)"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                Select target destination folder
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-accent transition-colors bg-transparent border-none cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="p-3 mb-4 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
              {error}
            </div>
          )}

          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Destination Folder
          </p>

          <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 border border-gray-200 dark:border-border rounded-xl bg-gray-50/50 dark:bg-input/50">
            {/* Root / Home Option */}
            <div
              onClick={() => setSelectedDestId(null)}
              className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                selectedDestId === null
                  ? "bg-primary text-white font-semibold shadow-sm"
                  : "hover:bg-gray-100 dark:hover:bg-accent text-gray-700 dark:text-gray-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder size={16} className={selectedDestId === null ? "text-white" : "text-primary"} />
                <span className="text-sm">Home (Root Level)</span>
              </div>
              {selectedDestId === null && <Check size={16} />}
            </div>

            {/* Subfolders */}
            {loading ? (
              <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">Loading directories...</div>
            ) : (
              folders
                .filter((f) => {
                  if (itemIds.includes(f._id)) return false; // Don't show folder itself
                  if (Array.isArray(f.ancestors) && f.ancestors.some(a => itemIds.includes(a._id || a))) return false; // Don't show descendants
                  return true;
                })
                .map((folder) => {
                  const isSelected = selectedDestId === folder._id;
                  return (
                    <div
                      key={folder._id}
                      onClick={() => setSelectedDestId(folder._id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-white font-semibold shadow-sm"
                          : "hover:bg-gray-100 dark:hover:bg-accent text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Folder size={16} className={isSelected ? "text-white" : "text-primary"} />
                        <span className="text-sm truncate">{folder.title}</span>
                      </div>
                      {isSelected && <Check size={16} className="shrink-0" />}
                    </div>
                  );
                })
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-100 dark:border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-accent rounded-xl transition-colors bg-transparent border-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMove}
              disabled={submitting}
              style={{ backgroundColor: "var(--primary, #6E3FF3)", color: "#ffffff" }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold hover:opacity-90 rounded-xl shadow-md transition-all border-none cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Moving...</span>
                </>
              ) : (
                <span>Confirm Move</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
