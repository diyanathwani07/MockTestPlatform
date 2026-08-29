import React, { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { themes } from "../themes/themes";
import { Sun, Moon, Check, X } from "lucide-react";

const ThemePicker = () => {
  const {
    theme,
    setTheme,
    mode,
    setMode,
    showThemePicker,
    toggleThemePicker
  } = useTheme();

  const pickerRef = useRef(null);

  // Close on ESC keypress
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showThemePicker) {
        toggleThemePicker();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showThemePicker, toggleThemePicker]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showThemePicker &&
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        !e.target.closest("button[aria-label='Customize theme']")
      ) {
        toggleThemePicker();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showThemePicker, toggleThemePicker]);

  if (!showThemePicker) return null;

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Theme Customization Panel"
      style={{
        position: "fixed",
        bottom: "84px",
        right: "24px",
        width: "300px",
        maxHeight: "500px",
        backgroundColor: "var(--bg-card, #131428)",
        border: "1.5px solid var(--border-color, rgba(255, 255, 255, 0.08))",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
        zIndex: 99998,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        overflowY: "auto",
        scrollbarWidth: "none"
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ textAlign: "left" }}>
          <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>Customize</h4>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Pick a style and color for your page</span>
        </div>
        <button
          onClick={toggleThemePicker}
          aria-label="Close customizer"
          style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Colors List */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "10px", textAlign: "left" }}>Color</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {themes.map((t) => {
            const isSelected = theme === t.name;
            const swatchColor = mode === "dark" ? t.activeColor.dark : t.activeColor.light;

            return (
              <button
                key={t.name}
                onClick={() => setTheme(t.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  backgroundColor: isSelected ? "rgba(144, 97, 249, 0.08)" : "transparent",
                  border: isSelected ? "1.5px solid var(--violet, #9061F9)" : "1.5px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  outline: "none"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* Swatch color */}
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor: swatchColor,
                      border: "1px solid rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff"
                    }}
                  >
                    {isSelected && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-primary)" }}>
                    {t.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Select */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "10px", textAlign: "left" }}>Mode</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", backgroundColor: "rgba(255,255,255,0.03)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <button
            onClick={() => setMode("light")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: mode === "light" ? "var(--bg-card, #1c1b2e)" : "transparent",
              color: mode === "light" ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              outline: "none"
            }}
          >
            <Sun size={14} /> Light
          </button>
          <button
            onClick={() => setMode("dark")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: mode === "dark" ? "var(--bg-card, #1c1b2e)" : "transparent",
              color: mode === "dark" ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              outline: "none"
            }}
          >
            <Moon size={14} /> Dark
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemePicker;
