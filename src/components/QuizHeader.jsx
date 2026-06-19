import React from "react";
import ThemeToggle from "./ThemeToggle";

function QuizHeader() {
  return (
    <div className="header">
      <ThemeToggle />

      <div className="logo-section">
        <h1>Teaching Pariksha</h1>
        <h2>React Mock Test</h2>
      </div>

      <button className="instruction-btn">
        Instructions
      </button>

    </div>
  );
}

export default QuizHeader;