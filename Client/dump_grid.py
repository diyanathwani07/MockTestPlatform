path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Practice.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
import re
match = re.search(r'(@media[^{]+\{[^}]*practice-meta-grid[^}]*\})', content, re.MULTILINE | re.DOTALL)
if match:
    print("Found in media query:\n", match.group(1))
else:
    print("Not found in media query")
    match2 = re.search(r'.practice-meta-grid\s*\{[^}]*\}', content)
    if match2:
        print("Base definition:\n", match2.group(0))
