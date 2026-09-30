path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/FlashcardMobile.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("/* display: none !important; */ /* Hide original header row entirely */", "display: none !important;")
content = content.replace("/* display: none !important; */", "display: none !important;")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Uncommented display: none for mobile headers")
