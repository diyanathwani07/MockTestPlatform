path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                    <div className="practice-card-header">
                      <div className="practice-subject-badge" style={{ backgroundColor: color.bg, color: color.text }}>
                        <span className="dot" style={{ backgroundColor: color.dot }}></span>
                        Performance History
                      </div>
                    </div>"""
content = content.replace(target, "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed Performance History badge")
