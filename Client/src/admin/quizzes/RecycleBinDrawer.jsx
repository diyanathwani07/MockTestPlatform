import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  X,
  Trash2,
  RotateCcw,
  RefreshCw,
  Folder,
  AlertTriangle,
  Clock,
  CheckCircle2
} from "lucide-react";

export default function RecycleBinDrawer({
  isOpen,
  onClose,
  onItemRestored,
  baseUrl = ""
}) {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchRecycleBin();
  }, [isOpen]);

  const fetchRecycleBin = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${baseUrl}/api/quizzes/recycle-bin`,
        getAuthHeaders()
      );
      if (res.data?.success) {
        setQuizzes(res.data.quizzes || []);
      }
    } catch (err) {
      console.error("Failed to load recycle bin:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (quizId) => {
    setActionLoadingId(quizId);
    try {
      await axios.put(`${baseUrl}/api/quizzes/${quizId}/restore`, {}, getAuthHeaders());
      setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
      if (onItemRestored) onItemRestored();
    } catch (err) {
      console.error("Failed to restore quiz:", err);
      alert(err.response?.data?.message || "Failed to restore quiz.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = async (quiz) => {
    if (!window.confirm(`Permanently destroy "${quiz.title}"? This cannot be undone.`)) {
      return;
    }
    setActionLoadingId(quiz._id);
    try {
      await axios.delete(`${baseUrl}/api/quizzes/${quiz._id}/permanent`, getAuthHeaders());
      setQuizzes((prev) => prev.filter((q) => q._id !== quiz._id));
    } catch (err) {
      console.error("Failed to permanently delete quiz:", err);
      alert(err.response?.data?.message || "Failed to permanently delete quiz.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l animate-slideInRight"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-foreground m-0">Recycle Bin</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 m-0">
                {quizzes.length} deleted test{quizzes.length !== 1 ? "s" : ""}
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

        {/* List of Deleted Quizzes */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {loading ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center">
              <RefreshCw size={20} className="animate-spin text-primary mb-2" />
              <span className="text-xs font-semibold">Loading recycle bin...</span>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="p-12 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center">
              <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 m-0">Recycle bin is empty</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Deleted items will appear here for recovery</p>
            </div>
          ) : (
            quizzes.map((quiz) => {
              const isActioning = actionLoadingId === quiz._id;
              const dateStr = quiz.deletedAt
                ? new Date(quiz.deletedAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : "Recently";

              return (
                <div
                  key={quiz._id}
                  className="p-3.5 rounded-2xl bg-gray-50 dark:bg-input border border-gray-200/90 dark:border-border hover:border-gray-300 dark:hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-foreground m-0 line-clamp-1">
                      {quiz.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Folder size={11} className="text-primary" />
                        <span>{quiz.originalFolderName || "Home"}</span>
                      </span>
                      <span>•</span>
                      <span>{quiz.questionCount || 0} Questions</span>
                      <span>•</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 mt-2.5 border-t border-gray-200/60 dark:border-border">
                    <button
                      type="button"
                      onClick={() => handleRestore(quiz._id)}
                      disabled={isActioning}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg border border-emerald-200/60 dark:border-emerald-800/50 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} className={isActioning ? "animate-spin" : ""} />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(quiz)}
                      disabled={isActioning}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border-none cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      <span>Purge</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-border bg-gray-50/50 dark:bg-input/50 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Items retained for recovery</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-accent border-none cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
