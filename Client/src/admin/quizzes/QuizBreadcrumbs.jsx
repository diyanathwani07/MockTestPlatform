import React, { useState } from "react";
import { Home, ChevronRight, Folder, FolderInput, FolderOpen } from "lucide-react";

export default function QuizBreadcrumbs({
  breadcrumbs = [],
  onNavigate,
  onDropOnBreadcrumb
}) {
  const [dragOverCrumbId, setDragOverCrumbId] = useState(null);

  const handleDragOver = (e, crumbId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCrumbId(crumbId);
  };

  const handleDragLeave = () => {
    setDragOverCrumbId(null);
  };

  const handleDrop = (e, crumbId) => {
    e.preventDefault();
    setDragOverCrumbId(null);

    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    try {
      const item = JSON.parse(data);
      if (item.id && onDropOnBreadcrumb) {
        onDropOnBreadcrumb(item.id, item.type, crumbId);
      }
    } catch (err) {
      console.error("Error parsing dropped breadcrumb data:", err);
    }
  };

  if (!breadcrumbs || breadcrumbs.length <= 1) {
    const isRootDragOver = dragOverCrumbId === "root";
    return (
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
        <button
          type="button"
          onClick={() => onNavigate(null)}
          onDragOver={(e) => handleDragOver(e, "root")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={`flex items-center gap-1.5 font-bold transition-all cursor-pointer border px-2.5 py-1.5 rounded-lg ${
            isRootDragOver
              ? "ring-2 ring-primary scale-105"
              : "hover:opacity-80"
          }`}
          style={{
            backgroundColor: isRootDragOver ? "rgba(110, 63, 243, 0.15)" : "var(--bg-input)",
            color: "var(--text-primary)",
            borderColor: isRootDragOver ? "#6E3FF3" : "var(--border-color)"
          }}
          title="Root directory (Home)"
        >
          <Home size={14} style={{ color: "#6E3FF3" }} />
          <span>Home</span>
          {isRootDragOver && (
            <span style={{ fontSize: "10px", backgroundColor: "#6E3FF3", color: "#ffffff", padding: "2px 6px", borderRadius: "4px", fontWeight: "700", marginLeft: "4px" }}>
              Drop to Move
            </span>
          )}
        </button>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-1 text-xs py-1 overflow-x-auto scrollbar-none" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirst = index === 0;
        const crumbKey = crumb._id || "root";
        const isDragOver = dragOverCrumbId === crumbKey;

        return (
          <React.Fragment key={crumbKey}>
            {index > 0 && (
              <ChevronRight size={13} className="text-gray-400 dark:text-gray-500 shrink-0 mx-0.5 opacity-60" />
            )}
            {isLast ? (
              <span
                className="flex items-center gap-1.5 font-bold px-2.5 py-1.5 rounded-lg border shrink-0 max-w-[200px]"
                style={{
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-primary)",
                  borderColor: "var(--border-color)"
                }}
                title={crumb.title}
              >
                {!isFirst ? <FolderOpen size={14} style={{ color: "#6E3FF3", flexShrink: 0 }} /> : <Home size={14} style={{ color: "#6E3FF3", flexShrink: 0 }} />}
                <span className="truncate">{crumb.title}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(crumb._id)}
                onDragOver={(e) => handleDragOver(e, crumbKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, crumb._id)}
                className={`flex items-center gap-1.5 font-medium transition-all cursor-pointer border px-2 py-1.5 rounded-lg shrink-0 truncate max-w-[170px] ${
                  isDragOver
                    ? "ring-2 ring-primary scale-105 font-bold"
                    : "hover:opacity-85"
                }`}
                style={{
                  backgroundColor: isDragOver ? "rgba(110, 63, 243, 0.15)" : "transparent",
                  color: "var(--text-secondary)",
                  borderColor: isDragOver ? "#6E3FF3" : "transparent"
                }}
                title={isDragOver ? `Drop to move into "${crumb.title}"` : `Navigate to ${crumb.title}`}
              >
                {isFirst ? (
                  <Home size={13} style={{ color: isDragOver ? "#6E3FF3" : "var(--text-muted)" }} />
                ) : (
                  <Folder size={13} style={{ color: isDragOver ? "#6E3FF3" : "#f59e0b" }} />
                )}
                <span className="truncate">{crumb.title}</span>
                {isDragOver && (
                  <span style={{ fontSize: "9px", backgroundColor: "#6E3FF3", color: "#ffffff", padding: "2px 5px", borderRadius: "3px", fontWeight: "700", marginLeft: "2px", flexShrink: 0 }}>
                    Drop
                  </span>
                )}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}