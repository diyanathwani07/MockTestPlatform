import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import MuiDatePicker from "../components/MuiDatePicker";

function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All Modules");
  const [filterDate, setFilterDate] = useState("");
  const [viewMode, setViewMode] = useState("Admin Actions"); // 'All Activity' or 'Admin Actions'
  const [expandedLogId, setExpandedLogId] = useState(null);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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

  // Reset pagination and module filter when viewMode changes
  useEffect(() => {
    setCurrentPage(1);
    setModuleFilter("All Modules");
  }, [viewMode]);

  // Reset pagination on search, module, or date filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, moduleFilter, filterDate]);

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
    
    let matchModule = true;
    if (viewMode === "Student Actions") {
      if (moduleFilter === "Start Quiz") {
        matchModule = log.action === "START_QUIZ";
      } else if (moduleFilter === "Update Profile") {
        matchModule = log.action === "UPDATE_PROFILE";
      } else if (moduleFilter === "Exam Purchase") {
        matchModule = log.action === "PURCHASE_EXAM" || log.action === "PURCHASE_PRACTICE";
      } else if (moduleFilter === "Custom Test") {
        matchModule = log.action === "CREATE_CUSTOM_TEST" || log.action === "DELETE_CUSTOM_TEST";
      }
    } else {
      matchModule = moduleFilter === "All Modules" || 
        log.module === moduleFilter ||
        (moduleFilter === "User Management" && log.module === "UserManagement") ||
        (moduleFilter === "Support" && log.module === "Support") ||
        (moduleFilter === "Purchase" && log.module === "Purchase") ||
        (moduleFilter === "Auth" && log.module === "Auth");
    }
    
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
      // Hide student test starts, purchases, profile updates, and custom tests from Admin view
      matchMode = log.action !== "START_QUIZ" && 
                  log.action !== "PURCHASE_EXAM" && 
                  log.action !== "PURCHASE_PRACTICE" &&
                  log.action !== "UPDATE_PROFILE" &&
                  log.action !== "CREATE_CUSTOM_TEST" &&
                  log.action !== "DELETE_CUSTOM_TEST";
    } else if (viewMode === "Student Actions") {
      matchMode = log.action === "START_QUIZ" || 
                  log.action === "PURCHASE_EXAM" || 
                  log.action === "PURCHASE_PRACTICE" ||
                  log.action === "UPDATE_PROFILE" ||
                  log.action === "CREATE_CUSTOM_TEST" ||
                  log.action === "DELETE_CUSTOM_TEST";
    }

    return matchSearch && matchModule && matchDate && matchMode;
  });

  // Calculate Pagination values
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginatedLogs = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
              {viewMode === "Student Actions" ? (
                <>
                  <option value="All Modules">All Student Actions</option>
                  <option value="Start Quiz">Start Quiz</option>
                  <option value="Update Profile">Update Profile</option>
                  <option value="Exam Purchase">Exam Purchase</option>
                  <option value="Custom Test">Custom Test</option>
                </>
              ) : (
                <>
                  <option>All Modules</option>
                  <option>Quiz</option>
                  <option>User Management</option>
                  <option>Support</option>
                  <option>Auth</option>
                  <option>Results</option>
                  <option>Purchase</option>
                  <option>Settings</option>
                </>
              )}
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
            <div style={{ minWidth: "160px" }}>
              <MuiDatePicker value={filterDate} onChange={setFilterDate} label="mm-dd-yyyy" />
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
                {paginatedLogs.length === 0 ? (
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
                  paginatedLogs.map((log) => (
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
                          if (a.includes("CREATE") || a.includes("PUBLISH") || a.includes("RESTORE") || a.includes("ADD")) {
                            bg = "rgba(16, 185, 129, 0.12)";
                            color = "#10b981";
                          } else if (a.includes("DELETE") || a.includes("SUSPEND") || a.includes("REMOVE")) {
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div 
                style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  padding: "16px 24px",
                  borderTop: "1px solid var(--border-color)",
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  background: "var(--bg-input)"
                }}
              >
                <span>
                  Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> of <strong>{filtered.length}</strong> entries
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: currentPage === 1 ? "transparent" : "var(--bg-card)",
                      color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      opacity: currentPage === 1 ? 0.5 : 1,
                      fontSize: "12px",
                      fontWeight: "600"
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ alignSelf: "center" }}>
                    Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      background: currentPage === totalPages ? "transparent" : "var(--bg-card)",
                      color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      fontSize: "12px",
                      fontWeight: "600"
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default AuditLog;