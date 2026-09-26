with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Add SVGs and BorderGlow back conditionally
old_login_page = '''<div className=\"login-page full-screen-auth\" style={{ width: \"100vw\", minHeight: \"100vh\", background: isDark ? \"radial-gradient(circle at top, rgba(123, 63, 243, 0.15) 0%, #11101F 60%)\" : \"radial-gradient(circle at top, rgba(123, 63, 243, 0.1) 0%, var(--bg-body) 60%)\", backgroundColor: isDark ? \"#11101F\" : \"var(--bg-body)\", margin: 0, padding: 0, display: \"flex\", flexDirection: \"column\", alignItems: \"center\", justifyContent: \"center\" }}>'''

new_login_page = '''
  <div className={(isMobile && step === "landing") ? "login-page full-screen-auth" : "login-page"} style={(isMobile && step === "landing") ? { width: "100vw", minHeight: "100vh", background: isDark ? "radial-gradient(circle at top, rgba(123, 63, 243, 0.15) 0%, #11101F 60%)" : "radial-gradient(circle at top, rgba(123, 63, 243, 0.1) 0%, var(--bg-body) 60%)", backgroundColor: isDark ? "#11101F" : "var(--bg-body)", margin: 0, padding: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } : {}}>
    {!(isMobile && step === "landing") && (
      <>
        <svg style={{ width: 0, height: 0, position: 'absolute' }}>
          <defs>
            <linearGradient id="left-3d-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D2FF" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#7B3FF3" />
            </linearGradient>
            <linearGradient id="right-3d-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#7B3FF3" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
        <div className="top-left-glow"></div>
        <div className="bottom-right-glow"></div>
        <div className="grid-pattern-left"></div>
        <div className="grid-pattern-right"></div>
        <div className="glow-dot glow-dot-1"></div>
        <div className="glow-dot glow-dot-2"></div>

        <svg className="bg-wave-left" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 0,0 C 35,0 45,28 32,55 C 20,80 5,88 0,88 Z" fill="url(#left-3d-grad)" opacity="0.95" />
          <path d="M 0,10 C 35,25 38,50 18,75 C 10,85 0,90 0,90" fill="none" stroke="#00D2FF" strokeWidth="1.25" />
        </svg>

        <svg className="bg-wave-right" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 100,100 C 65,100 55,72 68,45 C 80,20 95,12 100,12 Z" fill="url(#right-3d-grad)" opacity="0.95" />
          <path d="M 100,90 C 65,75 62,50 82,25 C 90,15 100,10 100,10" fill="none" stroke="#7B3FF3" strokeWidth="1.25" />
        </svg>
      </>
    )}
'''
content = content.replace(old_login_page, new_login_page)

old_container = '''<div className=\"auth-content-container animate-fade-in\" style={{ width: \"100%\", maxWidth: \"420px\", padding: \"24px\", display: \"flex\", flexDirection: \"column\", zIndex: 10 }}>'''
new_container = '''
    {!(isMobile && step === "landing") ? (
      <BorderGlow
        className="login-card animate-fade-in"
        edgeSensitivity={30}
        glowColor="260 85 70"
        borderRadius={28}
        glowRadius={40}
        glowIntensity={1.2}
        coneSpread={25}
        animated={true}
        colors={['#7B3FF3', '#00D2FF', '#EC4899']}
        alwaysGlow={true}
      >
    ) : (
      <div className="auth-content-container animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", zIndex: 10 }}>
    )}
'''

# We need to wrap the children, so the closing div changes too
content = content.replace(old_container, new_container)

# The end of the wrapper was just a </div> which we added at the bottom.
# We need to replace it with:
#    {!(isMobile && step === "landing") ? </BorderGlow> : </div>}
content = re.sub(r'</div>\s*</div>\s*<SimpleFooter />\s*</>', r'    {!(isMobile && step === "landing") ? </BorderGlow> : </div>}\n    </div>\n    <SimpleFooter />\n    </>', content)


with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
