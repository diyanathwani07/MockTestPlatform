import React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

function QuizHeader({ title = "", showInstructions = true, onInstructionsClick }) {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  return (
    <div
      className="header"
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 36px",
      }}
    >
      {/* LEFT: Brand only */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", zIndex: 1 }}>
        <Logo />
      </div>

      {/* CENTER: Absolutely centered subject title */}
      {title && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: "700",
            fontSize: "14px",
            color: "#DC2626",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "#DC2626", display: "inline-block" }} />
          {title}
        </div>
      )}

      {/* RIGHT: Theme toggle + optional Instructions */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", zIndex: 1 }}>
        <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
          <div className="pill-track-icons"><span><Sun size={14} /></span><span><Moon size={14} /></span></div>
          <div className="pill-thumb-slider"></div>
        </div>
        {showInstructions && (
          <button
            onClick={() => onInstructionsClick ? onInstructionsClick() : navigate("/start-test")}
            style={{
              background: "#1E1B4B",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "9px 18px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              width: "auto",
              height: "auto",
            }}
          >
            Instructions
          </button>
        )}
      </div>
    </div>
  );
}

export default QuizHeader;