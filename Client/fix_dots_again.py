path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will revert the dots from the right card, and add them to the left card.
bad_dots = """          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C084FC' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
          </div>"""

content = content.replace(bad_dots, "")

# Now inject it carefully below Icon badge
target = """<span className="streak-badge-sub">Icon</span>
            </div>
          </div>"""
replacement = """<span className="streak-badge-sub">Icon</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C084FC' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
          </div>"""
          
content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed dots position")
