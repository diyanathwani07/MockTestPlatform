with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/admin/AdminChatbot.css', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Update .acb-fab width, height, background, box-shadow, and remove animation
content = re.sub(
    r'\.acb-fab\s*\{[^}]*?\}',
    '.acb-fab {\n    width: 52px;\n    height: 52px;\n    border-radius: 50%;\n    background: #6D35D9;\n    color: white;\n    border: none;\n    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    cursor: grab;\n    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;\n    user-select: none;\n  }',
    content
)

# Update hover state
content = re.sub(
    r'\.acb-fab:hover\s*\{[^}]*?\}',
    '.acb-fab:hover {\n    transform: scale(1.05);\n    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);\n  }',
    content
)

# Replace the animation just in case
content = re.sub(r'@keyframes floatBob\s*\{[^}]*?\}', '', content)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/admin/AdminChatbot.css', 'w', encoding='utf-8') as f:
    f.write(content)
