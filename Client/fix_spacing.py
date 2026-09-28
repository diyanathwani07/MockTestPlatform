import re

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentProfile.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace margin-bottom: 0; with margin-bottom: 32px; in .mp-profile-summary under desktop media query
content = re.sub(
    r'(\.mp-profile-summary\s*\{[^}]*?)margin-bottom:\s*0;',
    r'\1margin-bottom: 24px;',
    content
)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentProfile.css', 'w', encoding='utf-8') as f:
    f.write(content)
