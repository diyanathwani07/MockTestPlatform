import React, { useState } from "react";

function AdminHeader({ pageTitle, totalCount, entityName = "records", onDateFilter }) {
  const [selectedDate, setSelectedDate] = useState("");

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
    if (onDateFilter) onDateFilter(newDate);
  };

  const clearFilter = () => {
    setSelectedDate("");
    if (onDateFilter) onDateFilter("");
  };

  return (
    <div className="admin-premium-header">
      
      <div className="header-meta">
        <h2>{pageTitle}</h2>
        {totalCount !== undefined && (
          <span className="live-badge">
            {totalCount} {entityName} {selectedDate ? `on ${selectedDate}` : "total"}
          </span>
        )}
      </div>

      {/* Sleek Horizontal Filter Row */}
      <div className="header-actions" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        
        <div className="search-pill">
          <span>🔍</span>
          <input type="text" placeholder={`Search ${pageTitle.toLowerCase()}...`} />
        </div>

        {/* Compact Calendar Pill */}
        <div 
          className={`date-picker-pill ${selectedDate ? "date-active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "var(--bg-card, #1e1e2d)",
            border: "1.5px solid var(--border-color, #2f2f3e)",
            borderRadius: "100px",
            padding: "6px 14px",
            height: "38px",
            boxSizing: "border-box",
            position: "relative",
            minWidth: "150px"
          }}
        >
          <span style={{ fontSize: "14px" }}>📅</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={handleDateChange} 
            title="Filter by specific date"
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--text-primary, #ffffff)",
              cursor: "pointer",
              padding: 0,
              width: "100%"
            }}
          />
          {selectedDate && (
            <button className="clear-date-sm-btn" onClick={clearFilter} title="Clear date filter" style={{ background: "transparent", border: "none", color: "var(--red, #ef4444)", fontSize: "16px", cursor: "pointer", fontWeight: "bold", padding: "0 4px" }}>
              ×
            </button>
          )}
        </div>

      </div>

    </div>
  );
}

export default AdminHeader;