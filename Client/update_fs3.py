path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/FlashcardStudyView.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'(<button onClick=\{handleNext\} )style=\{\{ flex: 1, maxWidth: "180px"', r'\1className="fs-next-btn" style={{ flex: 1, maxWidth: "180px"', content)

mobile_header = """
        {/* Mobile Header */}
        <div className="fs-mobile-header">
          <button onClick={() => navigate(-1)} className="fs-mobile-header-icon">
            <ArrowLeft size={24} />
          </button>
          <div style={{fontWeight: 600}}>{setMeta.title || "Flashcards"}</div>
          <button className="fs-mobile-header-icon">
            <Share2 size={24} />
          </button>
        </div>
"""

if 'fs-mobile-header' not in content:
    content = content.replace('<div className="fs-header-row-1"', mobile_header + '\n        <div className="fs-header-row-1"')

if 'Share2' not in content:
    content = content.replace('ArrowLeft,', 'ArrowLeft, Share2,')

# We need to hide the fs-mobile-header on desktop and show it on mobile, but since we are handling mobile CSS, let's update CSS
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated via Python!")
