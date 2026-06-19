import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminSidebar from "./components/AdminSidebar";
import AdminNavbar from "./components/AdminNavbar";
import "../css/admin/AdminLayout.css";
import "../css/admin/AdminDashboard.css";

function Reports() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [token]);

  const avgPercentage = results.length
    ? (
        results.reduce((sum, r) => sum + Number(r.percentage || 0), 0) /
        results.length
      ).toFixed(2)
    : "0.00";

  const passCount = results.filter((r) => Number(r.percentage) >= 40).length;
  const failCount = results.length - passCount;

  const cards = [
    { label: "Total Attempts", value: results.length, icon: "📊", accent: "violet" },
    { label: "Average Score", value: `${avgPercentage}%`, icon: "📈", accent: "gold" },
    { label: "Passed (≥40%)", value: passCount, icon: "✅", accent: "green" },
    { label: "Failed (<40%)", value: failCount, icon: "❌", accent: "navy" },
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar title="Reports" />

        <div className="admin-content">

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

          <div className="dashboard-welcome-card">
            <h3>Performance Summary</h3>
            <p>
              This report aggregates results across all quizzes and candidates.
              Pass threshold is currently set at 40% — adjust this logic in
              Reports.jsx if your platform uses a different cutoff.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Reports;