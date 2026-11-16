import React, { useState, useMemo } from "react";
import { X, Folder, Move, Home, AlertCircle } from "lucide-react";

/**
 * Recursively flattens tree nodes into a destination options list,
 * marking the folder itself and all its descendant subfolders as disabled
 * to prevent hierarchy cycles client-side.
 */
function buildMoveOptions(roots, currentFolderId) {
  const options = [];
  const currentIdStr = (currentFolderId || "").toString();

  const traverse = (node, depth, isDescendantOfCurrent) => {
    const nodeIdStr = (node._id || "").toString();
    const isSelf = nodeIdStr === currentIdStr;
    const isDescendant = isDescendantOfCurrent || isSelf;

    options.push({
      _id: nodeIdStr,
      name: node.name,
      depth,
      disabled: isSelf || isDescendant
    });

    if (Array.isArray(node.children)) {
      node.children.forEach((child) => traverse(child, depth + 1, isDescendant));
    }
  };

  roots.forEach((root) => traverse(root, 0, false));
  return options;
}

export default function MoveFolderModal({
  isOpen,
  onClose,
  onSubmit,
  folder,
  tree = [],
  submitting = false
}) {
  const [selectedParentId, setSelectedParentId] = useState("");

  const destinationOptions = useMemo(() => {
    if (!folder) return [];
    return buildMoveOptions(tree, folder._id);
  }, [tree, folder]);

  if (!isOpen || !folder) return null;

  const currentParentIdStr = (folder.parentId || "").toString();

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetParentId = selectedParentId === "__ROOT__" || !selectedParentId ? null : selectedParentId;

    if (targetParentId === currentParentIdStr || (targetParentId === null && !folder.parentId)) {
      onClose(); // No change needed
      return;
    }

    onSubmit(folder._id, targetParentId);
  };

  return (
    <div className="library-modal-overlay" onClick={onClose}>
      <div className="library-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="library-modal-header">
          <h3>Move Folder: "{folder.name}"</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="library-modal-body">
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary, #4B5563)", margin: 0 }}>
              Select a new destination directory for <strong>{folder.name}</strong> and all its nested subfolders.
            </p>

            <div className="form-group" style={{ marginTop: "8px" }}>
              <label className="form-label">Destination Parent Directory:</label>
              <select
                className="form-select"
                size={8}
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                style={{ height: "auto", padding: "6px" }}
              >
                {/* Option 1: Root Level */}
                <option
                  value="__ROOT__"
                  disabled={folder.parentId === null}
                  style={{ padding: "8px 10px", fontWeight: "600" }}
                >
                  📁 [Top-Level / Root Directory] {folder.parentId === null ? "(Current Location)" : ""}
                </option>

                {/* Subfolders */}
                {destinationOptions.map((opt) => {
                  const isCurrent = opt._id === currentParentIdStr;
                  const indent = "— ".repeat(opt.depth);

                  return (
                    <option
                      key={opt._id}
                      value={opt._id}
                      disabled={opt.disabled || isCurrent}
                      style={{
                        padding: "6px 10px",
                        color: opt.disabled ? "var(--text-muted, #9CA3AF)" : "inherit"
                      }}
                    >
                      {indent}📁 {opt.name} {isCurrent ? "(Current Parent)" : opt.disabled ? "(Cycle Forbidden)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                color: "var(--text-muted, #6B7280)",
                background: "var(--bg-hover, #F9FAFB)",
                padding: "8px 12px",
                borderRadius: "8px"
              }}
            >
              <AlertCircle size={14} color="var(--primary)" />
              <span>
                Subtree ancestry will be automatically and atomically rebased without breaking nested links.
              </span>
            </div>
          </div>

          <div className="library-modal-footer">
            <button
              type="button"
              className="btn-secondary-outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-gradient"
              disabled={submitting || !selectedParentId}
            >
              {submitting ? "Moving..." : "Confirm Move"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
