path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'Welcome Back' in line:
        print(f"Line {i+1}: {line.strip()}")
