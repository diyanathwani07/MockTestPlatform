path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StreakCard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '.streak-card-container > * {\n  z-index: 1;\n}',
    '.streak-card-container > * {\n  z-index: 1;\n  flex-shrink: 0;\n}'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard.css flex-shrink")
