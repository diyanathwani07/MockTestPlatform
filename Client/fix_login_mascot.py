with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Update the size={80} mascot
content = re.sub(r'<div className="mobile-only-mascot"><PrepMarkMascot state="welcome" size=\{80\} /></div>', r'<div className="mobile-only-mascot" style={{ width: "100%", maxWidth: "160px", margin: "0 auto", paddingBottom: "12px", display: "flex", justifyContent: "center" }}><PrepMarkMascot state="welcome" size="min(140px, 20vh)" /></div>', content)

# Update the size={100} mascot
content = re.sub(r'<div className="mobile-only-mascot"><PrepMarkMascot state="welcome" size=\{100\} /></div>', r'<div className="mobile-only-mascot" style={{ width: "100%", maxWidth: "180px", margin: "0 auto", paddingBottom: "16px", display: "flex", justifyContent: "center" }}><PrepMarkMascot state="welcome" size="min(160px, 25vh)" /></div>', content)

# Update the size={160} mascot (landing)
content = re.sub(r'<PrepMarkMascot state="welcome" size=\{160\} />', r'<PrepMarkMascot state="welcome" size="min(200px, 35vh)" />', content)


with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
