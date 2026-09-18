import React from "react";
import { Link } from "react-router-dom";

export default function SimpleFooter() {
  return (
    <div style={{ 
      width: "100%", 
      padding: "30px 20px", 
      background: "var(--bg-card, #1c1c1c)", 
      borderTop: "1px solid rgba(255,255,255,0.1)",
      display: "flex",
      justifyContent: "center",
      marginTop: "auto"
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "400px",
        textAlign: "left"
      }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>Legal</h3>
        <Link to="/terms-conditions" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "#fff"} onMouseLeave={(e) => e.target.style.color = "#9ca3af"}>
          Terms & Conditions
        </Link>
        <Link to="/privacy-policy" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "#fff"} onMouseLeave={(e) => e.target.style.color = "#9ca3af"}>
          Privacy Policy
        </Link>
        <Link to="/refund-policy" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "14px", transition: "color 0.2s" }} onMouseEnter={(e) => e.target.style.color = "#fff"} onMouseLeave={(e) => e.target.style.color = "#9ca3af"}>
          Refunds & Cancellation Policy
        </Link>
      </div>
    </div>
  );
}
