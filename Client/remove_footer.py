with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Remove the import
content = re.sub(r'import SimpleFooter from "\.\./components/SimpleFooter";\n', '', content)

# Remove the component usage
content = re.sub(r'\s*<SimpleFooter />\n', '\n', content)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
