path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

old_box = """<div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", backgroundColor: "rgba(110, 63, 243, 0.03)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "12px" }}>"""
new_box = """<div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", backgroundColor: "#000000", padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "12px" }}>"""

content = content.replace(old_box, new_box)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated score box")
