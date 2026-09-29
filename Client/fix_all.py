import os

# 1. Create SVG
svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120">
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="64" font-weight="900" fill="#a1a1aa" opacity="0.6" transform="rotate(-10, 200, 60)">PrepMark</text>
</svg>"""
with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/public/prepmark-watermark.svg', 'w') as f:
    f.write(svg_content)

# 2. Update Quiz.css
quiz_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Quiz.css'
with open(quiz_css, 'r', encoding='utf-8') as f:
    q_content = f.read()
q_content = q_content.replace("url('/logo.png')", "url('/prepmark-watermark.svg')")
with open(quiz_css, 'w', encoding='utf-8') as f:
    f.write(q_content)

# 3. Update Practice.css
practice_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Practice.css'
with open(practice_css, 'r', encoding='utf-8') as f:
    p_content = f.read()
p_content = p_content.replace("url('/logo.png')", "url('/prepmark-watermark.svg')")

# Fix flex in Practice.css
target_css = """.practice-meta-grid {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 0;
  }"""
if target_css in p_content:
    p_content = p_content.replace(target_css, """.practice-meta-grid {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }""")

# Reduce font size for practice-title
target_title = """.practice-title {
    font-size: 24px;
  }"""
if target_title in p_content:
    p_content = p_content.replace(target_title, """.practice-title {
    font-size: 20px;
  }""")

with open(practice_css, 'w', encoding='utf-8') as f:
    f.write(p_content)

# 4. Update SubjectResults.jsx
results_jsx = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(results_jsx, 'r', encoding='utf-8') as f:
    r_content = f.read()

target_btn = 'cursor: "pointer", color: "var(--text-primary)"\n                }}'
replace_btn = 'cursor: "pointer", color: "var(--text-primary)", flexShrink: 0\n                }}'
if target_btn in r_content:
    r_content = r_content.replace(target_btn, replace_btn)

with open(results_jsx, 'w', encoding='utf-8') as f:
    f.write(r_content)

print("Done with all updates.")
