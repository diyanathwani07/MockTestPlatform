path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/MyExams.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

old_card = """.me-exam-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);"""

new_card = """.me-exam-card {
  background: #0B0A10;
  border: 1px solid rgba(110, 63, 243, 0.4);"""

content = content.replace(old_card, new_card)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated MyExams.css")
