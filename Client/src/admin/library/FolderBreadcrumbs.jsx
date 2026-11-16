import React from "react";
import { ChevronRight, Home, Folder } from "lucide-react";

export default function FolderBreadcrumbs({
  breadcrumbs = [],
  currentFolder,
  onNavigate
}) {
  return (
    <div className="breadcrumbs-bar">
      <button
        type="button"
        className="breadcrumb-link"
        onClick={() => onNavigate(null)}
      >
        <Home size={14} />
        <span>Root</span>
      </button>

      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb._id || idx}>
            <ChevronRight size={13} style={{ color: "var(--text-muted, #9CA3AF)" }} />
            {isLast ? (
              <span className="breadcrumb-link current">
                <Folder size={14} style={{ color: "var(--primary)" }} />
                <span>{crumb.name}</span>
              </span>
            ) : (
              <button
                type="button"
                className="breadcrumb-link"
                onClick={() => onNavigate(crumb._id)}
              >
                <span>{crumb.name}</span>
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
