import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../components/Logo";
import { Sun, Moon, Mail, Key, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import BorderGlow from "../components/BorderGlow";
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
  const [showPassword, setShowPassword] = useState(false);

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

  const { toggleTheme, isDark } = useTheme();

  return (
    <div className="login-page">
      {/* SVG Gradients definition */}
      <svg style={{ width: 0, height: 0, position: 'absolute' }}>
        <defs>
          <linearGradient id="left-3d-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D2FF" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#7B3FF3" />
          </linearGradient>
          <linearGradient id="right-3d-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#7B3FF3" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
        <button 
          onClick={toggleTheme} 
          title="Switch Theme"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            borderRadius: "50%",
          }}
        >
          {isDark ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      {/* Decorative Background Elements */}
      <div className="top-left-glow"></div>
      <div className="bottom-right-glow"></div>
      <div className="grid-pattern-left"></div>
      <div className="grid-pattern-right"></div>
      <div className="glow-dot glow-dot-1"></div>
      <div className="glow-dot glow-dot-2"></div>

      {/* Responsive Inline SVG Waves matching mockup */}
      <svg className="bg-wave-left" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 0,0 C 35,0 45,28 32,55 C 20,80 5,88 0,88 Z" fill="url(#left-3d-grad)" opacity="0.95" />
        <path d="M 0,10 C 35,25 38,50 18,75 C 10,85 0,90 0,90" fill="none" stroke="#00D2FF" strokeWidth="1.25" />
      </svg>

      <svg className="bg-wave-right" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M 100,100 C 65,100 55,72 68,45 C 80,20 95,12 100,12 Z" fill="url(#right-3d-grad)" opacity="0.95" />
        <path d="M 100,90 C 65,75 62,50 82,25 C 90,15 100,10 100,10" fill="none" stroke="#7B3FF3" strokeWidth="1.25" />
      </svg>

      <BorderGlow
        className="login-card animate-fade-in"
        edgeSensitivity={30}
        glowColor="260 85 70"
        borderRadius={28}
        glowRadius={40}
        glowIntensity={1.2}
        coneSpread={25}
        animated={true}
        colors={['#7B3FF3', '#00D2FF', '#EC4899']}
        alwaysGlow={true}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <Logo size="large" />
        </div>

        <h2 className="login-title">Account Recovery</h2>
        <div className="title-underline"></div>

        <p className="subtitle">
          {step === 1 && "Enter your email address and we'll send you an OTP to reset your password."}
          {step === 2 && `Type the 6-digit OTP sent to ${email}`}
          {step === 3 && "Create a new secure password for your account."}
        </p>

        {/* ─── STEP INDICATOR ─── */}
        <div className="step-indicator">
          <div className={`step-dot ${step >= 1 ? "active" : ""}`}>1</div>
          <div className={`step-line ${step >= 2 ? "active" : ""}`}></div>
          <div className={`step-dot ${step >= 2 ? "active" : ""}`}>2</div>
          <div className={`step-line ${step >= 3 ? "active" : ""}`}></div>
          <div className={`step-dot ${step >= 3 ? "active" : ""}`}>3</div>
        </div>

        {/* ─── STATUS MESSAGE WIRING ─── */}
        {statusMessage && (
          <div className="status-message" style={isError ? { color: "#ef4444", background: "#fef2f2", borderColor: "#fecaca" } : {}}>
            🔒 {statusMessage}
          </div>
        )}

        {/* ─── STEP 1 FORM ─── */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Mail size={12} />
                </span>
                Email Address
              </label>
              <input 
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., your@gmail.com" 
                required 
              />
            </div>
            <button type="submit" disabled={isLoading || !email}>
              {isLoading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {/* ─── STEP 2 FORM ─── */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="input-box" style={{ textAlign: "center" }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px' }}>
                <span className="label-icon-circle">
                  <Key size={12} />
                </span>
                6-Digit Security OTP
              </label>
              <input 
                type="text" 
                id="otp" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="• • • • • •" 
                style={{ fontSize: "20px", letterSpacing: "6px", textAlign: "center", fontWeight: "bold", color: "#6E3FF3", width: "100%", height: "52px" }}
                required 
              />
            </div>
            <button type="submit" disabled={isLoading || otp.length < 4}>
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="resend-link">
              Didn't receive the email? <span onClick={handleRequestOtp}>Resend Code</span>
            </div>
          </form>
        )}

        {/* ─── STEP 3 FORM ─── */}
        {step === 3 && (
          <form onSubmit={handleSavePassword}>
            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Lock size={12} />
                </span>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="new-pwd" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters" 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "24px", fontSize: "13.5px", fontWeight: "600", textAlign: "center" }} className="return-login">
          <Link to="/login" style={{ textDecoration: "none", display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Return to Portal Login
          </Link>
        </div>

      </BorderGlow>
    </div>
  );
};

export default ForgotPassword;