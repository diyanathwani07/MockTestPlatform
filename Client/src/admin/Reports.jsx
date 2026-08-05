import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { BarChart3, TrendingUp, CheckSquare, XSquare, User, FileText, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function Reports() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── 3-WAY DRILL DOWN SEARCH STATES ──
  const [searchCandidate, setSearchCandidate] = useState("");
  const [searchQuiz, setSearchQuiz] = useState("");
  const [searchSubject, setSearchSubject] = useState("");

  // ── PAGINATION ──
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data);
      } catch (error) {
        console.error("Fetch Results Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [token]);

  // Preserved your exact KPI math
  const avgPercentage = results.length
    ? (
        results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) /
        results.length
      ).toFixed(2)
    : "0.00";

  const passCount = results.filter((r) => Number(r.percentage) >= 40).length;
  const failCount = results.length - passCount;

  const cards = [
    { label: "TOTAL ATTEMPTS", value: results.length, icon: <BarChart3 size={24} />, accent: "violet" },
    { label: "AVERAGE SCORE", value: `${avgPercentage}%`, icon: <TrendingUp size={24} />, accent: "gold" },
    { label: "PASSED (≥40%)", value: passCount, icon: <CheckSquare size={24} />, accent: "green" },
    { label: "FAILED (<40%)", value: failCount, icon: <XSquare size={24} />, accent: "navy" },
  ];

  // ── MULTI-FILTER MATCHING LOGIC ──
  const filteredResults = results.filter((r) => {
    const candName = r.userId?.fullName || "";
    const quizTitle = r.quizId?.title || r.quizTitle || "";
    const subjName = r.quizId?.subject || r.subject || "";

    const matchC = candName.toLowerCase().includes(searchCandidate.toLowerCase());
    const matchQ = quizTitle.toLowerCase().includes(searchQuiz.toLowerCase());
    const matchS = subjName.toLowerCase().includes(searchSubject.toLowerCase());

    return matchC && matchQ && matchS;
  });

  // ── PAGINATION LOGIC ──
  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchCandidate, searchQuiz, searchSubject]);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title={<><span className="sm:hidden">Reports</span><span className="hidden sm:inline">Reports & Analytics</span></>} />

        <div className="admin-content">

          {/* 1. YOUR ORIGINAL KPI GRID */}
          <div className="stat-cards-grid">
            {cards.map((card) => (
              <div className={`stat-card accent-${card.accent}`} key={card.label}>
                <div className="stat-card-icon">{card.icon}</div>
                <div>
                  <p className="stat-card-label">{card.label}</p>
                  <p className="stat-card-value">
                    {loading ? "—" : card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>



          {/* 3. 3-WAY LIVE COMMAND BAR */}
          <div className="reports-filter-bar" style={{ display: "flex", gap: "8px", paddingBottom: "8px" }}>
            
            <div className="report-search-pill" style={{ flex: 1, minWidth: 0 }}>
              <span className="search-icon-wrapper"><User size={14} /></span>
              <input
                type="text"
                placeholder="Candidate..."
                value={searchCandidate}
                onChange={(e) => setSearchCandidate(e.target.value)}
              />
            </div>

            <div className="report-search-pill" style={{ flex: 1, minWidth: 0 }}>
              <span className="search-icon-wrapper"><FileText size={14} /></span>
              <input
                type="text"
                placeholder="Quiz..."
                value={searchQuiz}
                onChange={(e) => setSearchQuiz(e.target.value)}
              />
            </div>

            <div className="report-search-pill" style={{ flex: 1, minWidth: 0 }}>
              <span className="search-icon-wrapper"><BookOpen size={14} /></span>
              <input
                type="text"
                placeholder="Subject..."
                value={searchSubject}
                onChange={(e) => setSearchSubject(e.target.value)}
              />
            </div>
          </div>


          {/* 4. CANDIDATE DRILL-DOWN TABLE */}
          <div className="reports-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="reports-analytics-table">
              <thead>
                <tr>
                  <th>Candidate Name</th>
                  <th>Quiz Title</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((r) => {
                  const isPass = Number(r.percentage) >= 40;

                  return (
                    <tr key={r._id}>
                      
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="rep-user-cell">
                          <div className="rep-avatar">
                            {r.userId?.fullName?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="rep-name">{r.userId?.fullName || "Unknown Candidate"}</div>
                            <div className="rep-email">{r.userId?.email || "No email recorded"}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{r.quizId?.title || r.quizTitle || "Untitled Quiz"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{r.quizId?.subject || r.subject || "General"}</td>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{r.score} / {r.total}</td>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{Number(r.percentage || 0).toFixed(1)}%</td>
                      
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className={`rep-badge ${isPass ? "rep-pass" : "rep-fail"}`}>
                          {isPass ? "Passed" : "Failed"}
                        </span>
                      </td>

                      <td style={{ color: "#a8a5bd", fontSize: "13px", whiteSpace: "nowrap" }}>
                        {new Date(r.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                      </td>

                    </tr>
                  );
                })}

                {!loading && filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={7} className="rep-empty">No candidate records match your filter combination.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 5. PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 0",
              gap: "12px",
              flexWrap: "wrap"
            }}>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredResults.length)} of {filteredResults.length} results
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "34px", height: "34px", borderRadius: "8px",
                    border: "1.5px solid var(--border-color)",
                    background: currentPage === 1 ? "transparent" : "var(--bg-input)",
                    color: currentPage === 1 ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.4 : 1,
                    transition: "all 0.2s ease"
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .reduce((acc, page, idx, arr) => {
                    if (idx > 0 && page - arr[idx - 1] > 1) {
                      acc.push('dots-' + idx);
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) => (
                    typeof item === 'string' ? (
                      <span key={item} style={{ color: "var(--text-muted)", fontSize: "13px", padding: "0 4px" }}>…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        style={{
                          minWidth: "34px", height: "34px", borderRadius: "8px",
                          border: currentPage === item ? "1.5px solid var(--primary-color, #6E3FF3)" : "1.5px solid var(--border-color)",
                          background: currentPage === item ? "rgba(110, 63, 243, 0.15)" : "transparent",
                          color: currentPage === item ? "var(--primary-color, #6E3FF3)" : "var(--text-secondary)",
                          fontWeight: currentPage === item ? "700" : "500",
                          fontSize: "13px",
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {item}
                      </button>
                    )
                  ))
                }

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "34px", height: "34px", borderRadius: "8px",
                    border: "1.5px solid var(--border-color)",
                    background: currentPage === totalPages ? "transparent" : "var(--bg-input)",
                    color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-primary)",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    transition: "all 0.2s ease"
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Reports;