import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page, #0f0f13)", color: "var(--text-primary, #ffffff)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: "transparent", border: "none", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "32px", fontSize: "16px", fontWeight: "600" }}
        >
          <ArrowLeft size={20} /> Back
        </button>
        <h1 style={{ fontSize: "32px", marginBottom: "24px", color: "var(--violet, #A78BFA)" }}>Terms & Conditions</h1>
        <div style={{ lineHeight: "1.8", color: "var(--text-secondary, #9ca3af)", fontSize: "16px" }}>
          <p>Welcome to our platform. These terms and conditions outline the rules and regulations for the use of our Website.</p>
          <h2 style={{ color: "#fff", marginTop: "24px", marginBottom: "12px", fontSize: "20px" }}>1. Acceptance of Terms</h2>
          <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use the platform if you do not agree to take all of the terms and conditions stated on this page.</p>
          <h2 style={{ color: "#fff", marginTop: "24px", marginBottom: "12px", fontSize: "20px" }}>2. License</h2>
          <p>Unless otherwise stated, we or our licensors own the intellectual property rights for all material on the platform. All intellectual property rights are reserved.</p>
          <p style={{ marginTop: "32px" }}><em>This is a placeholder for your full Terms & Conditions. Please update with your official legal text.</em></p>
        </div>
      </div>
    </div>
  );
}
