path_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path_css, 'r', encoding='utf-8') as f:
    content = f.read()

mobile_css = """
  .sd-banner-wrapper {
    padding: 0px 16px 0 16px !important;
  }
"""
content = content.replace('.sd-content {', mobile_css + '\n  .sd-content {')

with open(path_css, 'w', encoding='utf-8') as f:
    f.write(content)
print("added banner wrapper")
