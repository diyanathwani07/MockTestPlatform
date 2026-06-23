import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

function QuizHeader({ title = "", showInstructions = true }) {
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
        <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "linear-gradient(135deg, #2D1B69, #6E3FF3)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
          🎓
        </div>
        <span style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
          Teaching Pariksha
        </span>
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
          <div className="pill-track-icons"><span>☀️</span><span>🌙</span></div>
          <div className="pill-thumb-slider"></div>
        </div>
        {showInstructions && (
          <button
            onClick={() => navigate("/start-test")}
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