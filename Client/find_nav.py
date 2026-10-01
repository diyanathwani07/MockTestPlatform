import os
def find_string(start_dir):
    for root, dirs, files in os.walk(start_dir):
        for file in files:
            if file.endswith('.jsx') or file.endswith('.js'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        if 'navigate("/")' in f.read() or "navigate('/')" in f.read():
                            print(f"Found in: {path}")
                except Exception:
                    pass
find_string('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src')
