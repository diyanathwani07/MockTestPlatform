with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

content = re.sub(r'<svg style=\{\{ width: 0, height: 0, position: \'absolute\' \}\}>.*?</svg>', '', content, flags=re.DOTALL)
content = re.sub(r'<div className=\"top-left-glow\"></div>', '', content)
content = re.sub(r'<div className=\"bottom-right-glow\"></div>', '', content)
content = re.sub(r'<div className=\"grid-pattern-left\"></div>', '', content)
content = re.sub(r'<div className=\"grid-pattern-right\"></div>', '', content)
content = re.sub(r'<div className=\"glow-dot glow-dot-1\"></div>', '', content)
content = re.sub(r'<div className=\"glow-dot glow-dot-2\"></div>', '', content)
content = re.sub(r'<svg className=\"bg-wave-left\".*?</svg>', '', content, flags=re.DOTALL)
content = re.sub(r'<svg className=\"bg-wave-right\".*?</svg>', '', content, flags=re.DOTALL)

content = re.sub(r'<BorderGlow[^>]*>', '<div className=\"auth-content-container animate-fade-in\" style={{ width: \"100%\", maxWidth: \"420px\", padding: \"24px\", display: \"flex\", flexDirection: \"column\", zIndex: 10 }}>', content, flags=re.DOTALL)
content = content.replace('</BorderGlow>', '</div>')

content = content.replace('<div className=\"login-page\">', '<div className=\"login-page full-screen-auth\" style={{ width: \"100vw\", minHeight: \"100vh\", background: isDark ? \"radial-gradient(circle at top, rgba(123, 63, 243, 0.15) 0%, #11101F 60%)\" : \"radial-gradient(circle at top, rgba(123, 63, 243, 0.1) 0%, var(--bg-body) 60%)\", backgroundColor: isDark ? \"#11101F\" : \"var(--bg-body)\", margin: 0, padding: 0, display: \"flex\", flexDirection: \"column\", alignItems: \"center\", justifyContent: \"center\" }}>')

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
