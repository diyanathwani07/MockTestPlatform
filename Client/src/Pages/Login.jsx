import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { Eye, EyeOff, Sun, Moon, Mail, Lock, LogIn, ArrowLeft, User, Shield } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import BorderGlow from "../components/BorderGlow";
import PrepMarkMascot from "../components/PrepMarkMascot";
import "../css/Login.css";

import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const { login } = useAuth();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 560);
  const [step, setStep] = useState("landing");
  const [selectedRole, setSelectedRole] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 560);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) {
      if (role === "admin" || role === "superadmin") {
        navigate("/admin");
      } else {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user.onboardingCompleted === false && isMobile) { 
          navigate("/onboarding"); 
        } else { 
          navigate("/dashboard"); 
        }
      }
      return;
    }

    const savedEmail = localStorage.getItem("remembered_email") || "";
    const savedPassword = localStorage.getItem("remembered_password") || "";
    if (savedEmail) setEmail(savedEmail);
    if (savedPassword) setPassword(savedPassword);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          email,
          password,
        }
      );

      localStorage.setItem("remembered_email", email);
      localStorage.setItem("remembered_password", password);

      login(res.data);

      const pendingOnboarding = localStorage.getItem("pendingOnboardingData");

      if (res.data.user.role === "admin" || res.data.user.role === "superadmin") {
        navigate("/admin");
      } else if (pendingOnboarding) {
        try {
          const onboardingData = JSON.parse(pendingOnboarding);
          await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
            fullName: onboardingData.name,
            onboardingCompleted: true,
            onboardingData: onboardingData
          }, {
            headers: { Authorization: Bearer  }
          });
          localStorage.removeItem("pendingOnboardingData");
          const updatedUser = { ...res.data.user, fullName: onboardingData.name, onboardingCompleted: true, onboardingData };
          login({ user: updatedUser, token: res.data.token });
          navigate("/dashboard");
        } catch (err) {
          console.error("Failed to sync onboarding", err);
          navigate("/onboarding");
        }
      } else {
        if (!res.data.user.onboardingCompleted && isMobile) { navigate("/onboarding"); } else { navigate("/dashboard"); }
      }
    } catch (error) {
      alert(
        error.response?.data?.message || 
        error.message ||
        "Login Failed"
      );
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep("form");
  };

  const AuthContainer = !(isMobile && step === "landing") ? BorderGlow : 'div';
  const containerProps = !(isMobile && step === "landing") 
    ? { className: "login-card animate-fade-in", edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }
    : { className: "auth-content-container animate-fade-in", style: { width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", zIndex: 10 } };

return (
  <>
  
  <div className={(isMobile && step === "landing") ? "login-page full-screen-auth" : "login-page"} style={(isMobile && step === "landing") ? { width: "100vw", minHeight: "100vh", background: isDark ? "radial-gradient(circle at top, rgba(123, 63, 243, 0.15) 0%, #11101F 60%)" : "radial-gradient(circle at top, rgba(123, 63, 243, 0.1) 0%, var(--bg-body) 60%)", backgroundColor: isDark ? "#11101F" : "var(--bg-body)", margin: 0, padding: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } : {}}>
    {!(isMobile && step === "landing") && (
      <>
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
        <div className="top-left-glow"></div>
        <div className="bottom-right-glow"></div>
        <div className="grid-pattern-left"></div>
        <div className="grid-pattern-right"></div>
        <div className="glow-dot glow-dot-1"></div>
        <div className="glow-dot glow-dot-2"></div>

        <svg className="bg-wave-left" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 0,0 C 35,0 45,28 32,55 C 20,80 5,88 0,88 Z" fill="url(#left-3d-grad)" opacity="0.95" />
          <path d="M 0,10 C 35,25 38,50 18,75 C 10,85 0,90 0,90" fill="none" stroke="#00D2FF" strokeWidth="1.25" />
        </svg>

        <svg className="bg-wave-right" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 100,100 C 65,100 55,72 68,45 C 80,20 95,12 100,12 Z" fill="url(#right-3d-grad)" opacity="0.95" />
          <path d="M 100,90 C 65,75 62,50 82,25 C 90,15 100,10 100,10" fill="none" stroke="#7B3FF3" strokeWidth="1.25" />
        </svg>
      </>
    )}

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

    
    <AuthContainer {...containerProps}>


      {isMobile && step === "landing" && (
        <div className="animate-fade-in" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
          <Logo size="large" />
          
          <h2 style={{ marginTop: "48px", fontSize: "22px", color: "var(--text-primary)", fontWeight: "600" }}>Already have an account?</h2>
          <button 
            onClick={() => setStep("role")}
            style={{ width: "100%", marginTop: "16px", padding: "16px", borderRadius: "16px", background: "var(--primary)", color: "white", fontWeight: "bold", fontSize: "16px", border: "none", cursor: "pointer", boxShadow: "0 4px 0 rgba(0,0,0,0.15)" }}
          >
            SIGN IN
          </button>
          
          <div style={{ height: "1px", width: "100%", background: "rgba(138, 85, 252, 0.2)", margin: "32px 0" }}></div>

          <h2 style={{ fontSize: "22px", color: "var(--text-primary)", fontWeight: "600" }}>New to PrepMark?</h2>
          <button 
            onClick={() => setStep("intro1")}
            style={{ width: "100%", marginTop: "16px", padding: "16px", borderRadius: "16px", background: "transparent", color: "var(--primary)", border: "2px solid var(--primary)", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}
          >
            GET STARTED
          </button>
        </div>
      )}

      {isMobile && step === "intro1" && (
        <div className="animate-fade-in" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", minHeight: "400px" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <div style={{ background: isDark ? "rgba(255,255,255,0.08)" : "var(--bg-body)", padding: "16px 24px", borderRadius: "16px", border: isDark ? "1px solid rgba(255,255,255,0.15)" : "2px solid var(--border-color)", marginBottom: "24px", position: "relative" }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "18px", color: "var(--text-primary)" }}>Hi there! I'm PrepBuddy!</p>
              <div style={{ position: "absolute", bottom: "-10px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: isDark ? "10px solid rgba(255,255,255,0.15)" : "10px solid var(--border-color)" }}></div>
            </div>
            <div style={{ position: "relative" }}>
              {isDark && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "150px", height: "150px", background: "radial-gradient(circle, rgba(138, 85, 252, 0.4) 0%, rgba(0,0,0,0) 70%)", borderRadius: "50%", zIndex: 0 }}></div>}
              <div style={{ position: "relative", zIndex: 1 }}>
                <PrepMarkMascot state="welcome" size="min(200px, 35vh)" />
              </div>
            </div>
          </div>
          <button 
            onClick={() => setStep("intro2")}
            style={{ width: "100%", marginTop: "24px", padding: "16px", borderRadius: "16px", background: "var(--primary)", color: "white", fontWeight: "bold", fontSize: "16px", border: "none", cursor: "pointer", boxShadow: "0 4px 0 rgba(0,0,0,0.15)" }}
          >
            CONTINUE
          </button>
        </div>
      )}

      {isMobile && step === "intro2" && (
        <div className="animate-fade-in" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", minHeight: "400px" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
            <div style={{ background: isDark ? "rgba(255,255,255,0.08)" : "var(--bg-body)", padding: "16px 24px", borderRadius: "16px", border: isDark ? "1px solid rgba(255,255,255,0.15)" : "2px solid var(--border-color)", marginBottom: "24px", position: "relative" }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "18px", color: "var(--text-primary)" }}>Just a few quick questions before we start your preparation!</p>
              <div style={{ position: "absolute", bottom: "-10px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: isDark ? "10px solid rgba(255,255,255,0.15)" : "10px solid var(--border-color)" }}></div>
            </div>
            <div style={{ position: "relative" }}>
              {isDark && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "150px", height: "150px", background: "radial-gradient(circle, rgba(138, 85, 252, 0.4) 0%, rgba(0,0,0,0) 70%)", borderRadius: "50%", zIndex: 0 }}></div>}
              <div style={{ position: "relative", zIndex: 1 }}>
                <PrepMarkMascot state="welcome" size="min(200px, 35vh)" />
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate("/onboarding")}
            style={{ width: "100%", marginTop: "24px", padding: "16px", borderRadius: "16px", background: "var(--primary)", color: "white", fontWeight: "bold", fontSize: "16px", border: "none", cursor: "pointer", boxShadow: "0 4px 0 rgba(0,0,0,0.15)" }}
          >
            CONTINUE
          </button>
        </div>
      )}
      
      {isMobile && step === "role" && (
        <div className="animate-fade-in" style={{ textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", position: "relative" }}>
            <button 
              onClick={() => setStep("landing")}
              style={{ position: "absolute", left: 0, zIndex: 10, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px" }}
            >
              <ArrowLeft size={24} />
            </button>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <Logo size="medium" />
            </div>
          </div>

          <div className="mobile-only-mascot" style={{ width: "100%", maxWidth: "180px", margin: "0 auto", paddingBottom: "16px", display: "flex", justifyContent: "center" }}><PrepMarkMascot state="welcome" size="min(160px, 25vh)" /></div>
          
          <h2 className="login-title" style={{ marginTop: "16px" }}>Welcome Back!</h2>
          <p className="subtitle">Who is logging in today?</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "32px" }}>
            <button 
              onClick={() => handleRoleSelect("student")}
              style={{
                width: "100%", padding: "16px", borderRadius: "12px", 
                border: "2px solid var(--primary)", background: "rgba(138, 85, 252, 0.05)", 
                color: "var(--text-primary)", fontWeight: "600", fontSize: "16px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "12px"
              }}
            >
              <User size={20} color="var(--primary)" />
              Continue as Student
            </button>
            <button 
              onClick={() => handleRoleSelect("admin")}
              style={{
                width: "100%", padding: "16px", borderRadius: "12px", 
                border: "1px solid var(--border-color)", background: "var(--bg-body)", 
                color: "var(--text-primary)", fontWeight: "500", fontSize: "16px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "12px"
              }}
            >
              <Shield size={20} color="var(--text-secondary)" />
              Continue as Admin
            </button>
          </div>
        </div>
      )}

      {(!isMobile || step === "form") && (
        <div className="animate-fade-in">
          <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", position: "relative" }}>
            {isMobile && (
            <button 
              onClick={() => setStep("role")}
              style={{ position: "absolute", left: 0, zIndex: 10, background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px" }}
            >
              <ArrowLeft size={24} />
            </button>
            )}
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <Logo size={isMobile ? "medium" : "large"} />
            </div>
          </div>
          
          {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <div className="mobile-only-mascot" style={{ width: "100%", maxWidth: "160px", margin: "0 auto", paddingBottom: "12px", display: "flex", justifyContent: "center" }}><PrepMarkMascot state="welcome" size="min(140px, 20vh)" /></div>
          </div>
          )}

          <h2 className="login-title">{!isMobile ? "Welcome Back" : (selectedRole === "admin" ? "Admin Portal" : "Student Login")}</h2>
          <div className="title-underline"></div>

          <p className="subtitle">{!isMobile ? "Login to continue your preparation" : "Enter your credentials to continue"}</p>

          <form onSubmit={handleSubmit}>
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
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Lock size={12} />
                </span>
                Password
              </label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="toggle-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </span>
              </div>
            </div>

            <p className="forgot-password">
              <Link to="/forgot-password">Forgot Password?</Link>
            </p>

            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <LogIn size={18} style={{ position: 'absolute', left: '24px' }} />
              <span>Login</span>
            </button>
          </form>

          {(!isMobile || selectedRole === "student") && (
            <>
              <div className="or-divider">
                <div className="divider-line"></div>
                <span>OR</span>
                <div className="divider-line"></div>
              </div>

              <div className="register-link">
                New here?
                <Link to="/register">
                  <span> Create Account</span>
                </Link>
              </div>
            </>
          )}
        </div>
      )}

        </AuthContainer>
    </div>
    </>
);
}

export default Login;



