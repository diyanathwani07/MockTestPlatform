path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StreakPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'import StudentSidebar' not in content:
    content = content.replace('import { DotLottieReact } from "@lottiefiles/dotlottie-react";', 
                              'import { DotLottieReact } from "@lottiefiles/dotlottie-react";\nimport StudentSidebar from "../components/StudentSidebar";\nimport StudentNavbar from "../components/StudentNavbar";\nimport "../css/StudentDashboard.css";')

# Remove old root and header
old_root = """  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main, #0B0A10)", color: "var(--text-primary)", padding: "20px", paddingBottom: "100px" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-card)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ flex: 1, textAlign: 'center', margin: 0, fontSize: '20px', fontWeight: '700' }}>Streak</h2>
        <div style={{ width: '40px' }} /> {/* spacer */}
      </div>"""

new_root = """  return (
    <div className="sd-layout">
      <StudentSidebar />
      <div className="sd-main-content">
        <StudentNavbar title="Dashboard > Streak" />
        <div className="sd-content" style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 20px" }}>"""

content = content.replace(old_root, new_root)

# Replace the closing div
# The file probably ends with something like:
#      </div>
#    );
# }
old_end = """      {/* Spacer for bottom nav if any */}
      <div style={{ height: '40px' }}></div>
    </div>
  );
}

export default StreakPage;"""

new_end = """      {/* Spacer */}
      <div style={{ height: '40px' }}></div>
        </div>
      </div>
    </div>
  );
}

export default StreakPage;"""

if old_end in content:
    content = content.replace(old_end, new_end)
else:
    # Attempt a fallback for closing divs
    content = content.rsplit('</div>\n  );\n}', 1)[0] + '</div>\n      </div>\n    </div>\n  );\n}\n\nexport default StreakPage;\n'


with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakPage.jsx")
