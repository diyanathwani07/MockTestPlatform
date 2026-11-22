import React, { useState } from "react";
import { HelpCircle, Clock, MoreVertical, Edit3, FolderInput, Copy, Trash2, ListChecks, CheckCircle2, AlertCircle, EyeOff } from "lucide-react";

export default function QuizCardsGrid({
  quizzes = [],
  onEditQuiz,
  onManageQuestions,
  onMoveQuiz,
  onDuplicateQuiz,
  onDeleteQuiz,
  onTogglePublish
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  if (!quizzes || quizzes.length === 0) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <ListChecks size={16} style={{ color: "#6E3FF3" }} />
        <h3 style={{ margin: 0, fontSize: "12.5px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-primary)" }}>
          Quizzes & Tests
        </h3>
        <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "10px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          {quizzes.length}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {quizzes.map((quiz) => {
          const isMenuOpen = activeMenuId === quiz._id;
          const isPublished = quiz.status === "Published" || quiz.published;

          return (
            <div
              key={quiz._id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("application/json", JSON.stringify({ id: quiz._id, type: "quiz" }));
              }}
              className="group relative rounded-2xl overflow-hidden border hover:shadow-lg hover:border-primary/50 transition-all duration-200 flex flex-col justify-between active:opacity-80"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border-color)"
              }}
            >
              {/* Thumbnail / Header */}
              <div
                className="h-28 w-full relative overflow-hidden flex items-center justify-center border-b"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-color)"
                }}
              >
                {quiz.thumbnail ? (
                  <img
                    src={quiz.thumbnail}
                    alt={quiz.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl shadow-xs flex items-center justify-center text-primary group-hover:scale-105 transition-transform border"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
                  >
                    <HelpCircle size={24} />
                  </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-xs ${
                      isPublished
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {isPublished ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                    <span>{isPublished ? "Published" : "Draft"}</span>
                  </span>
                </div>

                {/* 3-Dot Action Menu */}
                <div
                  className="absolute top-2.5 right-2.5 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setActiveMenuId(isMenuOpen ? null : quiz._id)}
                    className="w-7 h-7 rounded-lg border shadow-xs flex items-center justify-center transition-colors cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-secondary)"
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>

                  {isMenuOpen && (
                    <div 
                      className="absolute right-0 mt-1 w-40 rounded-xl shadow-xl border py-1 z-20 animate-fadeIn"
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
                          onEditQuiz(quiz._id);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Edit3 size={13} />
                        <span>Edit Quiz</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onManageQuestions(quiz._id);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <HelpCircle size={13} />
                        <span>Questions</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onMoveQuiz(quiz._id);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <FolderInput size={13} />
                        <span>Move to Folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onDuplicateQuiz(quiz);
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <Copy size={13} />
                        <span>Duplicate</span>
                      </button>
                      {onTogglePublish && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onTogglePublish(quiz._id, !isPublished);
                          }}
                          className="w-full px-3 py-2 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 border-none bg-transparent cursor-pointer text-left"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {isPublished ? <EyeOff size={13} className="text-amber-500" /> : <CheckCircle2 size={13} className="text-emerald-500" />}
                          <span>{isPublished ? "Unpublish" : "Publish"}</span>
                        </button>
                      )}
                      <div className="h-px my-1" style={{ backgroundColor: "var(--border-color)" }} />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          onDeleteQuiz(quiz);
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

              {/* Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4
                    className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-1 m-0 mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {quiz.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                    <span className="flex items-center gap-1">
                      <HelpCircle size={12} />
                      <span>{quiz.questionCount || 0} Qs</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{quiz.duration || 0}m</span>
                    </span>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between pt-2 text-xs border-t mt-1"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
                    style={{
                      backgroundColor: "var(--bg-input)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    {quiz.isPaid ? `₹${quiz.price || 0}` : "Free"}
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Rank: {quiz.sortOrder || 0}
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
