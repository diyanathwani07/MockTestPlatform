import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { BarChart3, TrendingUp, CheckSquare, XSquare, User, FileText, BookOpen } from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function Reports() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── 3-WAY DRILL DOWN SEARCH STATES ──
  const [searchCandidate, setSearchCandidate] = useState("");
  const [searchQuiz, setSearchQuiz] = useState("");
  const [searchSubject, setSearchSubject] = useState("");

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
    const quizTitle = r.quizId?.title || "";
    const subjName = r.quizId?.subject || "";

    const matchC = candName.toLowerCase().includes(searchCandidate.toLowerCase());
    const matchQ = quizTitle.toLowerCase().includes(searchQuiz.toLowerCase());
    const matchS = subjName.toLowerCase().includes(searchSubject.toLowerCase());

    return matchC && matchQ && matchS;
  });

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Reports & Analytics" />

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



          {/* 3. 3-WAY LIVE COMMAND BAR (Zero button bloat) */}
          <div className="reports-filter-bar">
            
            <div className="report-search-pill">
              <span className="search-icon-wrapper"><User size={16} /></span>
              <input
                type="text"
                placeholder="Filter by Candidate Name..."
                value={searchCandidate}
                onChange={(e) => setSearchCandidate(e.target.value)}
              />
            </div>

            <div className="report-search-pill">
              <span className="search-icon-wrapper"><FileText size={16} /></span>
              <input
                type="text"
                placeholder="Filter by Quiz Title..."
                value={searchQuiz}
                onChange={(e) => setSearchQuiz(e.target.value)}
              />
            </div>

            <div className="report-search-pill">
              <span className="search-icon-wrapper"><BookOpen size={16} /></span>
              <input
                type="text"
                placeholder="Filter by Subject..."
                value={searchSubject}
                onChange={(e) => setSearchSubject(e.target.value)}
              />
            </div>
          </div>

          {/* 4. NEW: CANDIDATE DRILL-DOWN TABLE */}
          <div className="reports-table-wrapper">
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
                {filteredResults.map((r) => {
                  const isPass = Number(r.percentage) >= 40;

                  return (
                    <tr key={r._id}>
                      
                      <td>
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

                      <td style={{ fontWeight: 600, color: "#1a1a2e" }}>{r.quizId?.title || "Untitled Quiz"}</td>
                      <td>{r.quizId?.subject || "General"}</td>
                      <td style={{ fontWeight: 700 }}>{r.score} / {r.total}</td>
                      <td style={{ fontWeight: 600 }}>{Number(r.percentage || 0).toFixed(1)}%</td>
                      
                      <td>
                        <span className={`rep-badge ${isPass ? "rep-pass" : "rep-fail"}`}>
                          {isPass ? "Passed" : "Failed"}
                        </span>
                      </td>

                      <td style={{ color: "#a8a5bd", fontSize: "13px" }}>
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

        </div>
      </div>
    </div>
  );
}

export default Reports;