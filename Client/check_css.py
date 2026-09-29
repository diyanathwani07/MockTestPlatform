path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '.sd-stat-card' in line and 'flex-direction: column' in lines[i+1]:
        start = max(0, i-5)
        end = min(len(lines), i+15)
        print("".join(lines[start:end]))
        break
