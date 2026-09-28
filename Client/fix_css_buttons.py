import os
import glob

target_dir = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src'

for root, _, files in os.walk(target_dir):
    for file in files:
        if file.endswith('.css'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            content = content.replace('var(--sidebar-active-text, var(--primary-foreground, #FFF))', '#ffffff')
            content = content.replace('var(--sidebar-active-text, var(--primary-foreground, #fff))', '#ffffff')
            content = content.replace('var(--sidebar-active-text, var(--primary-foreground, #ffffff))', '#ffffff')
            content = content.replace('var(--sidebar-active-text, var(--primary-foreground, white))', '#ffffff')
            content = content.replace('var(--sidebar-active-text, #fff)', '#ffffff')
            content = content.replace('var(--sidebar-active-text, #ffffff)', '#ffffff')
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
