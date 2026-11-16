import React, { useState, useMemo } from "react";
import { X, Folder, Move } from "lucide-react";

function flattenFoldersForMove(roots) {
  const result = [];
  const traverse = (node, depth) => {
    result.push({
      _id: (node._id || "").toString(),
      name: node.name,
      depth
    });
    if (Array.isArray(node.children)) {
      node.children.forEach((c) => traverse(c, depth + 1));
    }
  };
  roots.forEach((r) => traverse(r, 0));
  return result;
}

export default function MoveResourceModal({
  isOpen,
  onClose,
  onSubmit,
  resource,
  tree = [],
  submitting = false
}) {
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const folderOptions = useMemo(() => {
    return flattenFoldersForMove(tree);
  }, [tree]);

  if (!isOpen || !resource) return null;

  const currentFolderIdStr = (resource.folderId || "").toString();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFolderId || selectedFolderId === currentFolderIdStr) {
      onClose();
      return;
    }
    onSubmit(resource._id, selectedFolderId);
  };

  return (
    <div className="library-modal-overlay" onClick={onClose}>
      <div className="library-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="library-modal-header">
          <h3>Move Resource: "{resource.title}"</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="library-modal-body">
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary, #4B5563)", margin: 0 }}>
              Choose a new folder destination for this study resource.
            </p>

            <div className="form-group" style={{ marginTop: "8px" }}>
              <label className="form-label">Destination Folder:</label>
              <select
                className="form-select"
                size={8}
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                style={{ height: "auto", padding: "6px" }}
              >
                {folderOptions.map((opt) => {
                  const isCurrent = opt._id === currentFolderIdStr;
                  const indent = "— ".repeat(opt.depth);
                  return (
                    <option
                      key={opt._id}
                      value={opt._id}
                      disabled={isCurrent}
                      style={{ padding: "6px 10px" }}
                    >
                      {indent}📁 {opt.name} {isCurrent ? "(Current Folder)" : ""}
                    </option>
                  );
                })}
              </select>
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
              disabled={submitting || !selectedFolderId}
            >
              {submitting ? "Moving..." : "Move Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
