path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/FlashcardMobile.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(".fs-header-row-2, .fs-progress-row {\n      display: none !important;\n    }", ".fs-header-row-2 {\n      display: none !important;\n    }")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Restored progress row on mobile")
