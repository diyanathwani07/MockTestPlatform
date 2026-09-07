import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Trophy, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function AdminAttempts() {
  const [data, setData] = useState({ totalAttempts: 0, attempts: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/results/admin/all-attempts`,
          { headers }
        );
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch attempts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, []);

  const filtered = data.attempts.filter(a =>
    a.studentName.toLowerCase().includes(search.toLowerCase()) ||
    a.quizTitle.toLowerCase().includes(search.toLowerCase()) ||
    a.studentEmail.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatTime = (seconds) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title={<><span>All Attempts</span></>} />
        <div className="admin-content">

          {/* Header Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(37, 99, 235, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trophy size={22} color="#2563EB" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>All Quiz Attempts</h2>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
                  {loading ? "Loading..." : `${data.totalAttempts} total attempts`}
                </p>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", minWidth: "260px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search student or quiz..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{
                  width: "100%", padding: "10px 12px 10px 36px", borderRadius: "8px",
                  border: "1.5px solid var(--border-color)", background: "var(--bg-input)",
                  color: "var(--text-primary)", fontSize: "13px", outline: "none"
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="form-card" style={{ margin: 0, padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading attempts...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No attempts found.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid var(--border-color)" }}>
                      {["Student", "Quiz", "Score", "%", "Time", "Date", "Status"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((a, i) => (
                      <tr key={a._id || i} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{a.studentName}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{a.studentEmail}</div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-primary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.quizTitle}</td>
                        <td style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-primary)" }}>{a.score}/{a.total}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: "600",
                            background: a.percentage >= 60 ? "rgba(16,185,129,0.1)" : a.percentage >= 33 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                            color: a.percentage >= 60 ? "#10B981" : a.percentage >= 33 ? "#F59E0B" : "#EF4444"
                          }}>{a.percentage?.toFixed(1)}%</span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{formatTime(a.timeTaken)}</td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{formatDate(a.date)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          {a.passed 
                            ? <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#10B981", fontWeight: "600", fontSize: "12px" }}><CheckCircle2 size={14} /> Pass</span>
                            : <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#EF4444", fontWeight: "600", fontSize: "12px" }}><XCircle size={14} /> Fail</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}
                  ><ChevronLeft size={14} /> Prev</button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}
                  >Next <ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAttempts;
