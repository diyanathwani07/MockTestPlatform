import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import { Users, CheckCircle, Star, GraduationCap } from "lucide-react";
import "../css/admin/AdminLayout.css";
import "../css/admin/ResultsDashboard.css";

// Reusable Searchable & Scrollable Dropdown Component
function SearchableDropdown({ label, options, selected, onSelect, placeholder = "Search..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className="searchable-dropdown-container" style={{ position: "relative", flex: "1", minWidth: "140px" }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        type="button"
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "var(--bg-card)",
          color: "var(--text-primary)",
          border: "1.5px solid var(--border-color)",
          borderRadius: "8px",
          height: "44px",
          cursor: "pointer",
          fontSize: "12px",
          outline: "none"
        }}
      >
        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
          {selected || label}
        </span>
        <span style={{ fontSize: "10px", color: "var(--text-secondary, #a1a1aa)", marginLeft: "4px" }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "48px",
            left: 0,
            width: "100%",
            minWidth: "220px",
            background: "var(--bg-card, #1c1917)",
            border: "1.5px solid var(--border-color, #292524)",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
            zIndex: 100,
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <input
            type="text"
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-page, #0A0A0A)",
              color: "var(--text-primary)",
              fontSize: "12px",
              outline: "none"
            }}
          />
          <div
            className="dropdown-scroll-list"
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "2px"
            }}
          >
            <div
              onClick={() => {
                onSelect(label);
                setIsOpen(false);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                color: selected === label ? "#fff" : "var(--text-primary)",
                background: selected === label ? "var(--primary-color, #6E3FF3)" : "transparent",
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => {
                if (selected !== label) e.target.style.background = "var(--bg-hover, rgba(255, 255, 255, 0.05))";
              }}
              onMouseLeave={(e) => {
                if (selected !== label) e.target.style.background = "transparent";
              }}
            >
              {label}
            </div>
            {filteredOptions.map((opt, i) => (
              <div
                key={i}
                onClick={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: selected === opt ? "#fff" : "var(--text-primary)",
                  background: selected === opt ? "var(--primary-color, #6E3FF3)" : "transparent",
                  transition: "background 0.15s"
                }}
                onMouseEnter={(e) => {
                  if (selected !== opt) e.target.style.background = "var(--bg-hover, rgba(255, 255, 255, 0.05))";
                }}
                onMouseLeave={(e) => {
                  if (selected !== opt) e.target.style.background = "transparent";
                }}
              >
                {opt}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: "6px 10px", color: "var(--text-secondary)", fontSize: "11px", textAlign: "center" }}>
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function Results() {
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState("All Quizzes");
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [selectedUser, setSelectedUser] = useState("All Users");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [perfPage, setPerfPage] = useState(1);
  const [quizPage, setQuizPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("token");
        const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
        const res = await axios.get(`${baseUrl}/api/admin/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data);
      } catch (error) {
        console.error("Fetch Results Error:", error);
      }
    };
    fetchResults();
  }, []);

  // Dynamically derive filter lists from fetched results
  const uniqueQuizzes = Array.from(
    new Set(results.map((r) => r.quizTitle || r.subject || "Untitled Quiz").filter(Boolean))
  );
  const uniqueSubjects = Array.from(
    new Set(results.map((r) => r.subject).filter(Boolean))
  );
  const uniqueUsers = Array.from(
    new Set(results.map((r) => r.userId?.fullName || "Unknown User").filter(Boolean))
  );

  const filteredResults = results.filter((r) => {
    const matchesSearch = r.userId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.quizTitle?.toLowerCase().includes(searchTerm.toLowerCase());
                          
    let matchesDate = true;
    if (filterDate && r.createdAt) {
      const rDate = new Date(r.createdAt).toISOString().split('T')[0];
      matchesDate = rDate === filterDate;
    }
    
    const qName = r.quizTitle || r.subject || "Untitled Quiz";
    const matchesQuiz = selectedQuiz === "All Quizzes" || qName === selectedQuiz;
    const matchesSubject = selectedSubject === "All Subjects" || r.subject === selectedSubject;
    
    const uName = r.userId?.fullName || "Unknown User";
    const matchesUser = selectedUser === "All Users" || uName === selectedUser;
    
    const percentage = r.total > 0 ? (r.score / r.total) * 100 : 0;
    const statusVal = percentage >= 40 ? "Passed" : "Failed";
    const matchesStatus = selectedStatus === "All Status" || statusVal === selectedStatus;
    
    return matchesSearch && matchesDate && matchesQuiz && matchesSubject && matchesUser && matchesStatus;
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
                placeholder="Search..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
               <div style={{ position: "relative", flex: "1", minWidth: "130px", display: "flex", alignItems: "center" }}>
                  <input 
                  type="date"
                  className="filter-date-input"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  title="Filter by date"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid var(--border-color)",
                    background: "var(--bg-card)",
                    color: filterDate ? "var(--text-primary)" : "transparent",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 2,
                    height: "44px"
                  }}
                />
                {!filterDate && (
                  <span 
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      fontSize: "12px",
                      color: "var(--text-muted, #9ca3af)",
                      fontWeight: "500",
                      fontFamily: "inherit",
                      zIndex: 3
                    }}
                  >
                    dd-mm-yyyy
                  </span>
                )}
               </div>
              <SearchableDropdown
                label="All Quizzes"
                options={uniqueQuizzes}
                selected={selectedQuiz}
                onSelect={setSelectedQuiz}
                placeholder="Search quiz..."
              />
              <SearchableDropdown
                label="All Subjects"
                options={uniqueSubjects}
                selected={selectedSubject}
                onSelect={setSelectedSubject}
                placeholder="Search subject..."
              />
              <SearchableDropdown
                label="All Users"
                options={uniqueUsers}
                selected={selectedUser}
                onSelect={setSelectedUser}
                placeholder="Search student..."
              />
              <SearchableDropdown
                label="All Status"
                options={["Passed", "Failed"]}
                selected={selectedStatus}
                onSelect={setSelectedStatus}
                placeholder="Search status..."
              />
              <button 
                className="btn-reset" 
                onClick={() => { 
                  setSearchTerm(""); 
                  setFilterDate(""); 
                  setSelectedQuiz("All Quizzes");
                  setSelectedSubject("All Subjects");
                  setSelectedUser("All Users");
                  setSelectedStatus("All Status");
                }}
              >
                ↻
              </button>
            </div>

            <div className="header-actions">
              <button className="btn-export">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export Report
              </button>
            </div>
          </div>

          {/* STAT CARDS + PERFORMANCE SUMMARY - SIDE BY SIDE */}
          <div className="stats-perf-row">
            {/* LEFT: STAT CARDS 2x2 */}
            <div className="results-stat-cards-grid">
              <div className="stat-card">
                <div className="stat-card-header">
                  <h4>Total Attempts</h4>
                </div>
                <div className="stat-card-body">
                  <h2>{totalAttempts.toLocaleString()}</h2>
                  <span className="trend">Active</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <h4>Average Score</h4>
                </div>
                <div className="stat-card-body">
                  <h2>{averageScore}%</h2>
                  <span className="trend">Overall</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <h4>Highest Score</h4>
                </div>
                <div className="stat-card-body">
                  <h2>{highestPercentage.toFixed(2)}%</h2>
                  <span className="trend">Top</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <h4>Students Appeared</h4>
                </div>
                <div className="stat-card-body">
                  <h2>{studentsAppeared.toLocaleString()}</h2>
                  <span className="trend">Users</span>
                </div>
              </div>
            </div>

            {/* RIGHT: PERFORMANCE SUMMARY */}
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
              <p style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', marginBottom: 0}}>Performance is calculated based on average scores.</p>
            </div>
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
                        <td style={{color: "var(--text-secondary)", fontSize: "12px"}}>{new Date(p.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}</td>
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
  );
}

export default Results;