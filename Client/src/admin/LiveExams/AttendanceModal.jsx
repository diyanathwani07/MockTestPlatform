import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Download, Search, Users, CheckCircle, Clock, Video, AlertCircle, RefreshCw } from "lucide-react";

export default function AttendanceModal({ isOpen, onClose, examId, examTitle }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchAttendance = async () => {
    if (!examId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/live-exams/${examId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAttendance();
    }
  }, [isOpen, examId]);

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/live-exams/${examId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rows = res.data?.data || [];
      if (rows.length === 0) {
        alert("No attendance records to export.");
        return;
      }

      // Convert JSON array to CSV format
      const headers = Object.keys(rows[0]);
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [
          headers.join(","),
          ...rows.map((row) =>
            headers
              .map((fieldName) => {
                const val = row[fieldName] !== undefined ? String(row[fieldName]) : "";
                return `"${val.replace(/"/g, '""')}"`;
              })
              .join(",")
          ),
        ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `attendance_${examTitle?.replace(/[^a-zA-Z0-9]/g, "_") || "exam"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export Error:", err);
      alert("Failed to export attendance records.");
    }
  };

  if (!isOpen) return null;

  const attempts = data?.attempts || [];
  const filteredAttempts = attempts.filter((att) => {
    const studentName = att.studentId?.fullName?.toLowerCase() || "";
    const studentEmail = att.studentId?.email?.toLowerCase() || "";
    const matchesSearch = studentName.includes(search.toLowerCase()) || studentEmail.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || att.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "in_progress":
        return <span style={{ color: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.12)", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>Taking Exam</span>;
      case "in_lobby":
        return <span style={{ color: "#8b5cf6", backgroundColor: "rgba(139, 92, 246, 0.12)", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>In Lobby</span>;
      case "submitted":
        return <span style={{ color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.12)", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>Submitted</span>;
      case "auto_submitted":
        return <span style={{ color: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.12)", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>Auto-Submitted</span>;
      case "disqualified":
        return <span style={{ color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.12)", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>Closed / Excluded</span>;
      default:
        return <span style={{ color: "#64748b", backgroundColor: "rgba(100, 116, 139, 0.12)", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>Registered</span>;
    }
  };

  const getWebcamBadge = (st) => {
    switch (st) {
      case "granted":
        return <span style={{ color: "#10b981", fontSize: "12px", fontWeight: "600" }}>✓ Camera Ready</span>;
      case "denied":
        return <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: "600" }}>✕ Denied</span>;
      case "unavailable":
        return <span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: "600" }}>⚠ No Camera</span>;
      default:
        return <span style={{ color: "#64748b", fontSize: "12px" }}>—</span>;
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="attendance-modal-container"
        style={{
          backgroundColor: "var(--bg-card, #1e1e2d)",
          border: "1.5px solid var(--border-color, rgba(255,255,255,0.12))",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "900px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "var(--text-primary, #ffffff)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.1))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>
              Attendance & Attempt Records
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary, #94a3b8)" }}>
              {examTitle || "Live Examination"} • {attempts.length} Total Student(s)
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={fetchAttendance}
              title="Refresh attendance data"
              style={{
                backgroundColor: "var(--bg-page, #12121a)",
                border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                color: "var(--text-primary, #ffffff)",
                padding: "8px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                backgroundColor: "var(--primary)",
                border: "none",
                color: "var(--primary-foreground)",
                padding: "8px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary, #94a3b8)",
                cursor: "pointer",
                padding: "6px",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          className="attendance-filter-bar"
          style={{
            padding: "14px 24px",
            backgroundColor: "var(--bg-page, #12121a)",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.1))",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary, #94a3b8)" }} />
            <input
              type="text"
              placeholder="Search student by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                backgroundColor: "var(--bg-card, #1e1e2d)",
                color: "var(--text-primary, #ffffff)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div className="attendance-filter-pills" style={{ display: "flex", gap: "6px" }}>
            {[
              { val: "all", label: "All" },
              { val: "in_progress", label: "In Progress" },
              { val: "submitted", label: "Submitted" },
              { val: "in_lobby", label: "In Lobby" },
            ].map((f) => (
              <button
                key={f.val}
                onClick={() => setStatusFilter(f.val)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  backgroundColor: statusFilter === f.val ? "var(--primary)" : "transparent",
                  color: statusFilter === f.val ? "var(--primary-foreground)" : "var(--text-secondary)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table */}
        <div className="attendance-table-wrap" style={{ padding: "0", flex: 1, overflowY: "auto", overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              Loading attendance data...
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              No attendance records found matching criteria.
            </div>
          ) : (
            <table className="attendance-table" style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.1))", backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-secondary)" }}>Student</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-secondary)" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-secondary)" }}>Lobby / Start</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-secondary)" }}>Submitted At</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-secondary)" }}>Webcam</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-secondary)" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.map((att) => (
                  <tr key={att._id} style={{ borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.05))" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <strong style={{ display: "block" }}>{att.studentId?.fullName || "Aspirant"}</strong>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{att.studentId?.email || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{getStatusBadge(att.status)}</td>
                    <td style={{ padding: "12px 16px", fontSize: "12px" }}>
                      {att.startedAt ? (
                        <span>Started: {new Date(att.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      ) : att.lobbyJoinedAt ? (
                        <span>Lobby: {new Date(att.lobbyJoinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>Not Joined</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12px" }}>
                      {att.submittedAt ? new Date(att.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>{getWebcamBadge(att.webcamStatus)}</td>
                    <td style={{ padding: "12px 16px", fontWeight: "600" }}>
                      {att.resultId?.score !== undefined ? (
                        <span style={{ color: "#10b981" }}>
                          {att.resultId.score} / {att.resultId.total} ({att.resultId.percentage}%)
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)", fontWeight: "400" }}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
