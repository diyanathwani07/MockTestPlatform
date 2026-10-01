path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('grid-template-columns: 2fr 1fr;', 'grid-template-columns: 1fr 1fr;')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentDashboard.css")
