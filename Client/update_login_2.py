path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target_check = """          {(!isMobile || selectedRole === "student") && ("""
replacement_check = """          {true && ("""
content = content.replace(target_check, replacement_check)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Login.jsx register link")
