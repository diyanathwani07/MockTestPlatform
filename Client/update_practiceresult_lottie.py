path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/PracticeResult.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'DotLottieReact' not in content:
    content = content.replace('import { Trophy', 'import { DotLottieReact } from "@lottiefiles/dotlottie-react";\nimport { Trophy')

# Replace Trophy div
old_trophy = """<div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 25px rgba(124, 58, 237, 0.3)" }}>
              <Trophy size={48} color="#ffffff" />
            </div>"""

new_trophy = """<div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DotLottieReact src={accuracy >= 40 ? "/Yay.lottie" : "/idk.lottie"} loop autoplay style={{ width: "120px", height: "120px" }} />
            </div>"""

if old_trophy in content:
    content = content.replace(old_trophy, new_trophy)
else:
    print("Could not find old trophy block!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated PracticeResult.jsx")
