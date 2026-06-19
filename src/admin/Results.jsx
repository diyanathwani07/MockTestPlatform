import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/ManageQuizzes.css";

function Results() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/results", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setResults(res.data);
      } catch (error) {
        console.error("Fetch Results Error:", error);
        setMessage("Failed to load results.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [token]);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Results" />

        <div className="admin-content">

          {message && <p className="admin-status-message">{message}</p>}

          <p className="manage-count">
            {loading ? "Loading..." : `${results.length} attempt(s) recorded`}
          </p>

          <div className="quiz-table-wrapper">
            <table className="quiz-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Email</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Incorrect</th>
                  <th>Percentage</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r._id}>
                    <td>{r.userId?.fullName || "—"}</td>
                    <td>{r.userId?.email || "—"}</td>
                    <td>{r.score} / {r.total}</td>
                    <td>{r.correct}</td>
                    <td>{r.incorrect}</td>
                    <td>{r.percentage}%</td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}

                {!loading && results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      No attempts recorded yet.
                    </td>
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