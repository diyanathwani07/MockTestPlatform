import re
path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/PracticeDashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<div className="meta-item">\s*<Clock size=\{14\} />\s*<span>Untimed</span>\s*</div>', '', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed Untimed div")
