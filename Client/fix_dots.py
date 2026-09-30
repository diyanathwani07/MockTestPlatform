path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StreakCard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

dots_html = """          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C084FC' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color, #2D234A)' }}></div>
          </div>
        </div>"""

content = content.replace("          </div>\n        </div>", dots_html)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakCard with dots")
