path_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path_css, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Update mobile .sd-hero margin-top
content = re.sub(r'(\.sd-hero\s*\{\s*padding:.*?margin:)\s*10px\s*16px\s*16px\s*16px;', r'\1 0px 16px 16px 16px;', content, flags=re.DOTALL)

# Add .sd-content to mobile media query
mobile_add = """
  .sd-content {
    padding: 0 16px 40px 16px;
  }
"""
if '.sd-content' not in content.split('@media (max-width: 768px) {')[1]:
    content = content.replace('@media (max-width: 768px) {', '@media (max-width: 768px) {' + mobile_add)

with open(path_css, 'w', encoding='utf-8') as f:
    f.write(content)

path_jsx = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx'
with open(path_jsx, 'r', encoding='utf-8') as f:
    jsx_content = f.read()

jsx_content = jsx_content.replace("<div style={{ padding: '10px 24px 0 24px' }}>", "<div className='sd-banner-wrapper' style={{ padding: '10px 24px 0 24px' }}>")
with open(path_jsx, 'w', encoding='utf-8') as f:
    f.write(jsx_content)

path_css_banner = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/DashboardBannerCarousel.css'
with open(path_css_banner, 'r', encoding='utf-8') as f:
    ban_content = f.read()
ban_content = ban_content.replace('margin-bottom: 20px;', 'margin-bottom: 10px;')
with open(path_css_banner, 'w', encoding='utf-8') as f:
    f.write(ban_content)

print("Fixed spacing")
