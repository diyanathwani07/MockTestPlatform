path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("marginTop: '24px',", "marginTop: 'auto',")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard.jsx")
