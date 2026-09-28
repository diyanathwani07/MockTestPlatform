with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/admin/AdminFlashcards.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Header Banner background
content = content.replace(
    'background: "linear-gradient(135deg, #15102a 0%, #1d173b 100%)"',
    'background: "var(--bg-card)"'
)
# Make sure the shadow is light-mode friendly or just rely on CSS
content = content.replace(
    'boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)"',
    'boxShadow: "0 4px 15px rgba(0,0,0,0.02)"'
)

# 2. Create New Set Button text color
# The button has background: "linear-gradient(90deg, #ff715b 0%, #ff5238 100%)"
# We want its color to be white
content = content.replace(
    'background: "linear-gradient(90deg, #ff715b 0%, #ff5238 100%)",\n                  color: "var(--text-primary)",',
    'background: "linear-gradient(90deg, #ff715b 0%, #ff5238 100%)",\n                  color: "#ffffff",'
)

# 3. Stat Cards Backgrounds
content = content.replace('background: "#161329"', 'background: "var(--bg-card)"')
content = content.replace('background: "#0d211e"', 'background: "var(--bg-card)"')
content = content.replace('background: "#251a14"', 'background: "var(--bg-card)"')

# 4. Stat Cards Label Colors
content = content.replace('color: "#c4b5fd"', 'color: "var(--violet, #8b5cf6)"')
content = content.replace('color: "#6ee7b7"', 'color: "var(--green, #10b981)"')
content = content.replace('color: "#fcd34d"', 'color: "var(--yellow, #f59e0b)"')

# 5. Icons inside stat cards backgrounds
content = content.replace('background: "rgba(139, 92, 246, 0.15)"', 'background: "rgba(139, 92, 246, 0.1)"')
content = content.replace('background: "rgba(16, 185, 129, 0.15)"', 'background: "rgba(16, 185, 129, 0.1)"')
content = content.replace('background: "rgba(245, 158, 11, 0.15)"', 'background: "rgba(245, 158, 11, 0.1)"')

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/admin/AdminFlashcards.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
