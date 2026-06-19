import React from "react";
import { useTheme } from "../context/ThemeContext";
import "../css/ThemeToggle.css";

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle dark mode"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

export default ThemeToggle;