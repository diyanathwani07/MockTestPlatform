path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Add Suspense and lazy
if 'Suspense' not in content:
    content = content.replace('import { BrowserRouter, Routes, Route } from "react-router-dom";', 'import React, { Suspense, lazy } from "react";\nimport { BrowserRouter, Routes, Route } from "react-router-dom";')

def replacer(match):
    name = match.group(1)
    path_val = match.group(2)
    
    # Don't lazy load Login, Register, ProtectedRoute, AdminRoute to keep initial render fast?
    # Actually, Lighthouse is testing performance, so lazy loading everything except the basics is good.
    # We will lazy load everything in Pages and admin.
    if name in ['ProtectedRoute', 'AdminRoute']:
        return match.group(0) # don't change
    
    return f'const {name} = lazy(() => import("{path_val}"));'

# Find all relative imports for pages and admin
content = re.sub(r'import\s+([A-Za-z0-9_]+)\s+from\s+"(\./(?:Pages|admin)/[^"]+)";', replacer, content)

# Wrap Routes in Suspense
loading_div = """<Suspense fallback={<div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main, #0B0A10)' }}><div className="loader" style={{ width: '48px', height: '48px', border: '5px solid #4A358A', borderBottomColor: 'transparent', borderRadius: '50%', display: 'inline-block', boxSizing: 'border-box', animation: 'rotation 1s linear infinite' }}></div><style>{`@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style></div>}>"""

if '<Suspense' not in content:
    content = content.replace('<Routes>', loading_div + '\n      <Routes>')
    content = content.replace('</Routes>', '</Routes>\n      </Suspense>')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Implemented lazy loading in App.jsx")
