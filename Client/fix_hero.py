path_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path_css, 'r', encoding='utf-8') as f:
    content = f.read()

target = """.sd-hero {
    padding: 36px 28px;
    min-height: 180px;
    border-radius: 20px;
    margin: 10px 16px 16px 16px;
  }"""
replace = """.sd-hero {
    padding: 24px 20px;
    min-height: auto;
    border-radius: 20px;
    margin: 10px 16px 16px 16px;
  }"""

if target in content:
    content = content.replace(target, replace)
    with open(path_css, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed mobile sd-hero padding!")
else:
    print("Target not found, attempting regex replace...")
    import re
    content = re.sub(r'\.sd-hero\s*\{\s*padding:\s*36px 28px;\s*min-height:\s*180px;', r'.sd-hero {\n    padding: 24px 20px;\n    min-height: auto;', content)
    with open(path_css, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Regex replace attempted")
