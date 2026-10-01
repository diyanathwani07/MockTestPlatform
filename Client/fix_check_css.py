path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StreakCard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
import re
content = re.sub(r'\.feature-check\s*\{[^}]*\}', '', content)
content = re.sub(r'body\.dark-mode\s*\.feature-check\s*\{[^}]*\}', '', content)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Cleaned up feature-check CSS")
