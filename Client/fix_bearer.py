path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const headers = token ? { Authorization: Bearer  } : {};", "const headers = token ? { Authorization: `Bearer ${token}` } : {};")
content = content.replace("headers: { Authorization: Bearer  }", "headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
