with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Add isMobile definition
hook = '''  const [isMobile, setIsMobile] = useState(window.innerWidth <= 560);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 560);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
'''

if 'const [isMobile, setIsMobile]' not in content:
    content = content.replace('const [showPassword', hook + '\n  const [showPassword')

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Register.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

