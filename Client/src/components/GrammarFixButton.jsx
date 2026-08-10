import React, { useState } from "react";
import axios from "axios";

export default function GrammarFixButton({ text, onApply }) {
  const [loading, setLoading] = useState(false);
  const [correctedText, setCorrectedText] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const wordCount = (text || "").trim().split(/\s+/).filter(Boolean).length;
  const isButtonDisabled = wordCount < 5;

  const handleFixGrammar = async () => {
    if (isButtonDisabled) return;
    setLoading(false);
    setErrorMsg(null);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ai/fix-grammar`,
        { text },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data?.correctedText !== undefined) {
        setCorrectedText(res.data.correctedText);
      } else {
        throw new Error("No correction text returned.");
      }
    } catch (error) {
      console.error("Grammar Fix Action Error:", error);
      setErrorMsg(
        error.response?.data?.message || "Grammar check is temporarily unavailable, please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (correctedText) {
      onApply(correctedText);
    }
    setCorrectedText(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          type="button"
          onClick={handleFixGrammar}
          disabled={loading || isButtonDisabled}
          style={{
            background: isButtonDisabled ? "transparent" : "rgba(110, 63, 243, 0.08)",
            color: isButtonDisabled ? "var(--text-muted)" : "var(--violet)",
            border: isButtonDisabled ? "1px dashed var(--border-color)" : "1px solid rgba(110, 63, 243, 0.3)",
            borderRadius: "6px",
            padding: "4px 10px",
            fontSize: "11.5px",
            fontWeight: "600",
            cursor: isButtonDisabled ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s ease",
            opacity: isButtonDisabled ? 0.5 : 1,
            pointerEvents: loading ? "none" : "auto",
          }}
          onMouseEnter={(e) => {
            if (!isButtonDisabled) {
              e.currentTarget.style.background = "rgba(110, 63, 243, 0.15)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isButtonDisabled) {
              e.currentTarget.style.background = "rgba(110, 63, 243, 0.08)";
            }
          }}
        >
          {loading ? "✨ Checking..." : "✨ Fix Grammar"}
        </button>

        {errorMsg && (
          <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: "500" }}>
            ⚠️ {errorMsg}
          </span>
        )}
      </div>

      {correctedText !== null && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: "12px",
            width: "100%",
            minWidth: "300px",
            background: "var(--bg-card, #1E1E2D)",
            border: "1.5px solid var(--violet)",
            borderRadius: "10px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "0 -8px 25px rgba(0,0,0,0.4)",
            zIndex: 100,
            animation: "slideDown 0.2s ease-out",
          }}
        >
          <div style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--text-secondary)" }}>
            AI Suggestion Preview:
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-primary)",
              lineHeight: "1.5",
              background: "rgba(0,0,0,0.2)",
              padding: "8px 10px",
              borderRadius: "6px",
              borderLeft: "3.5px solid var(--violet)",
              whiteSpace: "pre-wrap",
            }}
          >
            {correctedText || <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>(No changes suggested)</span>}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={handleApply}
              style={{
                background: "var(--violet)",
                color: "#FFF",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#5b21b6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "var(--violet)"}
            >
              Apply Suggestion
            </button>
            <button
              type="button"
              onClick={() => setCorrectedText(null)}
              style={{
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              Keep Original
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
