path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/FlashcardStudyView.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'import\s+\{([^\}]+)\}\s+from\s+"lucide-react";', 
                 lambda m: f'import {{{m.group(1)}, Share2}} from "lucide-react";' if 'Share2' not in m.group(1) else m.group(0), 
                 content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added Share2 import!")
