path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/FlashcardStudyView.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'FlashcardMobile.css' not in content:
    content = content.replace('import "../css/MyExams.css";', 'import "../css/MyExams.css";\nimport "../css/FlashcardMobile.css";')

# We need to inject the emoji cutout into the fs-card-face.
emoji_cutout = """
                  {/* Emoji Cutout */}
                  <div className="fs-emoji-cutout">
                    🤫
                  </div>
"""

# add it before the end of the front card face
content = content.replace('</div>\n\n                {/* BACK OF CARD */}', emoji_cutout + '                </div>\n\n                {/* BACK OF CARD */}')

# and back card face
content = content.replace('</div>\n                \n              </div>\n            </div>', emoji_cutout + '                </div>\n                \n              </div>\n            </div>')

# Modify controls
# the user wants "just one simple Flip button from your end" and next.
# Let's replace the whole bottom controls section with our own structure.
# But keeping original behavior if possible, or just updating classes.
# I will just replace the buttons with classes fs-flip-btn and fs-next-btn
content = content.replace('style={{ flex: 1, maxWidth: "180px"', 'className="fs-prev-btn" style={{ flex: 1, maxWidth: "180px"')
content = content.replace('style={{ width: "100%", padding: "16px"', 'className="fs-flip-btn" style={{ width: "100%", padding: "16px"')
# Next button
content = content.replace('Next <ArrowRight size={18} />', 'Next')
content = content.replace('className="fs-prev-btn"', 'className="fs-prev-btn fs-mobile-prev"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated FlashcardStudyView.jsx")
