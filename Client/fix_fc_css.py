path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/FlashcardMobile.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Make the controls row-based
content = content.replace("flex-direction: column !important;", "flex-direction: row !important;")

# Allow buttons to be side-by-side
content = content.replace(".fs-bottom-controls > div {\n      display: flex !important;\n      flex-direction: column !important;\n      gap: 16px !important;\n    }", ".fs-bottom-controls > div {\n      display: flex !important;\n      flex-direction: row !important;\n      gap: 12px !important;\n      width: 100% !important;\n    }")

# Don't hide prev/next
content = content.replace("display: none !important;", "/* display: none !important; */")

# Also remove the heart cutout
content = content.replace(".fs-card-face::after {\n      content: 'dY ?';\n      position: absolute;\n      bottom: 16px;\n      left: 16px;\n      font-size: 24px;\n      opacity: 0.8;\n    }", "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CSS")
