import React, { useState } from "react";
import MuiDatePicker from "../../components/MuiDatePicker";

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
        <div style={{ width: "180px" }}>
          <MuiDatePicker
            value={selectedDate}
            onChange={(val) => {
              setSelectedDate(val);
              if (onDateFilter) onDateFilter(val);
            }}
            label="mm-dd-yyyy"
          />
        </div>

      </div>

    </div>
  );
}

export default AdminHeader;