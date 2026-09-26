with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find the definition that got put inside useEffect and move it before the last return (
# The definition looks like:
#       const AuthContainer = !(isMobile && step === "landing") ? BorderGlow : 'div';
#     const containerProps = !(isMobile && step === "landing") 
#       ? { className: "login-card animate-fade-in", edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }
#       : { className: "auth-content-container animate-fade-in", style: { width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", zIndex: 10 } };
# 
# return (

import re

# First, undo the mess in useEffect
bad_code = '''  const AuthContainer = !(isMobile && step === "landing") ? BorderGlow : 'div';
  const containerProps = !(isMobile && step === "landing") 
    ? { className: "login-card animate-fade-in", edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }
    : { className: "auth-content-container animate-fade-in", style: { width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", zIndex: 10 } };

return ('''
content = content.replace(bad_code, 'return (')

# Now insert it before the main return
# Look for the last 'return (' in the file
idx = content.rfind('return (')
if idx != -1:
    content = content[:idx] + bad_code + content[idx+8:]

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Do same for Register.jsx
with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_code2 = '''  const AuthContainer = !isMobile ? BorderGlow : 'div';
  const containerProps = !isMobile 
    ? { className: "login-card animate-fade-in", edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }
    : { className: "auth-content-container animate-fade-in", style: { width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", zIndex: 10 } };

return ('''
content = content.replace(bad_code2, 'return (')

idx2 = content.rfind('return (')
if idx2 != -1:
    content = content[:idx2] + bad_code2 + content[idx2+8:]

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

