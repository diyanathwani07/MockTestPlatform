import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/StartTest.css";

function StartTest() {
  const navigate = useNavigate();
  
  // State to track which exam the user selects from the dropdown
  const [selectedSubject, setSelectedSubject] = useState("BPSC - Quantitative Aptitude");

  const handleStart = () => {
    // Pass the selected subject to the Quiz page using state
    navigate("/quiz", { state: { subject: selectedSubject } });
  };

  return (
    <div className="start-page">
      <div className="top-left"></div>
      <div className="bottom-right"></div>
      <div className="big-circle"></div>
      <div className="small-circle"></div>

      <div className="start-card">
        <div className="logo">
          <span className="icon">📝</span>
          <h1>Teaching Pariksha</h1>
        </div>

        <h2>Test Instructions</h2>

        <div className="instruction-table">
          <div className="row">
            <div className="label">Name</div>
            <div className="value">Diya Nathwani</div>
          </div>

          <div className="row">
            <div className="label">Email</div>
            <div className="value">diyanathwani@gmail.com</div>
          </div>

          {/* DYNAMIC SUBJECT DROPDOWN */}
          <div className="row">
            <div className="label">Select Subject</div>
            <div className="value">
              <select 
                className="subject-dropdown"
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="BPSC - Quantitative Aptitude">BPSC - Quantitative Aptitude</option>
                <option value="BPSC - General English">BPSC - General English</option>
                <option value="BPSC - Reasoning">BPSC - Reasoning</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="label">Duration</div>
            <div className="value">60 Minutes</div>
          </div>

          <div className="row">
            <div className="label">Do's</div>
            <div className="value">
              ✔ Read questions carefully <br />
              ✔ Manage your time properly <br />
              ✔ Submit before time ends
            </div>
          </div>

          <div className="row">
            <div className="label">Don'ts</div>
            <div className="value">
              ❌ Don't refresh the page <br />
              ❌ Don't switch tabs <br />
              ❌ Don't use external help
            </div>
          </div>
        </div>

        <button className="start-btn" onClick={handleStart}>
          Start Test
        </button>
      </div>
    </div>
  );
}

export default StartTest;