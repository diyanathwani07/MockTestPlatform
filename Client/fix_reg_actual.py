path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add state variables
if "const [step, setStep]" not in content:
    content = content.replace(
        'const [showAdminKey, setShowAdminKey] = useState(false);',
        'const [showAdminKey, setShowAdminKey] = useState(false);\n  const [step, setStep] = useState(1);\n  const [otp, setOtp] = useState("");\n  const [isLoading, setIsLoading] = useState(false);'
    )

# Add handler functions
handlers = """
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
"""

if "const handleSendOtp =" not in content:
    content = content.replace('const handleSubmit = async (e) => {', handlers + '\n  const handleSubmit = async (e) => {')


# Replace form with new form
start_idx = content.find('<form onSubmit={handleSubmit}>')
end_idx = content.find('</form>', start_idx) + 7

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
            
            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: '24px', width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "var(--violet, #6E3FF3)", color: "white", fontWeight: "600", cursor: "pointer" }} disabled={isLoading}>
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
            
            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: '24px', width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "var(--violet, #6E3FF3)", color: "white", fontWeight: "600", cursor: "pointer" }} disabled={isLoading}>
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
                I agree to the <span style={{ color: "var(--violet, #6E3FF3)" }}>Terms & Conditions</span>
              </label>
            </div>

            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: '24px', width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "var(--violet, #6E3FF3)", color: "white", fontWeight: "600", cursor: "pointer" }} disabled={isLoading}>
              <span>{isLoading ? "Creating Account..." : "Create Account"}</span>
            </button>
          </form>
        )}
"""

content = content[:start_idx] + new_form + content[end_idx:]

# Modify sub-header
target_sub = """Register to start your preparation"""
repl_sub = """{step === 1 ? "Step 1 (Identification): Phone / Email" : step === 2 ? "Step 2 (Verification): Enter OTP" : "Step 3 (Profile Details): Complete Registration"}"""
content = content.replace(target_sub, repl_sub)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Register.jsx to 3-step form")
