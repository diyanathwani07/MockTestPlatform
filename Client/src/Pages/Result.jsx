import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/Result.css";

function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const data = state || {
    score: 0,
    total: 30,
    percentage: 0,
  };

  const pass = data.percentage >= 40;

  return (
    <div className="result-container">
      <div className="result-card">
        <h2 className="title">📘 Exam Result</h2>

        <div className="score-box">
          <h1>
            Score: {data.score} / {data.total}
          </h1>
        </div>

        <div className="percentage-box">
          <h2>
            Percentage: {data.percentage.toFixed(2)}%
          </h2>
        </div>

        <div className={`status ${pass ? "pass" : "fail"}`}>
          {pass ? "🎉 Pass" : "❌ Fail"}
        </div>

        <div className="button-group">
          <button
            className="btn"
            onClick={() => navigate("/quiz")}
          >
            🔁 Retake Test
          </button>

          <button
            className="btn login-btn"
            onClick={() => navigate("/")}
          >
            🚪 Login Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default Result;