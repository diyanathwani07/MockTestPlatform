import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix axios urls
    content = re.sub(r'axios\.(get|post|put|delete)\(\$\{import\.meta\.env\.VITE_API_URL\}(.*?),\s*\{', r'axios.\1(${import.meta.env.VITE_API_URL}\2, {', content)
    
    # Fix headers
    content = re.sub(r'Authorization:\s*\\Bearer\s*\$\{([^}]+)\}\\', r'Authorization: Bearer ', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx')
fix_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx')
