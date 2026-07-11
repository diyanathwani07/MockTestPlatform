import React, { useState, useEffect } from "react";
import { Link2, Copy, Search, X } from "lucide-react";
import { fetchStandaloneSections, countSectionQuestions } from "../../utils/modularQuizApi";
import "../../css/admin/CreateQuiz.css";

function SectionPickerModal({ isOpen, onClose, onAdd, excludeSectionIds = [] }) {
  const [sections, setSections] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("linked");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchStandaloneSections(search);
        const exclude = new Set(excludeSectionIds.map(String));
        setSections(data.filter((s) => !exclude.has(String(s._id))));
      } catch (err) {
        console.error("Failed to load sections", err);
        setSections([]);
      }
      setLoading(false);
    };

    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [isOpen, search, excludeSectionIds]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setSelectedId(null);
      setMode("linked");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => {
    const picked = sections.find((s) => s._id === selectedId);
    if (!picked) return;
    onAdd(picked, mode);
    onClose();
  };

  return (
    <div className="section-picker-overlay" onClick={onClose}>
      <div className="section-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-picker-header">
          <h3>Select Existing Section</h3>
          <button type="button" className="section-picker-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="section-picker-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search sections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="section-picker-list">
          {loading ? (
            <p className="section-picker-empty">Loading sections...</p>
          ) : sections.length === 0 ? (
            <p className="section-picker-empty">No reusable sections found.</p>
          ) : (
            sections.map((sec) => (
              <label
                key={sec._id}
                className={`section-picker-item ${selectedId === sec._id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="sectionPick"
                  checked={selectedId === sec._id}
                  onChange={() => setSelectedId(sec._id)}
                />
                <div className="section-picker-item-body">
                  <span className="section-picker-item-title">{sec.title}</span>
                  <span className="section-picker-item-meta">
                    {sec.type || "standard"} • {countSectionQuestions(sec)} questions
                  </span>
                </div>
              </label>
            ))
          )}
        </div>

        {selectedId && (
          <div className="section-picker-mode">
            <p className="section-picker-mode-label">Choose usage type</p>
            <label className={`section-picker-mode-option ${mode === "linked" ? "active" : ""}`}>
              <input
                type="radio"
                name="sectionMode"
                checked={mode === "linked"}
                onChange={() => setMode("linked")}
              />
              <Link2 size={16} />
              <div>
                <strong>Link Section</strong>
                <span>Uses the original. Future edits update every linked quiz.</span>
              </div>
            </label>
            <label className={`section-picker-mode-option ${mode === "cloned" ? "active" : ""}`}>
              <input
                type="radio"
                name="sectionMode"
                checked={mode === "cloned"}
                onChange={() => setMode("cloned")}
              />
              <Copy size={16} />
              <div>
                <strong>Clone Section</strong>
                <span>Creates an independent copy for this quiz only.</span>
              </div>
            </label>
          </div>
        )}

        <div className="section-picker-actions">
          <button type="button" className="section-picker-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="section-picker-btn primary"
            disabled={!selectedId}
            onClick={handleAdd}
          >
            Add Section
          </button>
        </div>
      </div>
    </div>
  );
}

export default SectionPickerModal;
