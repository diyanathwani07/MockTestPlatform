with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/admin/AdminLayout.css', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(
    r'\.page-nav-btn\.active-page\s*\{([^\}]+)color:\s*var\(--sidebar-active-text,\s*#ffffff\);',
    r'.page-nav-btn.active-page {\1color: #ffffff;',
    content
)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/admin/AdminLayout.css', 'w', encoding='utf-8') as f:
    f.write(content)
