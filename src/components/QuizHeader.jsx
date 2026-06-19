import React from "react";
import { useNavigate } from "react-router-dom";

function QuizHeader() {
  const navigate = useNavigate();

  return (
    <div className="header">
      
      <div className="logo-section">
        <h1>Teaching Pariksha</h1>
      </div>

      {/* New separated container for the middle text */}
      <div className="test-title">
        <h2>BPSC Test</h2>
      </div>

      <button className="instruction-btn" onClick={() => navigate('/instructions')}>
        Instructions
      </button>

    </div>
  );
}

export default QuizHeader;