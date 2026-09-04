import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { Eye, EyeOff, Sun, Moon, Mail, Lock, LogIn, Shield } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import BorderGlow from "../components/BorderGlow";
import "../css/Login.css";

import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) {
      if (role === "admin" || role === "superadmin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
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

      console.log(res.data);

      // Save credentials for auto-fill on next load
      localStorage.setItem("remembered_email", email);
      localStorage.setItem("remembered_password", password);

      login(res.data);

      if (res.data.user.role === "admin" || res.data.user.role === "superadmin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      alert(
        error.response?.data?.message || 
        error.message ||
        "Login Failed"
      );
    }
  };

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

      <h2 className="login-title">Welcome Back</h2>
      <div className="title-underline"></div>

      <p className="subtitle">Login to continue your preparation</p>

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
    </BorderGlow>
  </div>
);
}

export default Login;
