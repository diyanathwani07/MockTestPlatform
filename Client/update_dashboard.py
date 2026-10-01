path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('const recentAvailable = [...seriesList].reverse().slice(0, 5);', 'const recentAvailable = [...seriesList].reverse().slice(0, 3);')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentDashboard.jsx")
