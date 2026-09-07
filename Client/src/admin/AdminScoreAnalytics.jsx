import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { TrendingUp, Search, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function AdminScoreAnalytics() {
  const [data, setData] = useState({ overallAverage: 0, totalAttempts: 0, totalQuizzes: 0, quizzes: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/results/admin/score-analytics`,
          { headers }
        );
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch score analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const filtered = data.quizzes.filter(q =>
    q.quizTitle.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const scoreColor = (pct) => pct >= 60 ? "#10B981" : pct >= 33 ? "#F59E0B" : "#EF4444";
  const scoreBg = (pct) => pct >= 60 ? "rgba(16,185,129,0.1)" : pct >= 33 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title={<><span>Score Analytics</span></>} />
        <div className="admin-content">

          {/* Top Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            {/* Overall Average */}
            <div className="form-card" style={{ margin: 0, padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: scoreBg(data.overallAverage), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={24} color={scoreColor(data.overallAverage)} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Overall Average</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: scoreColor(data.overallAverage) }}>
                  {loading ? "—" : `${data.overallAverage}%`}
                </p>
              </div>
            </div>

            {/* Total Attempts */}
            <div className="form-card" style={{ margin: 0, padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(37,99,235,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={24} color="#2563EB" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Total Attempts</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
                  {loading ? "—" : data.totalAttempts.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Total Quizzes */}
            <div className="form-card" style={{ margin: 0, padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(110,63,243,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={24} color="#6E3FF3" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase" }}>Quizzes Attempted</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
                  {loading ? "—" : data.totalQuizzes}
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: "16px", position: "relative", maxWidth: "320px" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search quiz title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: "100%", padding: "10px 12px 10px 36px", borderRadius: "8px",
                border: "1.5px solid var(--border-color)", background: "var(--bg-input)",
                color: "var(--text-primary)", fontSize: "13px", outline: "none"
              }}
            />
          </div>

          {/* Table */}
          <div className="form-card" style={{ margin: 0, padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading analytics...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No quiz data found.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid var(--border-color)" }}>
                      {["Quiz Title", "Attempts", "Avg Score", "Highest", "Lowest", "Pass Rate"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((q, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 16px", fontWeight: "600", color: "var(--text-primary)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.quizTitle}</td>
                        <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontWeight: "600" }}>{q.totalAttempts}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: "600", background: scoreBg(q.averageScore), color: scoreColor(q.averageScore) }}>
                            {q.averageScore}%
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#10B981", fontWeight: "600" }}>{q.highestScore}%</td>
                        <td style={{ padding: "12px 16px", color: "#EF4444", fontWeight: "600" }}>{q.lowestScore}%</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: "600", background: scoreBg(q.passRate), color: scoreColor(q.passRate) }}>
                            {q.passRate}%
                          </span>
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

export default AdminScoreAnalytics;
