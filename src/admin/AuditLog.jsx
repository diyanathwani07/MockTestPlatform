import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";

function AuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/audit-logs");
        setLogs(res.data);
      } catch (err) { console.error(err); }
    };
    fetchLogs();
  }, []);

  return (
    <div className="admin-layout" style={{ display: "flex", minHeight: "100vh" }}>
      <AdminSidebar />
      <div className="admin-main" style={{ flex: 1, backgroundColor: "#FAFAFC" }}>
        <AdminNavbar title="Audit Log" />
        
        <div className="admin-content" style={{ padding: "32px" }}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            <input placeholder="Search by action..." style={{ padding: "12px", borderRadius: "12px", border: "1px solid #E2DDF0", flex: 2 }} />
            <select style={{ padding: "12px", borderRadius: "12px", border: "1px solid #E2DDF0", flex: 1 }}><option>All Modules</option></select>
          <button 
  style={{ 
    backgroundColor: "#6E3FF3", 
    color: "#FFF", 
    borderRadius: "8px", // Changed from 05px to a cleaner 8px
    border: "none", 
    padding: "10px 20px", // Balanced padding
    fontWeight: "600",    // Fixed readability
    fontSize: "13px",
    cursor: "pointer",
    width: "auto",        // Crucial: Makes the button only as wide as its text
    minWidth: "120px"     // Optional: ensures it isn't too tiny
  }}
>
  Export Log
</button>
          </div>

          <div style={{ backgroundColor: "#FFF", borderRadius: "16px", border: "1px solid #ECE9F7", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#FAFAFC", fontSize: "11px", color: "#6B7280", textAlign: "left" }}>
                  <th style={{ padding: "16px 24px" }}>DATE</th>
                  <th style={{ padding: "16px 24px" }}>ACTION</th>
                  <th style={{ padding: "16px 24px" }}>PERFORMED BY</th>
                  <th style={{ padding: "16px 24px" }}>DETAILS</th>
                  <th style={{ padding: "16px 24px" }}>IP ADDRESS</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: "1px solid #F3F4F6", fontSize: "13px" }}>
                    <td style={{ padding: "16px 24px" }}>{new Date(log.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", backgroundColor: "#EDE9FE", color: "#5b21b6" }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "16px 24px" }}>{log.performedBy}</td>
                    <td style={{ padding: "16px 24px" }}>{log.details}</td>
                    <td style={{ padding: "16px 24px" }}>{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditLog;