import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart3,
  X,
  Users,
  FileCheck2,
  TrendingUp,
  Target,
  RefreshCw,
  Folder,
  Award
} from "lucide-react";

export default function CourseAnalyticsModal({
  isOpen,
  onClose,
  folderId = null,
  folderTitle = "",
  baseUrl = ""
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isOpen || !folderId) return;
    fetchAnalytics();
  }, [isOpen, folderId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${baseUrl}/api/quizzes/folders/${folderId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load folder analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const stats = data?.stats || {
    totalQuizzes: 0,
    totalAttempts: 0,
    uniqueStudents: 0,
    avgScorePercent: 0,
    accuracyPercent: 0
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border overflow-hidden flex flex-col transform transition-all"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-foreground m-0">
                Course Performance & Analytics
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0 truncate max-w-sm">
                {data?.folder?.title || folderTitle}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-16 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center">
              <RefreshCw size={24} className="animate-spin text-primary mb-2" />
              <span className="text-sm font-semibold">Aggregating test results & learner attempts...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Attempts</span>
                    <FileCheck2 size={16} />
                  </div>
                  <span className="text-2xl font-black text-blue-950 dark:text-blue-100">{stats.totalAttempts}</span>
                  <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1">Total submissions</span>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Learners</span>
                    <Users size={16} />
                  </div>
                  <span className="text-2xl font-black text-indigo-950 dark:text-indigo-100">{stats.uniqueStudents}</span>
                  <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">Active students</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Avg Score</span>
                    <TrendingUp size={16} />
                  </div>
                  <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100">{stats.avgScorePercent}%</span>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">Batch average</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Accuracy</span>
                    <Target size={16} />
                  </div>
                  <span className="text-2xl font-black text-amber-950 dark:text-amber-100">{stats.accuracyPercent}%</span>
                  <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1">Correct answer rate</span>
                </div>
              </div>

              {/* Individual Quiz Performance Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
                  Individual Test Breakdown ({data?.quizzes?.length || 0})
                </h4>

                {(!data?.quizzes || data.quizzes.length === 0) ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 p-4 bg-gray-50 dark:bg-input rounded-xl text-center">
                    No quizzes found in this course folder
                  </p>
                ) : (
                  <div className="border border-gray-200 dark:border-border rounded-2xl overflow-hidden bg-white dark:bg-card shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-input/80 border-b border-gray-200 dark:border-border text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Test Name</th>
                          <th className="py-2.5 px-3 text-center">Questions</th>
                          <th className="py-2.5 px-3 text-center">Attempts</th>
                          <th className="py-2.5 px-3 text-right">Avg Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-border">
                        {data.quizzes.map((quiz, idx) => (
                          <tr key={quiz._id} className="hover:bg-gray-50/70 dark:hover:bg-accent/40 transition-colors">
                            <td className="py-2.5 px-3 text-gray-400 dark:text-gray-500 font-semibold">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-gray-800 dark:text-foreground truncate max-w-[220px]">
                              {quiz.title}
                            </td>
                            <td className="py-2.5 px-3 text-center text-gray-500 dark:text-gray-400 font-medium">
                              {quiz.questionCount || 0}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                                {quiz.attempts}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-foreground">
                              {quiz.attempts > 0 ? `${quiz.avgScore}%` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-border bg-gray-50/50 dark:bg-input/50">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Price: <strong className="text-gray-800 dark:text-foreground">{data?.folder?.price ? `₹${data.folder.price}` : "Free"}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md border-none cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
