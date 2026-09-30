path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StreakCard.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "background: #374151;": "background: var(--border-color, #374151);", # timeline-line-bg
    "border: 2px solid #374151;": "border: 2px solid var(--border-color, #374151);", # streak-locked border
    "background: #110D20;": "background: var(--bg-body, #110D20);", # streak-circle bg
    "color: #E9D5FF;": "color: var(--text-primary, #E9D5FF);", # streak-badge text
    "border: 1px solid #4A358A;": "border: 1px solid var(--border-color, #4A358A);", # streak-badge border
}

for old, new_val in replacements.items():
    content = content.replace(old, new_val)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated extra hardcoded colors in StreakCard.css")
