path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'className="streak-timeline-container" style={{ position: \'relative\', marginTop: \'20px\', display: \'flex\', justifyContent: \'space-between\' }}',
    'className="streak-timeline-container" style={{ position: \'relative\', marginTop: \'20px\', marginBottom: \'24px\', display: \'flex\', justifyContent: \'space-between\' }}'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added marginBottom to timeline")
