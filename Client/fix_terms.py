path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("color: 'var(--brand-color)'", "color: '#7b3ff3'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Terms color")
