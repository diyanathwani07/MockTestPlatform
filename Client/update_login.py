path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('navigate("/onboarding")', 'navigate("/onboarding", { state: { skipIntro: true } })')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Login.jsx")
