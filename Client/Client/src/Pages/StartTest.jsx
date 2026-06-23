import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import "../css/StartTest.css";


function StartTest() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const handleStartTest = () => {
    const activeSubject = "BPSC - Quantitative Aptitude";

    navigate("/quiz", {
      state: {
        subject: activeSubject,
        title: activeSubject, 
        duration: 60
      }
    });
  };

  return (
    <div className="start-page">
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
        <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
          <div className="pill-track-icons"><span>☀️</span><span>🌙</span></div>
          <div className="pill-thumb-slider"></div>
        </div>
      </div>

      {/* Background */}
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

          <div className="row">
            <div className="label">Certificate</div>
            <div className="value">
              Certificate will be issued after successful completion.
            </div>
          </div>

        </div>

        <button className="start-btn" onClick={handleStartTest}>
          Start Test
        </button>

      </div>
    </div>
  );
}

export default StartTest;