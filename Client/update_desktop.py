path_nav = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StudentNavbar.jsx'
with open(path_nav, 'r', encoding='utf-8') as f:
    nav_content = f.read()

target_nav = '<span className="navbar-page-title" style={{ color: "var(--text-primary)", fontWeight: "700", \nwhiteSpace: "nowrap" }}>{title}</span>'
target_nav2 = '<span className="navbar-page-title" style={{ color: "var(--text-primary)", fontWeight: "700", whiteSpace: "nowrap" }}>{title}</span>'

replace_nav = """<span 
                  className="navbar-page-title" 
                  style={{ color: "var(--text-primary)", fontWeight: "700", whiteSpace: "nowrap", cursor: (title === "Results" || title === "Practice") ? "pointer" : "default" }}
                  onClick={() => {
                    if (title === "Results") navigate("/dashboard/results");
                    if (title === "Practice") navigate("/dashboard/practice");
                  }}
                >{title}</span>"""

if target_nav in nav_content:
    nav_content = nav_content.replace(target_nav, replace_nav)
elif target_nav2 in nav_content:
    nav_content = nav_content.replace(target_nav2, replace_nav)

with open(path_nav, 'w', encoding='utf-8') as f:
    f.write(nav_content)

path_sub = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path_sub, 'r', encoding='utf-8') as f:
    sub_content = f.read()

target_btn = 'cursor: "pointer", color: "var(--text-primary)", flexShrink: 0'
replace_btn = 'cursor: "pointer", color: "var(--text-primary)", flexShrink: 0\n                }}\n                className="hide-on-desktop"'
if 'className="hide-on-desktop"' not in sub_content and target_btn in sub_content:
    sub_content = sub_content.replace(target_btn, replace_btn)

with open(path_sub, 'w', encoding='utf-8') as f:
    f.write(sub_content)

path_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Practice.css'
with open(path_css, 'a', encoding='utf-8') as f:
    f.write('\n@media (min-width: 769px) { .hide-on-desktop { display: none !important; } }\n')

print("Done")
