import re

def fix_file(path, is_login):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the conditional for the component logic
    cond = '!(isMobile && step === "landing")' if is_login else '!isMobile'
    
    # 1. Add the variable definitions before return (
    var_defs = f'''  const AuthContainer = {cond} ? BorderGlow : 'div';
  const containerProps = {cond} 
    ? {{ className: "login-card animate-fade-in", edgeSensitivity: 30, glowColor: "260 85 70", borderRadius: 28, glowRadius: 40, glowIntensity: 1.2, coneSpread: 25, animated: true, colors: ['#7B3FF3', '#00D2FF', '#EC4899'], alwaysGlow: true }}
    : {{ className: "auth-content-container animate-fade-in", style: {{ width: "100%", maxWidth: "420px", padding: "24px", display: "flex", flexDirection: "column", zIndex: 10 }} }};

return ('''
    content = content.replace('return (', var_defs, 1)

    # 2. Replace the bad start wrapper
    bad_wrapper_regex = r'\{\!' + (r'\(isMobile && step === "landing"\)' if is_login else r'isMobile') + r' \? \(\s*<BorderGlow[^>]+>\s*\) : \(\s*<div className="auth-content-container[^>]+>\s*\)\}'
    content = re.sub(bad_wrapper_regex, '<AuthContainer {...containerProps}>', content)

    # 3. Replace the bad end wrapper
    bad_end_regex = r'\{\!' + (r'\(isMobile && step === "landing"\)' if is_login else r'isMobile') + r' \? </BorderGlow> : </div>\}'
    content = re.sub(bad_end_regex, '</AuthContainer>', content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx', True)
fix_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', False)
