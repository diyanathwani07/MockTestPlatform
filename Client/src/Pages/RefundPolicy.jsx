import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RefundPolicy() {
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
        <h1 style={{ fontSize: "32px", marginBottom: "24px", color: "var(--violet, #A78BFA)" }}>Refunds & Cancellation Policy</h1>
        <div style={{ lineHeight: "1.8", color: "var(--text-secondary, #9ca3af)", fontSize: "16px" }}>
          <p>Thank you for purchasing our courses and test series. We want to ensure you have a rewarding experience while you're discovering, evaluating, and purchasing our products.</p>
          <h2 style={{ color: "#fff", marginTop: "24px", marginBottom: "12px", fontSize: "20px" }}>1. Cancellation</h2>
          <p>Users can cancel their subscriptions or purchases within 24 hours of the transaction, provided no mock tests or premium content has been accessed or attempted.</p>
          <h2 style={{ color: "#fff", marginTop: "24px", marginBottom: "12px", fontSize: "20px" }}>2. Refunds</h2>
          <p>Once a cancellation request is approved, the refund will be processed and credited back to the original method of payment within 5-7 business days.</p>
          <p style={{ marginTop: "32px" }}><em>This is a placeholder for your full Refunds & Cancellation Policy. Please update with your official legal text.</em></p>
        </div>
      </div>
    </div>
  );
}
