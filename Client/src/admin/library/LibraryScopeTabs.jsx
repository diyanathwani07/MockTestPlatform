import React from "react";
import { Globe, BookOpen, Layers } from "lucide-react";

export default function LibraryScopeTabs({
  scope,
  onScopeChange,
  examSeriesList = [],
  selectedExamSeriesId,
  onExamSeriesChange
}) {
  return (
    <div className="library-scope-bar">
      {/* Segmented Scope Switch */}
      <div className="scope-pill-switch">
        <button
          type="button"
          className={`scope-pill-btn ${scope === "global" ? "active" : ""}`}
          onClick={() => onScopeChange("global")}
        >
          <Globe size={16} />
          <span>Global Library</span>
        </button>

        <button
          type="button"
          className={`scope-pill-btn ${scope === "exam_specific" ? "active" : ""}`}
          onClick={() => onScopeChange("exam_specific")}
        >
          <BookOpen size={16} />
          <span>Exam-Specific Library</span>
        </button>
      </div>

      {/* Exam Series Dropdown (Shown only when in exam_specific mode) */}
      {scope === "exam_specific" && (
        <div className="exam-select-box">
          <label htmlFor="examSeriesSelect" className="exam-select-label">
            Target Exam Series:
          </label>
          <select
            id="examSeriesSelect"
            className="exam-series-dropdown"
            value={selectedExamSeriesId || ""}
            onChange={(e) => onExamSeriesChange(e.target.value)}
          >
            {examSeriesList.length === 0 ? (
              <option value="" disabled>
                No exam series found
              </option>
            ) : (
              <>
                <option value="" disabled>
                  Select Exam Series...
                </option>
                {examSeriesList.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.title}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      )}
    </div>
  );
}
