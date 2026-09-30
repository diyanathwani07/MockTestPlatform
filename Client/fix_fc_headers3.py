path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/FlashcardMobile.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'\.fs-header-row-2,\s*\.fs-progress-row\s*\{\s*display:\s*none\s*!important;\s*\}', '.fs-header-row-2 {\n      display: none !important;\n    }', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace done")
