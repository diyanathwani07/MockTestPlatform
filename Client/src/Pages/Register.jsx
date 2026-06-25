import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import "../css/Register.css";


function Register() {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    district: "",
    state: "",
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
          <div className="pill-track-icons"><span>☀️</span><span>🌙</span></div>
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

        <h2>Create Account</h2>

        <p className="subtitle">
          Register to start your preparation
        </p>

        <form onSubmit={handleSubmit}>

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

          <div className="input-box">
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
            <input
              type="password"
              name="password"
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-box">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
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

          <div className="terms-box">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">
              I agree to the Terms & Conditions
            </label>
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