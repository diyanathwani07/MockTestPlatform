path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update SIGN IN button to go directly to "form"
target_signin = """            <h2 style={{ marginTop: "48px", fontSize: "22px", color: "var(--text-primary)", fontWeight: "600" }}>Already have an account?</h2>
            <button 
              onClick={() => setStep("role")}"""
replacement_signin = """            <h2 style={{ marginTop: "48px", fontSize: "22px", color: "var(--text-primary)", fontWeight: "600" }}>Already have an account?</h2>
            <button 
              onClick={() => setStep("form")}"""
content = content.replace(target_signin, replacement_signin)

# 2. Update back button in form step to go to "landing"
target_back = """            <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", position: "relative" }}>
              {isMobile && (
              <button 
                onClick={() => setStep("role")}"""
replacement_back = """            <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", position: "relative" }}>
              {isMobile && (
              <button 
                onClick={() => setStep("landing")}"""
content = content.replace(target_back, replacement_back)

# 3. Update the login title
target_title = """          <h2 className="login-title">{!isMobile ? "Welcome Back" : (selectedRole === "admin" ? "Admin Portal" : "Student Login")}</h2>"""
replacement_title = """          <h2 className="login-title">{!isMobile ? "Welcome Back" : "Welcome Back!"}</h2>"""
content = content.replace(target_title, replacement_title)

# 4. Optional: If there's an issue with selectedRole, maybe the form needs it? 
# Wait, let's check if selectedRole is used for the API call.
# Actually I'll just write it and then check.

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Login.jsx")
