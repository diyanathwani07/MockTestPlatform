import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { Eye, EyeOff, Sun, Moon, Mail, Lock, LogIn, Shield } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import "../css/Login.css";

function Login() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);

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

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    localStorage.setItem("role", res.data.user.role);

    if (res.data.user.role === "admin" || res.data.user.role === "superadmin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  } catch (error) {
    alert(
      error.response?.data?.message ||
      "Login Failed"
    );
  }
};

return (
  <div className="login-page">
    {/* SVG Gradients definition */}
    <svg style={{ width: 0, height: 0, position: 'absolute' }}>
      <defs>
        <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="purple-grad" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#7B3FF3" />
          <stop offset="100%" stopColor="#7B3FF3" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>

    <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
      <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
        <div className="pill-track-icons"><span><Sun size={14} /></span><span><Moon size={14} /></span></div>
        <div className="pill-thumb-slider"></div>
      </div>
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
      <path d="M 0,0 C 40,0 45,30 20,60 C 5,80 15,95 0,100 Z" fill="url(#blue-grad)" opacity="0.12" />
      <path d="M 0,0 C 40,0 45,30 20,60 C 5,80 15,95 0,100" fill="none" stroke="#00D2FF" strokeWidth="0.75" />
    </svg>

    <svg className="bg-wave-right" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M 100,0 C 85,15 80,40 90,65 C 95,80 75,90 100,100 Z" fill="url(#purple-grad)" opacity="0.12" />
      <path d="M 100,0 C 85,15 80,40 90,65 C 95,80 75,90 100,100" fill="none" stroke="#7B3FF3" strokeWidth="0.75" />
    </svg>

    <div className="login-card animate-fade-in">
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

      <div className="secure-footer">
        <Shield size={16} />
        <span>Your data is secure with us</span>
      </div>
    </div>
  </div>
);
}

export default Login;
