with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentProfile.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    \"maxWidth: isMobile ? '100%' : (activeScreen === 'about' ? '100%' : activeScreen === 'transactions' ? '720px' : '540px')\",
    \"maxWidth: isMobile ? '100%' : (activeScreen === 'overview' ? '1200px' : activeScreen === 'about' ? '100%' : activeScreen === 'transactions' ? '720px' : '540px')\"
)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentProfile.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
