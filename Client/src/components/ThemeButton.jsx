import React from "react";
import { Palette } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const ThemeButton = () => {
  const { toggleThemePicker } = useTheme();

  return (
    <button
      onClick={toggleThemePicker}
      aria-label="Customize theme"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        backgroundColor: "var(--bg-card, #1c1b2e)",
        border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.1))",
        color: "var(--text-primary, #ffffff)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
        zIndex: 99999,
        transition: "all 0.2s ease-in-out",
        outline: "none"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
        e.currentTarget.style.borderColor = "var(--violet, #9061F9)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.borderColor = "var(--border-color, rgba(255, 255, 255, 0.1))";
      }}
    >
      <Palette size={20} />
    </button>
  );
};

export default ThemeButton;
