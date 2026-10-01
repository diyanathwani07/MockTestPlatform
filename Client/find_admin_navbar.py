import os
for root, dirs, files in os.walk('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css'):
    for f in files:
        if f.endswith('.css'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                if '.admin-navbar {' in file.read() or '.admin-navbar{' in file.read():
                    print(path)
