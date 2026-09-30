path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Update card container
old_card = """className="me-exam-card" 
                        style={{ 
                          cursor: "default", 
                          padding: "20px", 
                          display: "flex", 
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "14px",
                          minHeight: "230px",
                          boxSizing: "border-box"
                        }}"""
new_card = """className="me-exam-card" 
                        style={{ 
                          cursor: "default", 
                          padding: "20px", 
                          display: "flex", 
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "14px",
                          minHeight: "230px",
                          boxSizing: "border-box",
                          backgroundColor: "#0B0A10",
                          border: "1px solid rgba(110, 63, 243, 0.4)",
                          borderRadius: "16px",
                          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
                        }}"""
content = content.replace(old_card, new_card)

# Update Result button
old_res_btn = """style={{ flex: 1, padding: "10px", background: "transparent", color: "#6E3FF3", border: "1.5px solid #6E3FF3", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}"""
new_res_btn = """style={{ flex: 1, padding: "12px", background: "transparent", color: "#8A5CF5", border: "1px solid rgba(110, 63, 243, 0.6)", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "all 0.2s" }}"""
content = content.replace(old_res_btn, new_res_btn)

# Update Reattempt button
old_reat_btn = """style={{ flex: 1, padding: "10px", background: "#1F1D2B", color: "#ffffff", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}"""
new_reat_btn = """style={{ flex: 1, padding: "12px", background: "#1F1D2B", color: "#ffffff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "all 0.2s" }}"""
content = content.replace(old_reat_btn, new_reat_btn)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SubjectResults styles")
