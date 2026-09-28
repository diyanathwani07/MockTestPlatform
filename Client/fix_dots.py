path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change mb-8 to mt-8 in renderProgress
content = content.replace('className="flex justify-center items-center space-x-2 mb-8"', 'className="flex justify-center items-center space-x-2 mt-8"')

# 2. Remove the existing {step > 1 && step < 7 && renderProgress()} from above the card
target_top = '''        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", width: "100%", justifyContent: "center" }}>
          
          {step > 1 && step < 7 && renderProgress()}

          <div style={{ backgroundColor: "var(--bg-card)", padding: "32px 24px", borderRadius: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)", border: "1px solid var(--border-color)", textAlign: "center" }}>'''

replacement_top = '''        <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", width: "100%", justifyContent: "center" }}>

          <div style={{ backgroundColor: "var(--bg-card)", padding: "32px 24px", borderRadius: "24px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)", border: "1px solid var(--border-color)", textAlign: "center", position: "relative" }}>'''

content = content.replace(target_top, replacement_top)

# 3. Add {step > 1 && step < 7 && renderProgress()} before the closing div of the card
target_bottom = '''              </div>
            )}
  
          </div>
        </div>
        <style>'''

replacement_bottom = '''              </div>
            )}
  
            {step > 1 && step < 7 && renderProgress()}
          </div>
        </div>
        <style>'''

content = content.replace(target_bottom, replacement_bottom)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
