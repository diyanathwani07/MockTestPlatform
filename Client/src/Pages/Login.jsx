import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {

    e.preventDefault();

    alert("Login Successful");

    navigate("/starttest");

  };

  return (
    <div className="login-page">

      <div className="top-left"></div>
      <div className="bottom-right"></div>
      <div className="big-circle"></div>
      <div className="small-circle"></div>

      <div className="login-card">

        <div className="logo-section">

          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135755.png"
            alt="logo"
          />

          <h1>Teaching Pariksha</h1>

        </div>

        <h2>Welcome Back</h2>

        <p>
          Login to continue your preparation
        </p>

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

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

          </div>

          <button type="submit">
            Login
          </button>

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