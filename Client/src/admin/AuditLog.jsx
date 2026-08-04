import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All Modules");
  const [filterDate, setFilterDate] = useState("");
  const [viewMode, setViewMode] = useState("Admin Actions"); // 'All Activity' or 'Admin Actions'
  const [expandedLogId, setExpandedLogId] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/audit-logs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLogs(res.data);
      } catch (err) {
        console.error("Failed to fetch audit logs:", err);
      }
    };
    fetchLogs();
  }, []);

  const exportToCSV = () => {
    if (filtered.length === 0) {
      alert("No logs available to export.");
      return;
    }

    const headers = ["User", "Action", "Target", "Date", "Time", "IP Address"];
    const rows = filtered.map(log => [
      `"${log.performedBy || ''}"`,
      `"${log.action || ''}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${new Date(log.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")}"`,
      `"${new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"`,
      `"${log.ipAddress || '-'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = logs.filter((log) => {
    const matchSearch = log.action?.toLowerCase().includes(search.toLowerCase()) ||
      log.performedBy?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase());
    
    const matchModule = moduleFilter === "All Modules" || 
      log.module === moduleFilter ||
      (moduleFilter === "User Management" && log.module === "UserManagement") ||
      (moduleFilter === "Support" && log.module === "Support") ||
      (moduleFilter === "Purchase" && log.module === "Purchase") ||
      (moduleFilter === "Auth" && log.module === "Auth");
    
    let matchDate = true;
    if (filterDate) {
      const logDate = new Date(log.createdAt);
      // Construct date exactly as YYYY-MM-DD to avoid timezone shifts
      const selectedDate = new Date(filterDate + "T00:00:00");
      
      matchDate = logDate.getFullYear() === selectedDate.getFullYear() &&
                  logDate.getMonth() === selectedDate.getMonth() &&
                  logDate.getDate() === selectedDate.getDate();
    }

    let matchMode = true;
    if (viewMode === "Admin Actions") {
      // Hide student test starts, purchases, and profile updates from Admin view
      matchMode = log.action !== "START_QUIZ" && 
                  log.action !== "PURCHASE_EXAM" && 
                  log.action !== "PURCHASE_PRACTICE" &&
                  log.action !== "UPDATE_PROFILE";
    } else if (viewMode === "Student Actions") {
      matchMode = log.action === "START_QUIZ" || 
                  log.action === "PURCHASE_EXAM" || 
                  log.action === "PURCHASE_PRACTICE" ||
                  log.action === "UPDATE_PROFILE";
    }

    return matchSearch && matchModule && matchDate && matchMode;
  });

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Audit Log" />

        <div className="admin-content">

          {/* ── Filters Row ── */}
          <div className="filters-row-scrollable" style={{ display: "flex", gap: "14px", marginBottom: "24px", alignItems: "center", overflowX: "auto", flexWrap: "nowrap", paddingBottom: "4px", justifyContent: "flex-start" }}>
            <input
              placeholder="Search by action, user or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                border: "1.5px solid var(--border-color)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                fontSize: "13px",
                width: "250px", // compact search
                flexShrink: 0,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                border: "1.5px solid var(--border-color)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                fontSize: "13px",
                width: "170px",
                flexShrink: 0,
                outline: "none",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              <option>All Modules</option>
              <option>Quiz</option>
              <option>User Management</option>
              <option>Support</option>
              <option>Auth</option>
              <option>Results</option>
              <option>Purchase</option>
              <option>Settings</option>
            </select>
            
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              style={{
                padding: "11px 16px",
                borderRadius: "10px",
                border: "1.5px solid var(--border-color)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                fontSize: "13px",
                width: "160px",
                flexShrink: 0,
                outline: "none",
                fontFamily: "inherit",
                cursor: "pointer",
                fontWeight: "600"
              }}
            >
              <option>Admin Actions</option>
              <option>Student Actions</option>
              <option>All Activity</option>
            </select>
            
            {/* ── Date Filter ── */}
            <div style={{ 
              display: "flex", alignItems: "center", gap: "8px", 
              backgroundColor: "var(--bg-input)", border: "1.5px solid var(--border-color)", 
              borderRadius: "10px", padding: "10.5px 16px",
              position: "relative", flex: "0 0 auto" 
            }}>
              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ 
                  border: "none", 
                  background: "transparent", 
                  outline: "none", 
                  boxShadow: "none",
                  fontSize: "13px", 
                  color: "var(--text-primary)", 
                  fontWeight: "500", 
                  fontFamily: "inherit", 
                  paddingRight: filterDate ? "16px" : "0",
                  WebkitAppearance: "none",
                  cursor: "pointer"
                }}
              />
              {filterDate && (
                <span 
                  onClick={() => setFilterDate("")}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer", fontWeight: "bold", background: "var(--bg-input)", paddingLeft: "4px" }}
                  title="Clear date filter"
                >
                  ✕
                </span>
              )}
            </div>

            <button
              onClick={exportToCSV}
              style={{
                background: "#6E3FF3",
                color: "#FFF",
                borderRadius: "10px",
                border: "none",
                padding: "11px 22px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                width: "auto",
              }}
            >
              Export Log
            </button>
          </div>

          {/* ── Table ── */}
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "16px",
              border: "1.5px solid var(--border-color)",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              width: "100%",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--bg-input)",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    textAlign: "left",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <th style={{ padding: "14px 24px", fontWeight: "700", width: "20%" }}>User</th>
                  <th style={{ padding: "14px 24px", fontWeight: "700", width: "15%" }}>Action</th>
                  <th style={{ padding: "14px 24px", fontWeight: "700", width: "35%" }}>Target</th>
                  <th style={{ padding: "14px 24px", fontWeight: "700", width: "10%" }}>Date</th>
                  <th style={{ padding: "14px 24px", fontWeight: "700", width: "10%" }}>Time</th>
                  <th style={{ padding: "14px 24px", fontWeight: "700", width: "10%" }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: "60px 24px",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: "14px",
                      }}
                    >
                      {logs.length === 0 ? "No audit logs found." : "No results match your search."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr
                      key={log._id}
                      style={{
                        borderTop: "1px solid var(--border-color)",
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--option-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ padding: "14px 24px", fontWeight: "600", whiteSpace: "nowrap" }}>{log.performedBy}</td>
                      <td style={{ padding: "14px 24px", whiteSpace: "nowrap" }}>
                        {(() => {
                          const a = log.action?.toUpperCase() || "";
                          let bg = "rgba(139, 92, 246, 0.12)";
                          let color = "#8B5CF6";
                          if (a.includes("CREATE") || a.includes("PUBLISH") || a.includes("RESTORE")) {
                            bg = "rgba(16, 185, 129, 0.12)";
                            color = "#10b981";
                          } else if (a.includes("DELETE") || a.includes("SUSPEND")) {
                            bg = "rgba(239, 68, 68, 0.12)";
                            color = "#ef4444";
                          } else if (a.includes("UPDATE") || a.includes("ROLE") || a.includes("STATUS")) {
                            bg = "rgba(245, 158, 11, 0.12)";
                            color = "#f59e0b";
                          } else if (a.includes("RESET") || a.includes("PASSWORD")) {
                            bg = "rgba(59, 130, 246, 0.12)";
                            color = "#3b82f6";
                          }
                          return (
                            <span
                              style={{
                                padding: "4px 12px",
                                borderRadius: "20px",
                                fontSize: "11px",
                                fontWeight: "700",
                                backgroundColor: bg,
                                color: color,
                                display: "inline-block",
                              }}
                            >
                              {log.action}
                            </span>
                          );
                        })()}
                      </td>
                      <td 
                        onClick={() => {
                          setExpandedLogId(expandedLogId === log._id ? null : log._id);
                        }}
                        style={{ 
                          padding: "14px 24px", 
                          color: "var(--text-secondary)", 
                          whiteSpace: expandedLogId === log._id ? "normal" : "nowrap", 
                          wordBreak: "break-word", 
                          lineHeight: "1.5",
                          maxWidth: "280px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          cursor: "pointer"
                        }}
                        title={expandedLogId === log._id ? "Click to collapse" : "Click to expand details"}
                      >
                        {log.details}
                      </td>
                      <td style={{ padding: "14px 24px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-")}
                      </td>
                      <td style={{ padding: "14px 24px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: "14px 24px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: "12px" }}>
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AuditLog;