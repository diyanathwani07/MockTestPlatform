import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
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

    if (res.data.user.role === "admin") {
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
    <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
      <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
        <div className="pill-track-icons"><span>☀️</span><span>🌙</span></div>
        <div className="pill-thumb-slider"></div>
      </div>
    </div>
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

      <h2>Welcome Back</h2>

      <p>Login to continue your preparation</p>

      <form onSubmit={handleSubmit}>
        <div className="input-box">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-box">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
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

        <button type="submit">Login</button>
      </form>

      <div className="register-link">
        New here?
        <Link to="/register">
          <span> Create Account</span>
        </Link>
      </div>
    </div>
  </div>
);
}

export default Login;
