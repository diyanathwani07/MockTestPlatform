path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if "import { DotLottieReact }" not in content:
    content = content.replace('import React, { useState, useEffect } from "react";', 'import React, { useState, useEffect } from "react";\nimport { DotLottieReact } from "@lottiefiles/dotlottie-react";')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added DotLottieReact import")
