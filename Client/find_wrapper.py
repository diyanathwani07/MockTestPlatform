path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
import re
print("Matches of .sd-banner-wrapper:")
for match in re.finditer(r'\.sd-banner-wrapper\s*\{[^}]*\}', content):
    print(match.group(0))
