with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/ProfilePages/MobileProfileFlow.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    'Sparkles, Eye, EyeOff, RefreshCw } from "lucide-react";',
    'Sparkles, Eye, EyeOff, RefreshCw, Shield, FileText } from "lucide-react";'
)

# 2. Add the Desktop Legal JSX
desktop_legal_jsx = '''
          {isDesktop ? (
            <div className="desktop-legal-card">
              <div className="dl-header">
                <div className="dl-header-left">
                  <div className="dl-icon-wrapper"><Shield size={24} /></div>
                  <div className="dl-header-text">
                    <h4>Legal</h4>
                    <p>Important information and policies</p>
                  </div>
                </div>
                <div className="dl-badge">
                  <CheckCircle2 size={14} /> Your privacy matters
                </div>
              </div>
              <div className="dl-grid">
                <div className="dl-item" onClick={() => window.location.href = '/terms-conditions'}>
                  <div className="mp-menu-icon"><FileText size={18} /></div>
                  <div className="mp-menu-text">
                    <h4>Terms & Conditions</h4>
                    <p>Read our terms and conditions of use</p>
                  </div>
                  <ChevronRight size={18} className="mp-menu-arrow" />
                </div>
                <div className="dl-item" onClick={() => window.location.href = '/privacy-policy'}>
                  <div className="mp-menu-icon"><Shield size={18} /></div>
                  <div className="mp-menu-text">
                    <h4>Privacy Policy</h4>
                    <p>Learn how we protect your data and privacy</p>
                  </div>
                  <ChevronRight size={18} className="mp-menu-arrow" />
                </div>
                <div className="dl-item" onClick={() => window.location.href = '/refund-policy'}>
                  <div className="mp-menu-icon"><RefreshCw size={18} /></div>
                  <div className="mp-menu-text">
                    <h4>Refunds & Cancellation Policy</h4>
                    <p>Know about our refund and cancellation policy</p>
                  </div>
                  <ChevronRight size={18} className="mp-menu-arrow" />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "32px", paddingBottom: "24px", display: "flex", justifyContent: "center" }}>
              <SimpleFooter />
            </div>
          )}
'''

content = content.replace(
    '<div style={{ marginTop: "32px", paddingBottom: "24px", display: "flex", justifyContent: "center" }}>\n            <SimpleFooter />\n          </div>',
    desktop_legal_jsx
)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/ProfilePages/MobileProfileFlow.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
