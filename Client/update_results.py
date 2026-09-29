path_jsx = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path_jsx, 'r', encoding='utf-8') as f:
    content_jsx = f.read()

# Add flexShrink: 0 to the back button in SubjectResults.jsx
target_btn = 'cursor: "pointer", color: "var(--text-primary)"\n                }}'
replace_btn = 'cursor: "pointer", color: "var(--text-primary)", flexShrink: 0\n                }}'
if target_btn in content_jsx:
    content_jsx = content_jsx.replace(target_btn, replace_btn)

with open(path_jsx, 'w', encoding='utf-8') as f:
    f.write(content_jsx)


path_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Practice.css'
with open(path_css, 'r', encoding='utf-8') as f:
    content_css = f.read()

# Change flex-direction: column to row for .practice-meta-grid on mobile
target_css = """.practice-meta-grid {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 0;
    }"""
replace_css = """.practice-meta-grid {
      flex-direction: row;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }"""
if target_css in content_css:
    content_css = content_css.replace(target_css, replace_css)

# Also reduce practice-title font-size for mobile from 24px to 20px
target_title = """.practice-title {
      font-size: 24px;
    }"""
replace_title = """.practice-title {
      font-size: 20px;
    }"""
if target_title in content_css:
    content_css = content_css.replace(target_title, replace_title)

with open(path_css, 'w', encoding='utf-8') as f:
    f.write(content_css)

print("Updated SubjectResults.jsx and Practice.css")
