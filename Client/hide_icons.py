path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = ".sd-stat-icon-wrapper { width: 36px; height: 36px; border-radius: 8px; }"
replacement = ".sd-stat-icon-wrapper { display: none; }"
content = content.replace(target, replacement)

# Wait, there is also: .sd-stat-icon-wrapper svg { width: 18px; height: 18px; }
# I can leave it, or remove it. Let's just remove it for cleanliness.
target2 = ".sd-stat-icon-wrapper svg { width: 18px; height: 18px; }"
replacement2 = ""
content = content.replace(target2, replacement2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CSS!")
