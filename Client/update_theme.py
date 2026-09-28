with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/theme.css', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We will replace the block inside [data-theme="dark"], body.dark-mode {
pattern = r'(\[data-theme="dark"\], body\.dark-mode \{)(.*?)(\n\})'
match = re.search(pattern, content, re.DOTALL)

if match:
    block = match.group(2)
    # Replace the values
    block = re.sub(r'--bg-page:\s*#[0-9a-fA-F]+;', '--bg-page:        #0D0D16;', block)
    block = re.sub(r'--bg-sidebar:\s*#[0-9a-fA-F]+;', '--bg-sidebar:     #11111C;', block)
    block = re.sub(r'--bg-header:\s*#[0-9a-fA-F]+;', '--bg-header:      #171727;', block)
    block = re.sub(r'--bg-card:\s*#[0-9a-fA-F]+;', '--bg-card:        #1A1A2A;', block)
    block = re.sub(r'--bg-panel:\s*#[0-9a-fA-F]+;', '--bg-panel:       #1A1A2A;', block)
    block = re.sub(r'--bg-input:\s*#[0-9a-fA-F]+;', '--bg-input:       #171727;', block) # slightly darker than card
    block = re.sub(r'--border-color:\s*#[0-9a-fA-F]+;', '--border-color:   #292941;', block)
    block = re.sub(r'--border-input:\s*#[0-9a-fA-F]+;', '--border-input:   #292941;', block)
    block = re.sub(r'--text-primary:\s*#[0-9a-fA-F]+;', '--text-primary:   #F5F3FF;', block)
    block = re.sub(r'--text-secondary:\s*#[0-9a-fA-F]+;', '--text-secondary: #A7A3BD;', block)
    block = re.sub(r'--sidebar-active-bg:\s*#[0-9a-fA-F]+;', '--sidebar-active-bg: #6D35D9;', block)
    
    new_content = content[:match.start()] + match.group(1) + block + match.group(3) + content[match.end():]
    with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/theme.css', 'w', encoding='utf-8') as f:
        f.write(new_content)
        print("Updated theme.css")
