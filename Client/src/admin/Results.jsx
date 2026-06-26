import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Users, CheckCircle, Star, GraduationCap } from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/ResultsDashboard.css";

function Results() {
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [perfPage, setPerfPage] = useState(1);
  const [quizPage, setQuizPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data);
      } catch (error) {
        console.error("Fetch Results Error:", error);
      }
    };
    fetchResults();
  }, []);

  const filteredResults = results.filter((r) => {
    const matchesSearch = r.userId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.quizTitle?.toLowerCase().includes(searchTerm.toLowerCase());
                          
    let matchesDate = true;
    if (filterDate && r.createdAt) {
      const rDate = new Date(r.createdAt).toISOString().split('T')[0];
      matchesDate = rDate === filterDate;
    }
    
    return matchesSearch && matchesDate;
  });

  // Derive Statistics
  const totalAttempts = filteredResults.length;
  let totalScoreSum = 0;
  let highestPercentage = 0;
  const uniqueStudents = new Set();
  
  let excellentCount = 0;
  let goodCount = 0;
  let averageCount = 0;
  let poorCount = 0;

  filteredResults.forEach(r => {
    const percentage = r.total > 0 ? (r.score / r.total) * 100 : 0;
    totalScoreSum += percentage;
    if (percentage > highestPercentage) highestPercentage = percentage;
    if (r.userId && r.userId._id) uniqueStudents.add(r.userId._id);
    
    if (percentage >= 80) excellentCount++;
    else if (percentage >= 60) goodCount++;
    else if (percentage >= 40) averageCount++;
    else poorCount++;
  });

  const averageScore = totalAttempts > 0 ? (totalScoreSum / totalAttempts).toFixed(2) : "0.00";
  const studentsAppeared = uniqueStudents.size;

  // Sorting for top performers
  const allPerformers = [...filteredResults].sort((a, b) => {
    const pA = a.total > 0 ? (a.score / a.total) * 100 : 0;
    const pB = b.total > 0 ? (b.score / b.total) * 100 : 0;
    return pB - pA;
  });
  const totalPerfPages = Math.max(1, Math.ceil(allPerformers.length / itemsPerPage));
  const topPerformers = allPerformers.slice((perfPage - 1) * itemsPerPage, perfPage * itemsPerPage);

  // Group by Quiz
  const quizStatsMap = {};
  filteredResults.forEach(r => {
    const qName = r.quizTitle || r.subject || "Untitled Quiz";
    if (!quizStatsMap[qName]) {
      quizStatsMap[qName] = { attempts: 0, scoreSum: 0, highest: 0, lowest: 100, passCount: 0 };
    }
    quizStatsMap[qName].attempts++;
    const percentage = r.total > 0 ? (r.score / r.total) * 100 : 0;
    quizStatsMap[qName].scoreSum += percentage;
    if (percentage > quizStatsMap[qName].highest) quizStatsMap[qName].highest = percentage;
    if (percentage < quizStatsMap[qName].lowest) quizStatsMap[qName].lowest = percentage;
    if (percentage >= 40) quizStatsMap[qName].passCount++;
  });

  const allQuizStats = Object.keys(quizStatsMap).map(name => {
    const data = quizStatsMap[name];
    return {
      name,
      attempts: data.attempts,
      avgScore: (data.scoreSum / data.attempts).toFixed(2),
      highest: data.highest.toFixed(2),
      lowest: data.lowest === 100 && data.attempts > 0 && data.highest === 0 ? 0 : data.lowest.toFixed(2),
      passPercent: ((data.passCount / data.attempts) * 100).toFixed(2)
    };
  });
  
  const totalQuizPages = Math.max(1, Math.ceil(allQuizStats.length / itemsPerPage));
  const quizStats = allQuizStats.slice((quizPage - 1) * itemsPerPage, quizPage * itemsPerPage);

  const getScoreBadgeClass = (pct) => {
    if (pct >= 80) return "excellent";
    if (pct >= 60) return "good";
    if (pct >= 40) return "average";
    return "poor";
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Results" />
        
        <div className="results-dashboard">
          
          <div className="dashboard-header" style={{ justifyContent: "space-between", alignItems: "center" }}>
            {/* FILTERS BAR */}
            <div className="filters-bar" style={{ margin: 0 }}>
              <input 
                className="filter-search"
                placeholder="Search by user name, email or quiz..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ maxWidth: "250px", flexGrow: 0 }}
              />
              <input 
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                title="Filter by date"
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1.5px solid var(--border-color)",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "inherit"
                }}
              />
              <select className="filter-select"><option>All Quizzes</option></select>
              <select className="filter-select"><option>All Subjects</option></select>
              <select className="filter-select"><option>All Users</option></select>
              <select className="filter-select"><option>All Status</option></select>
              <button className="btn-reset" onClick={() => { setSearchTerm(""); setFilterDate(""); }}>↻ Reset</button>
            </div>

            <div className="header-actions">
              <button className="btn-export">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export Report
              </button>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="results-stat-cards-grid">
            <div className="stat-card">
              <div className="stat-icon purple" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div className="stat-info">
                <h4>Total Attempts</h4>
                <h2>{totalAttempts.toLocaleString()}</h2>
                <span className="trend positive">↑ Active</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={24} />
              </div>
              <div className="stat-info">
                <h4>Average Score</h4>
                <h2>{averageScore}%</h2>
                <span className="trend positive">Overall</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={24} />
              </div>
              <div className="stat-info">
                <h4>Highest Score</h4>
                <h2>{highestPercentage.toFixed(2)}%</h2>
                <span className="trend positive">Top Performance</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={24} />
              </div>
              <div className="stat-info">
                <h4>Students Appeared</h4>
                <h2>{studentsAppeared.toLocaleString()}</h2>
                <span className="trend positive">Unique Users</span>
              </div>
            </div>
          </div>

          {/* MAIN SECTIONS: Excluded Trend, Recent, Score Dist, Subject Results */}
          <div className="dashboard-sections-grid">
            
            {/* PERFORMANCE SUMMARY */}
            <div className="section-card">
              <div className="section-header">
                <h3>Performance Summary ⓘ</h3>
              </div>
              <div className="perf-grid">
                <div className="perf-box excellent">
                  <div className="perf-header">Excellent (80-100%)</div>
                  <div className="perf-values">
                    <h3>{excellentCount.toLocaleString()}</h3>
                    <span>{totalAttempts > 0 ? ((excellentCount / totalAttempts) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
                <div className="perf-box good">
                  <div className="perf-header">Good (60-79%)</div>
                  <div className="perf-values">
                    <h3>{goodCount.toLocaleString()}</h3>
                    <span>{totalAttempts > 0 ? ((goodCount / totalAttempts) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
                <div className="perf-box average">
                  <div className="perf-header">Average (40-59%)</div>
                  <div className="perf-values">
                    <h3>{averageCount.toLocaleString()}</h3>
                    <span>{totalAttempts > 0 ? ((averageCount / totalAttempts) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
                <div className="perf-box poor">
                  <div className="perf-header">Poor (0-39%)</div>
                  <div className="perf-values">
                    <h3>{poorCount.toLocaleString()}</h3>
                    <span>{totalAttempts > 0 ? ((poorCount / totalAttempts) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              </div>
              <p style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', marginBottom: 0}}>Performance is calculated based on average scores.</p>
            </div>

            {/* TABLES SIDE BY SIDE */}
            <div className="tables-grid">
              {/* TOP PERFORMERS */}
              <div className="section-card" style={{ overflowX: "auto" }}>
              <div className="section-header">
                <h3>Top Performers</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Quiz</th>
                    <th>Score</th>
                    <th>Correct</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((p, idx) => {
                    const pct = p.total > 0 ? (p.score / p.total) * 100 : 0;
                    return (
                      <tr key={p._id}>
                        <td><strong>{(perfPage - 1) * itemsPerPage + idx + 1}</strong></td>
                        <td>
                          <div className="user-cell">
                            <div className="avatar">{p.userId?.fullName?.charAt(0) || "?"}</div>
                            <div>
                              <h5>{p.userId?.fullName || "Unknown User"}</h5>
                              <p>{p.userId?.email || "No Email"}</p>
                            </div>
                          </div>
                        </td>
                        <td>{p.quizTitle || p.subject || "Untitled"}</td>
                        <td><span className={`score-badge ${getScoreBadgeClass(pct)}`}>{pct.toFixed(2)}%</span></td>
                        <td>{p.score} / {p.total}</td>
                        <td style={{color: "var(--text-secondary)", fontSize: "12px"}}>{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                  {topPerformers.length === 0 && (
                    <tr><td colSpan="6" style={{textAlign:"center"}}>No performers found.</td></tr>
                  )}
                </tbody>
              </table>
              <div className="table-pagination-footer">
                <div className="pagination-info">
                  Showing {(perfPage - 1) * itemsPerPage + 1} to {Math.min(perfPage * itemsPerPage, allPerformers.length)} of {allPerformers.length} entries
                </div>
                <div className="pagination-controls">
                  <button className="page-nav-btn" onClick={() => setPerfPage(Math.max(1, perfPage - 1))} disabled={perfPage === 1}>&lt;</button>
                  <button className="page-nav-btn active-page">{perfPage}</button>
                  <button className="page-nav-btn" onClick={() => setPerfPage(Math.min(totalPerfPages, perfPage + 1))} disabled={perfPage === totalPerfPages}>&gt;</button>
                </div>
              </div>
            </div>

            {/* RESULTS BY QUIZ */}
            <div className="section-card" style={{ overflowX: "auto" }}>
              <div className="section-header">
                <h3>Results by Quiz</h3>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quiz</th>
                    <th>Total Attempts</th>
                    <th>Average Score</th>
                    <th>Highest Score</th>
                    <th>Lowest Score</th>
                    <th>Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {quizStats.map((q, idx) => (
                    <tr key={idx}>
                      <td><strong>{q.name}</strong></td>
                      <td>{q.attempts}</td>
                      <td><span className={`score-badge ${getScoreBadgeClass(q.avgScore)}`}>{q.avgScore}%</span></td>
                      <td>{q.highest}%</td>
                      <td>{q.lowest}%</td>
                      <td>{q.passPercent}%</td>
                    </tr>
                  ))}
                  {quizStats.length === 0 && (
                    <tr><td colSpan="6" style={{textAlign:"center"}}>No quiz stats found.</td></tr>
                  )}
                </tbody>
              </table>
              <div className="table-pagination-footer">
                <div className="pagination-info">
                  Showing {(quizPage - 1) * itemsPerPage + 1} to {Math.min(quizPage * itemsPerPage, allQuizStats.length)} of {allQuizStats.length} entries
                </div>
                <div className="pagination-controls">
                  <button className="page-nav-btn" onClick={() => setQuizPage(Math.max(1, quizPage - 1))} disabled={quizPage === 1}>&lt;</button>
                  <button className="page-nav-btn active-page">{quizPage}</button>
                  <button className="page-nav-btn" onClick={() => setQuizPage(Math.min(totalQuizPages, quizPage + 1))} disabled={quizPage === totalQuizPages}>&gt;</button>
                </div>
              </div>
            </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

export default Results;