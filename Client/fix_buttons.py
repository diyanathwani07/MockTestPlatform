path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Result Button
target_result = """style={{ flex: 1, padding: "12px", background: "transparent", color: "#8A5CF5", border: "1px solid rgba(110, 63, 243, 0.6)", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "all 0.2s" }}"""
replacement_result = """className="sr-result-btn" style={{ flex: 1, padding: "12px", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "all 0.2s" }}"""
content = content.replace(target_result, replacement_result)

# Reattempt Button
target_reattempt = """style={{ flex: 1, padding: "12px", background: "#1F1D2B", color: "#ffffff", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "all 0.2s" }}"""
replacement_reattempt = """className="sr-reattempt-btn" style={{ flex: 1, padding: "12px", borderRadius: "12px", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", transition: "all 0.2s" }}"""
content = content.replace(target_reattempt, replacement_reattempt)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Button Inline Styles")
