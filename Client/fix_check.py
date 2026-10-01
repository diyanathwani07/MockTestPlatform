path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<CheckCircle size={18} color="#4b5563" className="feature-check" />',
    '<CheckCircle size={20} fill="var(--text-secondary, #4b5563)" color="var(--bg-card, #ffffff)" className="feature-check" />'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed CheckCircle")
