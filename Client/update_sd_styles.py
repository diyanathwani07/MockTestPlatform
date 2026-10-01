path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('style={{ padding: 0, border: "none", background: "transparent", boxShadow: "none" }}', 'style={{ padding: 0, border: "none", background: "transparent", boxShadow: "none", display: "flex", flexDirection: "column", height: "100%" }}')

content = content.replace('className="sd-upcoming-section"', 'className="sd-upcoming-section" style={{ display: "flex", flexDirection: "column", height: "100%" }}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentDashboard.jsx styles")
