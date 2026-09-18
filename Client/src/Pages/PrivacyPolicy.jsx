import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
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
        <h1 style={{ fontSize: "32px", marginBottom: "24px", color: "var(--violet, #A78BFA)" }}>Privacy Policy</h1>
        <div style={{ lineHeight: "1.8", color: "var(--text-secondary, #9ca3af)", fontSize: "16px" }}>
          <p>Your privacy is important to us. It is our policy to respect your privacy regarding any information we may collect from you across our website.</p>
          <h2 style={{ color: "#fff", marginTop: "24px", marginBottom: "12px", fontSize: "20px" }}>1. Information We Collect</h2>
          <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</p>
          <h2 style={{ color: "#fff", marginTop: "24px", marginBottom: "12px", fontSize: "20px" }}>2. Use of Information</h2>
          <p>We use the information we collect to operate, maintain, and provide you with the features and functionality of the Service, as well as to communicate directly with you.</p>
          <p style={{ marginTop: "32px" }}><em>This is a placeholder for your full Privacy Policy. Please update with your official legal text.</em></p>
        </div>
      </div>
    </div>
  );
}
