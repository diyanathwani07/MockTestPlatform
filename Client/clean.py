path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Login.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '{isMobile && step === "role" && (' in line:
        skip = True
    
    if not skip:
        new_lines.append(line)
        
    if skip and ')}' in line and '</div>' in lines[lines.index(line)-1]: # A bit fragile, let's just use index slicing
        pass

# Better approach:
