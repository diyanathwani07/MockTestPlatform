path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/FlashcardMobile.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the button width override in mobile
target_override = """    /* Make buttons full width */
    .fs-bottom-controls > button,
    .fs-bottom-controls > div {
      max-width: 100% !important;
      width: 100% !important;
    }"""
new_override = """    /* Center flex container */
    .fs-bottom-controls > div {
      flex: 1 !important;
      max-width: 100% !important;
      width: 100% !important;
    }"""
content = content.replace(target_override, new_override)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated FlashcardMobile CSS widths")
