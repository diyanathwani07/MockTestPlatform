path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/QuizDetailsModal.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
import re
content = re.sub(r'<div className="qdm-note-box">.*?</div>\s*</div>', '', content, flags=re.DOTALL)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed qdm-note-box")
