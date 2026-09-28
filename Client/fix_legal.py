import re

path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/ProfilePages/MobileProfileFlow.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """          <div style={{ marginTop: "32px", paddingBottom: "24px", display: "flex", justifyContent: "center" }}>
          <SimpleFooter />
        </div>"""

# Try searching for a flexible match if exact whitespace fails
match = re.search(r'<div style={{ marginTop: "32px", paddingBottom: "24px", display: "flex", justifyContent: "center" }}>\s*<SimpleFooter />\s*</div>', content)

replacement = """          <div style={{ marginTop: "32px", paddingBottom: "24px", display: "flex", justifyContent: "center", width: "100%" }}>
            {isDesktop ? (
              <div className="desktop-legal-card">
                <div className="dl-header">
                  <div className="dl-title-wrap">
                    <Shield size={20} className="dl-icon" />
                    <h3>Legal</h3>
                  </div>
                  <span className="dl-badge">Your privacy matters</span>
                </div>
                <div className="dl-links-grid">
                  <a href="/terms" className="dl-link-item">
                    <FileText size={16} />
                    <span>Terms & Conditions</span>
                  </a>
                  <a href="/privacy" className="dl-link-item">
                    <Shield size={16} />
                    <span>Privacy Policy</span>
                  </a>
                  <a href="/refunds" className="dl-link-item">
                    <RefreshCw size={16} />
                    <span>Refunds & Cancellation Policy</span>
                  </a>
                </div>
              </div>
            ) : (
              <SimpleFooter />
            )}
          </div>"""

if match:
    content = content[:match.start()] + replacement + content[match.end():]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Match not found.")
