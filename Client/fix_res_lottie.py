path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Result.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_stmt = "import { DotLottieReact } from '@lottiefiles/dotlottie-react';\n"
if "DotLottieReact" not in content:
    content = content.replace('import React, { useEffect, useState } from "react";', 'import React, { useEffect, useState } from "react";\n' + import_stmt)

# Replace trophy with Lottie in mobile view
target = '<Trophy className="inspo-trophy-svg" />'
replacement = '<DotLottieReact src="/Yay.lottie" loop autoplay style={{ width: "200px", height: "200px", zIndex: 10 }} />'
content = content.replace(target, replacement)

# Replace trophy with Lottie in desktop view as well (user said "in the result trophy emoji or whatever is that put the yay.lottie")
target2 = '<Trophy size={64} strokeWidth={1.5} />'
replacement2 = '<DotLottieReact src="/Yay.lottie" loop autoplay style={{ width: "80px", height: "80px" }} />'
content = content.replace(target2, replacement2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Result.jsx with Yay.lottie")
