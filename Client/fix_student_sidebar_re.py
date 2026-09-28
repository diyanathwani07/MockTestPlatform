import re

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'\.sidebar-link\.active\s*\{[^\}]+?color:\s*#ffffff;\s*\}',
    '.sidebar-link.active {\n    background: var(--sidebar-active-bg, #4F22C5);\n    color: var(--sidebar-active-text, #ffffff);\n  }',
    content
)
with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css', 'w', encoding='utf-8') as f:
    f.write(content)
