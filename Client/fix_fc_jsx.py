path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/FlashcardStudyView.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove Share2
content = content.replace("<Share2 size={24} />", "")

# 2. Remove Emoji
content = content.replace("""                  {/* Emoji Cutout */}
                  <div className="fs-emoji-cutout">
                    🤫
                  </div>""", "")

# Also check for emoji on back face just in case
content = content.replace("""                  {/* Emoji Cutout */}
                  <div className="fs-emoji-cutout">
                    🤫
                  </div>""", "")

# 3. Update Prev/Next buttons
target_prev = """<button onClick={handlePrev} disabled={currentIndex === 0} className="fs-prev-btn fs-mobile-prev" style={{ flex: 1, maxWidth: "180px", padding: "16px", borderRadius: "30px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: currentIndex === 0 ? "var(--text-muted)" : "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "600", cursor: currentIndex === 0 ? "not-allowed" : "pointer" }}>
                <ArrowLeft size={18} /> Previous
              </button>"""
new_prev = """<button onClick={handlePrev} disabled={currentIndex === 0} className="fs-prev-btn" style={{ width: "48px", height: "48px", flexShrink: 0, borderRadius: "50%", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: currentIndex === 0 ? "var(--text-muted)" : "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", cursor: currentIndex === 0 ? "not-allowed" : "pointer" }}>
                <ArrowLeft size={20} />
              </button>"""
content = content.replace(target_prev, new_prev)

target_next = """<button onClick={handleNext} className="fs-prev-btn fs-mobile-prev" style={{ flex: 1, maxWidth: "180px", padding: "16px", borderRadius: "30px", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", fontWeight: "600", cursor: "pointer" }}>
                Next
              </button>"""
new_next = """<button onClick={handleNext} className="fs-next-btn" style={{ width: "48px", height: "48px", flexShrink: 0, borderRadius: "50%", background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "600", cursor: "pointer" }}>
                <ArrowRight size={20} />
              </button>"""
content = content.replace(target_next, new_next)

# Ensure fs-bottom-controls has correct layout for side-by-side buttons
content = content.replace(""""fs-bottom-controls" style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "60px", width: "100%", maxWidth: "850px", position: "relative" }}>""", """"fs-bottom-controls" style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "60px", width: "100%", maxWidth: "850px", position: "relative" }}>""")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated FlashcardStudyView JSX")
