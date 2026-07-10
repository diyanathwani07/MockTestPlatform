import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft, LayoutDashboard } from "lucide-react";

function Unauthorized() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-page, #0F0F1A)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif", padding: "24px"
    }}>
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        {/* Icon */}
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "rgba(110,63,243,0.12)", border: "2px solid rgba(110,63,243,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px"
        }}>
          <ShieldOff size={36} style={{ color: "#6E3FF3" }} />
        </div>

        {/* 403 */}
        <div style={{
          fontSize: "96px", fontWeight: "900", lineHeight: 1,
          background: "linear-gradient(135deg, #6E3FF3, #a855f7)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: "16px"
        }}>403</div>

        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary, #E2E8F0)", marginBottom: "12px" }}>
          Access Denied
        </h1>
        <p style={{ fontSize: "15px", color: "var(--text-muted, #718096)", marginBottom: "32px", lineHeight: 1.6 }}>
          You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "12px 24px", borderRadius: "10px",
              border: "1.5px solid rgba(110,63,243,0.4)", background: "transparent",
              color: "#6E3FF3", fontWeight: "600", fontSize: "14px", cursor: "pointer"
            }}
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          <button
            onClick={() => navigate("/admin/dashboard")}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "12px 24px", borderRadius: "10px",
              border: "none", background: "linear-gradient(135deg, #6E3FF3, #8B5CF6)",
              color: "#fff", fontWeight: "600", fontSize: "14px", cursor: "pointer"
            }}
          >
            <LayoutDashboard size={16} /> Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default Unauthorized;
