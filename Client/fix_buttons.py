import os
import glob
import re

target_dir = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src'
pattern = re.compile(r'var\(--sidebar-active-text\s*(?:,\s*var\(--primary-foreground(?:,\s*(?:#ffffff|#fff|white))?\)|,\s*(?:#ffffff|#fff|white))?\)')

for root, _, files in os.walk(target_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = pattern.sub('"#ffffff"', content)
            # Some places had: color: "var(--sidebar-active-text..."
            # Wait, the pattern might replace the whole string if I'm not careful.
            
            # Let's just do text replacements for known strings
            content = content.replace('var(--sidebar-active-text, var(--primary-foreground, #fff))', '#ffffff')
            content = content.replace('var(--sidebar-active-text, var(--primary-foreground, #ffffff))', '#ffffff')
            content = content.replace('var(--sidebar-active-text, var(--primary-foreground, white))', '#ffffff')
            content = content.replace('var(--sidebar-active-text, var(--primary-foreground))', '#ffffff')
            
            if content != new_content:
                pass # Just write the specific string replacements to be safe
                
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
