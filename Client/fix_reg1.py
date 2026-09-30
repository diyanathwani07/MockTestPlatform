path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update State
old_state = """  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    district: "",
    state: "",
    gender: "",
    age: "",
  });"""
new_state = """  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    confirmPassword: "",
    state: "",
    gender: "",
    age: "",
  });"""
content = content.replace(old_state, new_state)

# 2. Update Submit Logic
old_submit = """    const res = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/auth/register`,
  {
    fullName: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    password: formData.password,
    district: formData.district,
    state: formData.state,
    role: "user",
  }
);"""

new_submit = """    const isEmail = formData.identifier.includes("@");
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
);"""
content = content.replace(old_submit, new_submit)

# 3. Update containerProps
old_props = """const containerProps = !isMobile 
    ? { className: "login-card animate-fade-in", edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }"""
new_props = """const containerProps = !isMobile 
    ? { className: "register-card animate-fade-in", style: { maxWidth: "900px", width: "90%" }, edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }"""
content = content.replace(old_props, new_props)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated basic logic")
