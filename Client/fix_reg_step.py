path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Add step and OTP states
state_addition = """
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
"""
content = content.replace("const [showAdminKey, setShowAdminKey] = useState(false);", "const [showAdminKey, setShowAdminKey] = useState(false);" + state_addition)

# Add Step 1 and Step 2 handlers
handlers_addition = """
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!formData.identifier) {
      alert("Please enter Phone Number or Email");
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/send-register-otp`, {
        email: formData.identifier
      });
      alert(res.data.message || "OTP sent successfully!");
      setStep(2);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      alert("Please enter the OTP");
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify-otp`, {
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
"""

content = content.replace("const handleSubmit = async (e) => {", handlers_addition + "\n  const handleSubmit = async (e) => {")

# Replace form with multi-step logic
target_form = content[content.find('<form'):content.find('</form>')+7]

new_form = """
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
            
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send OTP"} <ArrowRight size={18} />
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
            
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify OTP"} <ArrowRight size={18} />
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
                <div className="password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <span
                    className="toggle-password"
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
                    className="toggle-password"
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
                <select name="gender" value={formData.gender} onChange={handleChange} required>
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
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

            <div className="terms-checkbox">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">
                I agree to the <Link to="/terms">Terms & Conditions</Link>
              </label>
            </div>

            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"} <ArrowRight size={18} />
            </button>
          </form>
        )}
"""

content = content.replace(target_form, new_form)

# Add setIsLoading(true/false) to handleSubmit
content = content.replace("const handleSubmit = async (e) => {\n  e.preventDefault();\n\n  if (formData.password !== formData.confirmPassword) {\n    alert(\"Passwords do not match!\");\n    return;\n  }", "const handleSubmit = async (e) => {\n  e.preventDefault();\n\n  if (formData.password !== formData.confirmPassword) {\n    alert(\"Passwords do not match!\");\n    return;\n  }\n  setIsLoading(true);")
content = content.replace("alert(res.data.message);\n\n    navigate(\"/\");", "alert(res.data.message);\n\n    navigate(\"/\");\n  } catch (error) {\n    alert(error.response?.data?.message || \"Failed to register.\");\n  } finally {\n    setIsLoading(false);\n  }")

# Wait, the replace string for try/catch might be messy if I have to replace a big chunk. Let's do it manually with regex or split/join.
"""
  try {
    ...
    alert(res.data.message);
    navigate("/");
  } catch (error) {
    ...
  }
"""
