path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We will replace everything from `<form onSubmit={handleSubmit}>` down to `</form>`
start_idx = content.find('<form onSubmit={handleSubmit}>')
end_idx = content.find('</form>') + 7

new_form = """<form onSubmit={handleSubmit}>
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
                I agree to the <span style={{ color: 'var(--brand-color)', fontWeight: 500 }}>Terms & Conditions</span>
              </label>
            </div>

            <div className="full-width" style={{ marginTop: '16px' }}>
              <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <ArrowRight size={20} /> Create Account
              </button>
            </div>
          </div>
        </form>"""

content = content[:start_idx] + new_form + content[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Form HTML")
