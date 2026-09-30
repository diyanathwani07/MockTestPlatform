path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove inline dark mode styles from .me-exam-card
target_card_inline = """                          boxSizing: "border-box",
                          backgroundColor: "#0B0A10",
                          border: "1px solid rgba(110, 63, 243, 0.4)",
                          borderRadius: "16px",
                          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
                        }}"""
replacement_card_inline = """                          boxSizing: "border-box",
                          borderRadius: "16px",
                        }}"""
content = content.replace(target_card_inline, replacement_card_inline)

# Remove inline dark mode styles from the score box
target_box_inline = """<div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", backgroundColor: "#000000", padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "12px" }}>"""
replacement_box_inline = """<div className="sr-score-box" style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", padding: "12px 16px", borderRadius: "10px", marginBottom: "12px" }}>"""
content = content.replace(target_box_inline, replacement_box_inline)

# Add CSS classes to Practice.css or MyExams.css to handle light/dark mode for these elements
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed inline styles")
