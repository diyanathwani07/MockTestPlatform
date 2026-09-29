import os
found = False
for root, dirs, files in os.walk('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src'):
    for file in files:
        if file.endswith(('.jsx', '.js', '.css', '.html')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if 'teaching' in content.lower() or 'pariksha' in content.lower():
                    print(f'Found in: {path}')
                    found = True
if not found:
    print('Not found')
