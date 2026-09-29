path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace('Map, ArrowRight } from "lucide-react";', 'Map, ArrowRight, Calendar, Users } from "lucide-react";')

# 2. State
content = content.replace('''    district: "",
    state: "",
  });''', '''    district: "",
    state: "",
    gender: "",
    age: "",
  });''')

# 3. New Fields right before the terms-box
target_html = '''              />
            </div>

            <div className="terms-box full-width"'''

replacement_html = '''              />
            </div>

            <div className="input-box">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-icon-circle">
                  <Users size={12} />
                </span>
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select gender</option>
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
                min="10"
                max="100"
              />
            </div>

            <div className="terms-box full-width"'''

content = content.replace(target_html, replacement_html)

# 4. Modify handleSubmit to send dateOfBirth based on age
# Wait, I can just send gender and dateOfBirth in the axios post request.
target_post = '''      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        district: formData.district,
        state: formData.state,
      });'''

replacement_post = '''      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        district: formData.district,
        state: formData.state,
        gender: formData.gender,
        dateOfBirth: formData.age ? `${formData.age}` : null,
      });'''

content = content.replace(target_post, replacement_post)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Register.jsx")
