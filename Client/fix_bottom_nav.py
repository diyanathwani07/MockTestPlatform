import re
import os

path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StudentBottomNav.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace bg-[#0F1012] for safe area
content = content.replace('bg-[#0F1012]', '')
content = content.replace("style={{ height: 'env(safe-area-inset-bottom)' }}", "style={{ height: 'env(safe-area-inset-bottom)', backgroundColor: 'var(--bottom-nav-end)' }}")

# Replace inline backgrounds
content = content.replace("background: 'linear-gradient(180deg, #2A303E 0%, #0F1012 100%)'", "background: 'linear-gradient(180deg, var(--bottom-nav-start) 0%, var(--bottom-nav-end) 100%)'")

# Replace SVG stops
content = content.replace('stopColor="#2A303E"', 'stopColor="var(--bottom-nav-start)"')
content = content.replace('stopColor="#0F1012"', 'stopColor="var(--bottom-nav-end)"')

# Replace text color
content = content.replace('text-[#8D8D93]', 'text-[var(--bottom-nav-text)]')
content = content.replace('text-[#8D8D93]', 'text-[var(--bottom-nav-text)]')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

theme_path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/theme.css'
with open(theme_path, 'r', encoding='utf-8') as f:
    theme_content = f.read()

# Check if variables exist, if not append them to root and dark mode
if '--bottom-nav-start' not in theme_content:
    root_vars = """
  /* Bottom Nav Variables */
  --bottom-nav-start: #FFFFFF;
  --bottom-nav-end: #F8FAFC;
  --bottom-nav-text: #64748B;
"""
    dark_vars = """
  /* Bottom Nav Variables */
  --bottom-nav-start: #1A1A2A;
  --bottom-nav-end: #0D0D16;
  --bottom-nav-text: #A7A3BD;
"""
    # Simple insertion
    theme_content = theme_content.replace(':root {', ':root {' + root_vars)
    theme_content = theme_content.replace('body.dark-mode {', 'body.dark-mode {' + dark_vars)
    
    with open(theme_path, 'w', encoding='utf-8') as f:
        f.write(theme_content)

