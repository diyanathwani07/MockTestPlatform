path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/MyExams.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

btn_css = """
/* SubjectResults Buttons Light/Dark Mode Support */
.sr-result-btn {
  background: transparent;
  color: var(--brand-color, #7B3FF3);
  border: 1px solid var(--brand-color, #7B3FF3);
}
.sr-result-btn:hover {
  background: rgba(110, 63, 243, 0.05);
}

.sr-reattempt-btn {
  background: var(--bg-hover, #f3f4f6);
  color: var(--text-primary, #111827);
  border: 1px solid var(--border-color, #e5e7eb);
}
.sr-reattempt-btn:hover {
  background: var(--border-color, #e5e7eb);
}

body.dark-mode .sr-result-btn,
.dark .sr-result-btn {
  color: #8A5CF5;
  border: 1px solid rgba(110, 63, 243, 0.6);
}

body.dark-mode .sr-reattempt-btn,
.dark .sr-reattempt-btn {
  background: #1F1D2B;
  color: #ffffff;
  border: none;
}
body.dark-mode .sr-reattempt-btn:hover,
.dark .sr-reattempt-btn:hover {
  background: #2D2A3D;
}
"""
content += btn_css

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MyExams.css with Button classes")
