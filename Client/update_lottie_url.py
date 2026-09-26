with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/PrepMarkMascot.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(
    r'const lottieUrl =[^;]+;',
    'const lottieUrl = "/mascot.lottie";',
    content
)

with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/PrepMarkMascot.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
