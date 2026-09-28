with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '.sidebar-link.active {\n    background: var(--sidebar-active-bg, #4F22C5);\n    color: #ffffff;\n  }',
    '.sidebar-link.active {\n    background: var(--sidebar-active-bg, #4F22C5);\n    color: var(--sidebar-active-text, #ffffff);\n  }'
)
with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css', 'w', encoding='utf-8') as f:
    f.write(content)
