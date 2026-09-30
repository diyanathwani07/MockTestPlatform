import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Eye, EyeOff, User, Phone, Mail, Lock, MapPin, Map, ArrowRight, Calendar, Users } from "lucide-react";
import BorderGlow from "../components/BorderGlow";
import SimpleFooter from "../components/SimpleFooter";
import "../css/Login.css";
import "../css/Register.css";


function Register() {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 560);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 560);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    confirmPassword: "",
    state: "",
    gender: "",
    age: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (formData.password !== formData.confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  try {
    setIsLoading(true);
    const isEmail = formData.identifier.includes("@");
    const email = isEmail ? formData.identifier : `${formData.identifier}@temp.prepmark.com`;
    const phone = isEmail ? "" : formData.identifier;
    const fullName = isEmail ? formData.identifier.split("@")[0] : "Student";
    
    const res = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/auth/register`,
  {
    fullName: fullName,
    email: email,
    phone: phone,
    password: formData.password,
    state: formData.state,
    gender: formData.gender,
    dateOfBirth: formData.age,
    role: "user",
  }
);

    alert(res.data.message);

    navigate("/");
    setIsLoading(false);
  } catch (error) {
  console.log(error.response);
  console.log(error.response?.data);

  alert(
    error.response?.data?.message ||
    error.message ||
    "Registration Failed"
  );
  setIsLoading(false);
}
  };

    const AuthContainer = !isMobile ? BorderGlow : 'div';
  const containerProps = !isMobile 
    ? { className: "register-card animate-fade-in", style: { maxWidth: "900px", width: "90%" }, edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }
    : { className: "auth-content-container animate-fade-in", style: { width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", zIndex: 10 } };

return (
    <>
    
  <div className={isMobile ? "login-page full-screen-auth" : "login-page"} style={isMobile ? { width: "100vw", minHeight: "100vh", background: isDark ? "radial-gradient(circle at top, rgba(123, 63, 243, 0.15) 0%, #11101F 60%)" : "radial-gradient(circle at top, rgba(123, 63, 243, 0.1) 0%, var(--bg-body) 60%)", backgroundColor: isDark ? "#11101F" : "var(--bg-body)", margin: 0, padding: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } : {}}>
    {!isMobile && (
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

      {/* SVG Gradients definition */}
      

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
      
      
      
      
      
      

      {/* Responsive Inline SVG Waves matching mockup */}
      

      

      
    <AuthContainer {...containerProps}>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <Logo size="large" />
        </div>

        <h2 className="login-title">Create Account</h2>
        <div className="title-underline"></div>

        <p className="subtitle">
          Register to start your preparation
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Phone size={12} />
                </span>
                Phone Number / Email
              </label>
              <input
                type="text"
                name="identifier"
                placeholder="Enter your email or phone number"
                value={formData.identifier}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Map size={12} />
                </span>
                State
              </label>
              <input
                type="text"
                name="state"
                placeholder="Enter state"
                value={formData.state}
                onChange={handleChange}
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
                  name="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
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

            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Lock size={12} />
                </span>
                Confirm Password
              </label>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <span 
                  className="toggle-eye"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </span>
              </div>
            </div>

            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <User size={12} />
                </span>
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="" disabled hidden>Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Calendar size={12} />
                </span>
                Age
              </label>
              <input
                type="number"
                name="age"
                placeholder="Enter age"
                value={formData.age}
                onChange={handleChange}
                required
              />
            </div>

            <div className="terms-box full-width" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input type="checkbox" id="terms" required style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="terms" style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                I agree to the <span style={{ color: '#7b3ff3', fontWeight: 500 }}>Terms & Conditions</span>
              </label>
            </div>

            <div className="full-width" style={{ marginTop: '16px' }}>
              <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <ArrowRight size={20} /> Create Account
              </button>
            </div>
          </div>
        </form>

        <div className="register-link" style={{ marginTop: '24px' }}>
          Already have an account?
          <Link to="/">
            <span> Login</span>
          </Link>
        </div>
          </AuthContainer>
    </div>
    <SimpleFooter />
    </>
  );
}

export default Register;