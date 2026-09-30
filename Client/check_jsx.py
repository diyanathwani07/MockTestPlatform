import io
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf8')

path_jsx = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx'
with open(path_jsx, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
start = -1
for i, line in enumerate(lines):
    if '<div className="sd-content">' in line:
        start = i
        break

if start != -1:
    print('\n'.join(lines[start:start+40]))
