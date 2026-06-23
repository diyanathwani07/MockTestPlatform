import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";
import DateSelector from "./components/DateSelector";

function Results() {
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/admin/results", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data);
      } catch (error) {
        console.error("Fetch Results Error:", error);
      }
    };
    fetchResults();
  }, []);

  const filteredResults = results.filter((r) => 
    r.userId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminNavbar title="Results" />
        <div className="admin-content">

          {/* ROUNDED PILL SEARCH BAR */}
          <div className="pill-search-container">
            <svg width="16" height="16" className="pill-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            
            <input 
              type="text" 
              placeholder="Search candidate results by name..." 
              className="pill-search-input"
              onChange={(e) => setSearchTerm(e.target.value)}
              value={searchTerm}
            />
          </div>

          {/* TABLE CONTAINER */}
          <div className="quiz-table-wrapper">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Score</th>
                  <th>Date Completed</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((r) => (
                  <tr key={r._id}>
                    <td>
                      {/* FIXED CIRCULAR AVATAR */}
                      <div className="user-info-cell">
                        <div className="user-avatar-circle">
                          {r.userId?.fullName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="user-name-text">{r.userId?.fullName || "Unknown User"}</span>
                      </div>
                    </td>
                    <td>{r.userId?.email || "—"}</td>
                    <td><span className="status-badge status-published" style={{fontWeight: 700}}>{r.score} / {r.total}</span></td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}

                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-row">No test records found matching your search.</td>
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

export default Results;