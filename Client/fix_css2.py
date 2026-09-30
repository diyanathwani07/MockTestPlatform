path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/MyExams.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix .me-exam-card
old_card = """.me-exam-card {
  background: #0B0A10;
  border: 1px solid rgba(110, 63, 243, 0.4);"""
new_card = """.me-exam-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);"""
content = content.replace(old_card, new_card)

# Append Dark Mode rules
dark_mode_css = """
/* Dark mode specifically requested deep dark blue with purple border */
body.dark-mode .me-exam-card,
.dark .me-exam-card {
  background: #0B0A10;
  border: 1px solid rgba(110, 63, 243, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.sr-score-box {
  background: var(--bg-body, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
}

body.dark-mode .sr-score-box,
.dark .sr-score-box {
  background: #000000;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
"""
content += dark_mode_css

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MyExams.css with Theme classes")
