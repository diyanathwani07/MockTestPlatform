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
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/send-register-otp`, {
        email: formData.identifier
      });
      alert("OTP sent successfully!");
      setStep(2);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      alert("Please enter a valid 6-digit OTP.");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify-otp`, {
        email: formData.identifier,
        otp: otp
      });
      alert("OTP Verified Successfully!");
      setStep(3);
    } catch (error) {
      alert(error.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
    ? { className: "register-card animate-fade-in", style: { maxWidth: step === 3 ? "750px" : "500px", width: "100%" }, edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }
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



        
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div className="input-box" style={{ marginBottom: "24px" }}>
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
            
            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: '24px', width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "var(--violet)", color: "var(--primary-foreground)", fontWeight: "600", cursor: "pointer" }} disabled={isLoading}>
              <span>{isLoading ? "Sending..." : "Send OTP"}</span>
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className="input-box" style={{ marginBottom: "24px" }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Lock size={12} />
                </span>
                Enter OTP
              </label>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
                style={{ letterSpacing: "4px", textAlign: "center", fontSize: "18px" }}
              />
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", textAlign: "center" }}>
                OTP sent to {formData.identifier}
              </p>
            </div>
            
            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: '24px', width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "var(--violet)", color: "var(--primary-foreground)", fontWeight: "600", cursor: "pointer" }} disabled={isLoading}>
              <span>{isLoading ? "Verifying..." : "Verify OTP"}</span>
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
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
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <span
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--text-secondary)" }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <span
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--text-secondary)" }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                <select name="gender" value={formData.gender} onChange={handleChange} required
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "10px",
                    border: "1px solid var(--border-color)", background: "transparent",
                    color: "var(--text-primary)", fontSize: "14px", outline: "none"
                  }}
                >
                  <option value="" disabled style={{ color: "#000" }}>Select gender</option>
                  <option value="male" style={{ color: "#000" }}>Male</option>
                  <option value="female" style={{ color: "#000" }}>Female</option>
                  <option value="other" style={{ color: "#000" }}>Other</option>
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
                  min="10"
                  max="100"
                  required
                />
              </div>
            </div>

            <div className="terms-box full-width" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <input type="checkbox" id="terms" required style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="terms" style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none', color: "var(--text-secondary)" }}>
                I agree to the <span style={{ color: "var(--violet)" }}>Terms & Conditions</span>
              </label>
            </div>

            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: '24px', width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "var(--violet)", color: "var(--primary-foreground)", fontWeight: "600", cursor: "pointer" }} disabled={isLoading}>
              <span>{isLoading ? "Creating Account..." : "Create Account"}</span>
            </button>
          </form>
        )}


        <div className="register-link" style={{ marginTop: '24px' }}>
          Already have an account?
          <Link to="/">
            <span> Login</span>
          </Link>
        </div>
          </AuthContainer>
    </div>
    <SimpleFooter hideOnMobile={true} />
    </>
  );
}

export default Register;