import re

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/admin/AdminFlashcards.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix hardcoded backgrounds
content = re.sub(r'background:\s*["\']#111019["\']', 'background: "var(--bg-card)"', content)
content = re.sub(r'backgroundColor:\s*["\']#111019["\']', 'backgroundColor: "var(--bg-card)"', content)
content = re.sub(r'background:\s*["\']#15141e["\']', 'background: "var(--bg-card)"', content)
content = re.sub(r'background:\s*["\']#1a1924["\']', 'background: "var(--bg-page)"', content)
content = re.sub(r'background:\s*["\']rgba\(255,\s*255,\s*255,\s*0\.03\)["\']', 'background: "var(--bg-page)"', content)

# Fix hardcoded text colors
content = re.sub(r'color:\s*["\']#fff["\']', 'color: "var(--text-primary)"', content)
content = re.sub(r'color:\s*["\']#ffffff["\']', 'color: "var(--text-primary)"', content)
content = re.sub(r'color:\s*["\']rgba\(255,\s*255,\s*255,\s*0\.6\)["\']', 'color: "var(--text-secondary)"', content)
content = re.sub(r'color:\s*["\']rgba\(255,\s*255,\s*255,\s*0\.4\)["\']', 'color: "var(--text-muted)"', content)

# Fix hardcoded borders
content = re.sub(r'border:\s*["\']1px solid rgba\(255,255,255,0\.03\)["\']', 'border: "1px solid var(--border-color)"', content)
content = re.sub(r'border:\s*["\']1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)["\']', 'border: "1px solid var(--border-color)"', content)
content = re.sub(r'borderBottom:\s*["\']1px solid rgba\(255,255,255,0\.05\)["\']', 'borderBottom: "1px solid var(--border-color)"', content)
content = re.sub(r'borderBottom:\s*["\']1px solid rgba\(255,\s*255,\s*255,\s*0\.05\)["\']', 'borderBottom: "1px solid var(--border-color)"', content)
content = re.sub(r'borderColor:\s*["\']rgba\(255,\s*255,\s*255,\s*0\.1\)["\']', 'borderColor: "var(--border-color)"', content)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/admin/AdminFlashcards.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
