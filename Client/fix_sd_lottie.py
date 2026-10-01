path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = "import { DotLottieReact } from '@lottiefiles/dotlottie-react';\n"
if "DotLottieReact" not in content:
    content = content.replace('import React, { useState, useEffect } from "react";', 'import React, { useState, useEffect } from "react";\n' + import_stmt)
    content = content.replace('import React, { useState, useEffect, useMemo } from "react";', 'import React, { useState, useEffect, useMemo } from "react";\n' + import_stmt)

target_chart = """<TrendingUp size={32} color="var(--border-input)" />"""
repl_chart = """<div style={{ width: "80px", height: "80px", margin: "0 auto" }}><DotLottieReact src="/idk.lottie" loop autoplay /></div>"""
content = content.replace(target_chart, repl_chart)

target_upcoming = """<Calendar size={32} color="var(--border-input)" />"""
repl_upcoming = """<div style={{ width: "80px", height: "80px", margin: "0 auto" }}><DotLottieReact src="/idk.lottie" loop autoplay /></div>"""
content = content.replace(target_upcoming, repl_upcoming)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentDashboard.jsx")
