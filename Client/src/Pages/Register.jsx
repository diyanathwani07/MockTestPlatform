import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Eye, EyeOff } from "lucide-react";
import "../css/Register.css";


function Register() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    district: "",
    state: "",
    registerAs: "Student",
    adminSecretKey: "",
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
    const res = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/auth/register`,
  {
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    password: formData.password,
    district: formData.district,
    state: formData.state,
    role: formData.registerAs === "Admin" ? "admin" : "user",
    adminSecretKey: formData.registerAs === "Admin" ? formData.adminSecretKey : undefined,
  }
);

    alert(res.data.message);

    navigate("/");
  } catch (error) {
  console.log(error.response);
  console.log(error.response?.data);

  alert(
    error.response?.data?.message ||
    error.message ||
    "Registration Failed"
  );
}
  };

  return (
    <div className="register-page">
      <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1000 }}>
        <div className="theme-pill-switch" onClick={toggleTheme} title="Switch Theme">
          <div className="pill-track-icons"><span><Sun size={14} /></span><span><Moon size={14} /></span></div>
          <div className="pill-thumb-slider"></div>
        </div>
      </div>

      {/* Background Shapes */}
      <div className="top-left"></div>
      <div className="bottom-right"></div>
      <div className="big-circle"></div>
      <div className="small-circle"></div>

      {/* Register Card */}
      <div className="register-card">

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <Logo size="large" />
        </div>

        <h2>Create Account</h2>

        <p className="subtitle">
          Register to start your preparation
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="input-box full-width">
              <label>Register As</label>
              <select
                name="registerAs"
                value={formData.registerAs}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                }}
              >
                <option value="Student" style={{ color: "#000" }}>Student</option>
                <option value="Admin" style={{ color: "#000" }}>Admin</option>
              </select>
            </div>

            {formData.registerAs === "Admin" && (
              <div className="input-box full-width">
                <label>Admin Registration Key</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showAdminKey ? "text" : "password"}
                    name="adminSecretKey"
                    placeholder="Enter Admin Secret Key"
                    value={formData.adminSecretKey}
                    onChange={handleChange}
                    required
                    style={{ paddingRight: "50px" }}
                  />
                  <div 
                    style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}
                    onClick={() => setShowAdminKey(!showAdminKey)}
                  >
                    {showAdminKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </div>
                </div>
              </div>
            )}

            <div className="input-box">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-box">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-box full-width">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-box">
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: "50px" }}
                />
                <div 
                  style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </div>

            <div className="input-box">
              <label>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: "50px" }}
                />
                <div 
                  style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "var(--text-secondary)", display: "flex" }}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </div>

            <div className="input-box">
              <label>District</label>
              <input
                type="text"
                name="district"
                placeholder="Enter district"
                value={formData.district}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-box">
              <label>State</label>
              <input
                type="text"
                name="state"
                placeholder="Enter state"
                value={formData.state}
                onChange={handleChange}
                required
              />
            </div>

            <div className="terms-box full-width">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">
                I agree to the Terms & Conditions
              </label>
            </div>
          </div>

          <button type="submit">
            Create Account
          </button>

        </form>

        <div className="register">
          Already have an account?
          <Link to="/">
            <span> Login</span>
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Register;