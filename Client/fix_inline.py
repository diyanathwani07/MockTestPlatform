path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("<div className='sd-banner-wrapper' style={{ padding: '10px 24px 0 24px' }}>", "<div className='sd-banner-wrapper'>")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
