import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// Make sure your CSS file is imported here!
import "../css/Forgotpassword.css"; 

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Multi-step state: 1 = Email, 2 = OTP, 3 = New Password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const API_BASE = `${import.meta.env.VITE_API_URL}/api/auth`;

  // STEP 1: Request OTP via real API
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setIsError(false);
    setStatusMessage("Sending OTP to your email...");

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage("✅ " + data.message);
        setStep(2);
      } else {
        setIsError(true);
        setStatusMessage("❌ " + data.message);
      }
    } catch (error) {
      setIsError(true);
      setStatusMessage("❌ Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP via real API
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 4) {
      setStatusMessage("Please enter the complete OTP.");
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setStatusMessage("Verifying OTP...");

    try {
      const res = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage("✅ " + data.message);
        setStep(3);
      } else {
        setIsError(true);
        setStatusMessage("❌ " + data.message);
      }
    } catch (error) {
      setIsError(true);
      setStatusMessage("❌ Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Reset password via real API
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setIsError(true);
      setStatusMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setStatusMessage("Updating your password...");

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatusMessage("✅ " + data.message);
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setIsError(true);
        setStatusMessage("❌ " + data.message);
      }
    } catch (error) {
      setIsError(true);
      setStatusMessage("❌ Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background Blobs */}
      <div className="top-left"></div>
      <div className="bottom-right"></div>
      <div className="big-circle"></div>
      <div className="small-circle"></div>

      <div className="login-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "28px" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
          }}>
            <svg viewBox="0 0 100 100" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
              <polygon points="12,48 50,10 90,10 90,48" fill="#9B66FF" />
              <polygon points="52,50 90,50 52,88" fill="#FFCE31" />
              <polygon points="20,61 48,61 48,86 10,96" fill="#FF5C5C" />
            </svg>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>
            Teaching Pariksha
          </h1>
        </div>

        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", textAlign: "center", marginBottom: "12px" }}>
          Account Recovery
        </h2>

        <p style={{ fontSize: "14px", color: "var(--text-secondary)", textAlign: "center", marginBottom: "28px", lineHeight: "1.5", padding: "0 10px" }}>
          {step === 1 && "Enter your email address and we'll send you an OTP to reset your password."}
          {step === 2 && `Type the 6-digit OTP sent to ${email}`}
          {step === 3 && "Create a new secure password for your account."}
        </p>

        {/* ─── YOUR STEP INDICATOR WIRING ─── */}
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? "active" : ""}`}>1</div>
          <div className={`step-line ${step >= 2 ? "active" : ""}`}></div>
          <div className={`step-dot ${step >= 2 ? "active" : ""}`}>2</div>
          <div className={`step-line ${step >= 3 ? "active" : ""}`}></div>
          <div className={`step-dot ${step >= 3 ? "active" : ""}`}>3</div>
        </div>

        {/* ─── YOUR STATUS MESSAGE WIRING ─── */}
        {statusMessage && (
          <div className="status-message" style={isError ? { color: "#ef4444", background: "#fef2f2" } : {}}>
            🔒 {statusMessage}
          </div>
        )}

        {/* ─── STEP 1 FORM ─── */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <div className="input-box">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., diyanathwani@gmail.com" 
                required 
              />
            </div>
            {/* Uses your disabled CSS state automatically */}
            <button type="submit" disabled={isLoading || !email}>
              {isLoading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {/* ─── STEP 2 FORM ─── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="input-box" style={{ textAlign: "center" }}>
              <label htmlFor="otp">6-Digit Security OTP</label>
              <input 
                type="text" 
                id="otp" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="• • • • • •" 
                style={{ fontSize: "20px", letterSpacing: "6px", textAlign: "center", fontWeight: "bold", color: "#6E3FF3" }}
                required 
              />
            </div>
            <button type="submit" disabled={isLoading || otp.length < 4}>
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>

            {/* ─── YOUR RESEND LINK WIRING ─── */}
            <div className="resend-link">
              Didn't receive the email? <span onClick={handleRequestOtp}>Resend Code</span>
            </div>
          </form>
        )}

        {/* ─── STEP 3 FORM ─── */}
        {step === 3 && (
          <form onSubmit={handleSavePassword}>
            <div className="input-box">
              <label htmlFor="new-pwd">New Password</label>
              <input 
                type="password" 
                id="new-pwd" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters" 
                required 
              />
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "24px", fontSize: "13px", fontWeight: "600" }}>
          <Link to="/login" style={{ color: "#64748B", textDecoration: "none" }}>← Return to Portal Login</Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;