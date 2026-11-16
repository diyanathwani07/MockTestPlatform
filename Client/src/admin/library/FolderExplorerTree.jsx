import React, { useState, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  FolderPlus,
  Layers,
  Sparkles
} from "lucide-react";

/**
 * Scalable iterative tree flattening:
 * Employs an explicit stack traversal to render arbitrary nesting depths (30+ levels)
 * with zero recursive call-stack overhead and zero stack-overflow risk.
 */
function flattenVisibleTree(roots = [], expandedIds = new Set(), searchQuery = "") {
  const normalizedQuery = (searchQuery || "").trim().toLowerCase();
  const result = [];

  // Stack-based iterative traversal
  const stack = [];
  for (let i = roots.length - 1; i >= 0; i--) {
    stack.push({ node: roots[i], depth: 0 });
  }

  while (stack.length > 0) {
    const { node, depth } = stack.pop();
    const nodeId = (node._id || "").toString();
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isExpanded = expandedIds.has(nodeId);

    const matchesSearch =
      !normalizedQuery || (node.name || "").toLowerCase().includes(normalizedQuery);

    result.push({
      _id: nodeId,
      rawNode: node,
      name: node.name,
      depth,
      hasChildren,
      isExpanded,
      color: node.color || "var(--primary)",
      resourceCount: node.resourceCount ?? (node.resources?.length || 0),
      matchesSearch
    });

    // If node is expanded or if a search query is active, display its children
    if ((isExpanded || normalizedQuery) && hasChildren) {
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push({ node: node.children[i], depth: depth + 1 });
      }
    }
  }

  return result;
}

export default function FolderExplorerTree({
  tree = [],
  selectedFolderId,
  onSelectFolder,
  onCreateRootFolder,
  onCreateSubfolder,
  loading = false
}) {
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleExpand = (folderId, e) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set();
    const collect = (nodes) => {
      nodes.forEach((n) => {
        allIds.add((n._id || "").toString());
        if (n.children && n.children.length > 0) collect(n.children);
      });
    };
    collect(tree);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const visibleNodes = useMemo(() => {
    return flattenVisibleTree(tree, expandedIds, searchQuery);
  }, [tree, expandedIds, searchQuery]);

  return (
    <div className="folder-explorer-card">
      {/* Header */}
      <div className="folder-explorer-header">
        <div className="folder-explorer-title">
          <Layers size={17} style={{ color: "var(--primary)" }} />
          <span>Folder Explorer</span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className="al-tree-header-btn"
            title="Create root folder"
            onClick={onCreateRootFolder}
          >
            <FolderPlus size={14} />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="tree-search-bar">
        <Search size={14} className="tree-search-icon" />
        <input
          type="text"
          className="tree-search-input"
          placeholder="Filter folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Quick Expansion Controls */}
      <div className="tree-quick-controls">
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={`tree-quick-btn ${!selectedFolderId ? "active" : ""}`}
        >
          ● Root Library
        </button>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={expandAll}
            className="tree-quick-btn"
          >
            Expand All
          </button>
          <span style={{ opacity: 0.4 }}>|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="tree-quick-btn"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Nodes list */}
      <div className="folder-tree-scroll">
        {loading ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted, #9CA3AF)", fontSize: "13px" }}>
            Loading hierarchy...
          </div>
        ) : visibleNodes.length === 0 ? (
          <div className="tree-empty-state">
            <Folder size={32} style={{ color: "var(--primary)", opacity: 0.5, marginBottom: "8px" }} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary, #111827)", marginBottom: "4px" }}>
              {searchQuery ? "No matching folders found" : "No folders created yet"}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #9CA3AF)", marginBottom: "12px", maxWidth: "200px" }}>
              {searchQuery ? "Try a different search term" : "Create your first folder to begin organizing."}
            </span>
            {!searchQuery && (
              <button
                type="button"
                className="al-tree-header-btn"
                onClick={onCreateRootFolder}
              >
                <FolderPlus size={13} />
                <span>Create Root Folder</span>
              </button>
            )}
          </div>
        ) : (
          visibleNodes.map((item) => {
            const isSelected = selectedFolderId === item._id;
            return (
              <div
                key={item._id}
                className={`tree-node-item ${isSelected ? "selected" : ""}`}
                style={{ paddingLeft: `${8 + item.depth * 18}px` }}
                onClick={() => onSelectFolder(item._id)}
                title={`${item.name} (Nesting Level ${item.depth + 1})`}
              >
                {/* Chevron */}
                {item.hasChildren ? (
                  <button
                    type="button"
                    className="tree-chevron-btn"
                    onClick={(e) => toggleExpand(item._id, e)}
                  >
                    {item.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                ) : (
                  <span style={{ width: "20px", display: "inline-block" }} />
                )}

                {/* Folder Icon */}
                {isSelected || item.isExpanded ? (
                  <FolderOpen size={16} style={{ color: item.color || "var(--primary)", flexShrink: 0 }} />
                ) : (
                  <Folder size={16} style={{ color: item.color || "var(--primary)", flexShrink: 0 }} />
                )}

                {/* Name */}
                <span className="tree-folder-name">{item.name}</span>

                {/* Depth Indicator for deep trees */}
                {item.depth >= 3 && (
                  <span
                    style={{
                      fontSize: "10px",
                      opacity: 0.6,
                      background: "rgba(0,0,0,0.05)",
                      padding: "1px 4px",
                      borderRadius: "4px"
                    }}
                  >
                    L{item.depth + 1}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
