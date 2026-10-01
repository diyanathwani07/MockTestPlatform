path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
import re
# Remove the ones with !important that have padding: 0px 16px 0 16px
content = re.sub(r'\.sd-banner-wrapper\s*\{\s*padding:\s*0px\s+16px\s+0\s+16px\s+!important;\s*\}', '', content)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed old .sd-banner-wrapper blocks.")
