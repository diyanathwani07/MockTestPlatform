import os
base = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages'

def replace_empty_state(filename, target, replacement):
    path = os.path.join(base, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "DotLottieReact" not in content:
        import_stmt = "import { DotLottieReact } from '@lottiefiles/dotlottie-react';\n"
        content = content.replace('import React, { useState, useEffect } from "react";', 'import React, { useState, useEffect } from "react";\n' + import_stmt)
        content = content.replace('import React, { useState, useEffect, useMemo } from "react";', 'import React, { useState, useEffect, useMemo } from "react";\n' + import_stmt)
        content = content.replace('import React, { useState, useEffect, useCallback, useMemo } from "react";', 'import React, { useState, useEffect, useCallback, useMemo } from "react";\n' + import_stmt)
    
    if target in content:
        content = content.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filename}")
    else:
        print(f"Target not found in {filename}")

# MyExams
target_myexams = """<div className="me-empty-icon" style={{ margin: "0 auto 16px auto" }}>
                      <FileText size={40} />
                    </div>"""
repl_myexams = """<div className="me-empty-icon" style={{ margin: "0 auto 16px auto", width: "120px", height: "120px" }}>
                      <DotLottieReact src="/idk.lottie" loop autoplay />
                    </div>"""
replace_empty_state('MyExams.jsx', target_myexams, repl_myexams)

# StudentResults
target_results = """<div className="sd-empty-icon">📭</div>"""
repl_results = """<div className="sd-empty-icon" style={{ width: "120px", height: "120px", margin: "0 auto" }}>
                <DotLottieReact src="/idk.lottie" loop autoplay />
              </div>"""
replace_empty_state('StudentResults.jsx', target_results, repl_results)

# PracticeDashboard
target_practice = """<div className="sd-empty-icon">📭</div>"""
repl_practice = """<div className="sd-empty-icon" style={{ width: "120px", height: "120px", margin: "0 auto" }}>
                <DotLottieReact src="/idk.lottie" loop autoplay />
              </div>"""
replace_empty_state('PracticeDashboard.jsx', target_practice, repl_practice)
