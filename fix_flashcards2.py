import re

with open(r'c:\Users\HP\OneDrive\Desktop\MockTestSeries\Client\src\admin\ManageFlashcards.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import { Trash2', 'import { Layers, Trash2')

header_start = content.find('<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>')
header_end = content.find('<div style={{ marginBottom: "24px" }}>\n              <FlashcardDocxParser')

if header_start != -1 and header_end != -1:
    new_header = '''<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "16px", padding: "20px 24px", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ background: "#8b5cf6", borderRadius: "12px", width: "56px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Layers color="white" size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "800", textTransform: "uppercase", color: "white", marginBottom: "4px", margin: 0, letterSpacing: "0.5px" }}>{setMeta?.title || "Loading..."}</h2>
                  <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Layers size={12} /> {cards.length} Cards in this set
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button onClick={() => handleOpenForm()} style={{ display: "flex", gap: "6px", alignItems: "center", padding: "10px 20px", fontSize: "14px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)", transition: "all 0.2s" }}>
                  <Plus size={16} /> Add Card
                </button>
                <button onClick={() => navigate("/admin/flashcards")} style={{ display: "flex", gap: "6px", alignItems: "center", padding: "10px 20px", fontSize: "14px", background: "#10B981", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)", transition: "all 0.2s" }}>
                  <CheckCircle size={16} /> Save & Close
                </button>
              </div>
            </div>\n\n            '''
    content = content[:header_start] + new_header + content[header_end:]

with open(r'c:\Users\HP\OneDrive\Desktop\MockTestSeries\Client\src\admin\ManageFlashcards.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

