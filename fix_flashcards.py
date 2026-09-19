import re

with open(r'c:\Users\HP\OneDrive\Desktop\MockTestSeries\Client\src\admin\ManageFlashcards.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add Layers to lucide-react import
content = re.sub(
    r'import \{ (.*?) \} from "lucide-react";',
    lambda m: f'import {{ {m.group(1)}, Layers }} from "lucide-react";' if 'Layers' not in m.group(1) else m.group(0),
    content
)

# Replace Header
old_header = r'''            <div style=\{\{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" \}\}>
              <div>
                <button onClick=\{.*?\} className="btn-secondary" style=\{\{ marginBottom: "16px", display: "flex", gap: "6px", alignItems: "center" \}\}>
                  <ChevronLeft size=\{16\} /> Back
                </button>
                <h2 style=\{\{ fontSize: "20px", fontWeight: "700", marginBottom: "4px", margin: 0 \}\}>\{setMeta\?.title \|\| "Loading..."\}</h2>
                <p style=\{\{ color: "var\(--text-secondary\)", margin: 0, fontSize: "13px" \}\}>\{cards\.length\} Cards in this set\.</p>
              </div>
              <div style=\{\{ display: "flex", gap: "10px" \}\}>
                <button onClick=\{.*?\} className="btn-secondary".*?>
                  <Eye size=\{14\} /> Preview
                </button>
                <button onClick=\{.*?\} className="btn-primary".*?>
                  <Plus size=\{14\} /> Add Card
                </button>
                <button onClick=\{.*?\} style=\{.*?>
                  <CheckCircle size=\{14\} /> Save & Close
                </button>
              </div>
            </div>'''

new_header = '''            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "16px", padding: "20px 24px", flexWrap: "wrap", gap: "16px" }}>
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
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => handleOpenForm()} style={{ display: "flex", gap: "6px", alignItems: "center", padding: "10px 20px", fontSize: "14px", background: "#8b5cf6", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)" }}>
                  <Plus size={16} /> Add Card
                </button>
                <button onClick={() => navigate("/admin/flashcards")} style={{ display: "flex", gap: "6px", alignItems: "center", padding: "10px 20px", fontSize: "14px", background: "#10B981", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}>
                  <CheckCircle size={16} /> Save & Close
                </button>
              </div>
            </div>'''

content = re.sub(old_header, new_header, content, flags=re.DOTALL)

# Replace Card List
old_card_list = r'''            <div style=\{\{ display: "flex", flexDirection: "column", gap: "8px" \}\}>
              \{cards\.map\(\(c, i\) => \(
                <div key=\{c\._id\} className="form-card" style=\{\{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderRadius: "10px" \}\}>
                  <div style=\{\{ flex: "1 1 300px" \}\}>
                    <div style=\{\{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" \}\}>
                      <span style=\{\{ fontSize: "11px", fontWeight: "600", color: "var\(--violet\)", background: "rgba\(110, 63, 243, 0\.1\)", padding: "2px 6px", borderRadius: "4px" \}\}>Card \{i \+ 1\}</span>
                      <span style=\{\{ fontSize: "11px", color: "var\(--text-muted\)" \}\}>\{c\.difficulty\}</span>
                    </div>
                    <div style=\{\{ fontWeight: "600", fontSize: "14px", color: "var\(--text-primary\)", marginBottom: "4px", lineHeight: "1\.4" \}\}>
                      <span style=\{\{ opacity: 0\.5, marginRight: "4px" \}\}>Q:</span>\{c\.front\}
                    </div>
                    <div style=\{\{ color: "var\(--text-secondary\)", fontSize: "13px", lineHeight: "1\.4" \}\}>
                      <span style=\{\{ opacity: 0\.5, marginRight: "4px" \}\}>A:</span>\{c\.back\}
                    </div>
                  </div>
                  <div style=\{\{ display: "flex", gap: "6px", marginLeft: "16px" \}\}>
                    <button className="icon-btn" onClick=\{\(\) => handleOpenForm\(c\)\} style=\{\{ padding: "6px" \}\}>.*?</button>
                    <button className="icon-btn text-danger" onClick=\{\(\) => handleDeleteCard\(c\._id\)\} style=\{\{ padding: "6px" \}\}>.*?</button>
                  </div>
                </div>
              \)\)\}'''

new_card_list = '''            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {cards.map((c, i) => {
                const borderColors = ["#8b5cf6", "#3b82f6", "#ec4899"];
                const color = borderColors[i % 3];
                return (
                <div key={c._id} className="form-card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderRadius: "12px", background: "var(--bg-card, #1E1E28)", borderLeft: 4px solid , boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "white", background: color, padding: "4px 12px", borderRadius: "16px" }}>Card {i + 1}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)", background: "rgba(255,255,255,0.06)", padding: "4px 12px", borderRadius: "16px" }}>{c.difficulty}</span>
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "15px", color: "white", marginBottom: "6px", lineHeight: "1.5" }}>
                      <span style={{ opacity: 0.6, marginRight: "6px" }}>Q:</span>{c.front}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>
                      <span style={{ opacity: 0.5, marginRight: "6px" }}>A:</span>{c.back}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginLeft: "16px", alignItems: "center" }}>
                    <button className="icon-btn" onClick={() => handleOpenForm(c)} style={{ padding: "8px", color: "var(--text-secondary)", transition: "color 0.2s" }}><Edit2 size={16} /></button>
                    <button className="icon-btn" onClick={() => handleDeleteCard(c._id)} style={{ padding: "8px", color: "var(--text-secondary)", transition: "color 0.2s" }}><Trash2 size={16} /></button>
                  </div>
                </div>
              )})}'''

content = re.sub(old_card_list, new_card_list, content, flags=re.DOTALL)

with open(r'c:\Users\HP\OneDrive\Desktop\MockTestSeries\Client\src\admin\ManageFlashcards.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
