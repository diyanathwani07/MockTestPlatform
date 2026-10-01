path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "marginBottom: '24px', display: 'flex'",
    "marginBottom: '24px', display: 'flex', flexShrink: 0"
)

content = content.replace(
    "marginTop: 'auto',\n          padding: '12px 16px',",
    "marginTop: 'auto',\n          flexShrink: 0,\n          padding: '12px 16px',"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added flexShrink")
