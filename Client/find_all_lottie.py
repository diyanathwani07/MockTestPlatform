import os
for root, dirs, files in os.walk('c:/Users/HP'):
    if "AppData" in root or "node_modules" in root or ".git" in root or ".gemini" in root:
        continue
    for f in files:
        if f.lower().endswith('.lottie'):
            print(os.path.join(root, f))
