path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{streak} Day Streak', '{streak} {streak === 1 ? "Day" : "Days"} Streak')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed grammar in StreakCard.jsx")
