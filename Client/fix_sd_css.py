path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
css_replace = """/* --- MOBILE SPACING FIX --- */
@media (max-width: 768px) {
  .sd-content {
    padding: 24px 16px 40px 16px !important;
  }
  .sd-hero {
    margin-bottom: 16px !important;
  }
  .sd-hero + .sd-content {
    padding-top: 0 !important;
  }
  .sd-stats-grid {
    gap: 12px !important;
    margin-bottom: 16px !important;
  }
}"""

content = re.sub(r'/\* --- MOBILE SPACING FIX ---\s*\*/.*', css_replace, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentDashboard.css")
