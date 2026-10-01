path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(1158, -1, -1):
    if '@media' in lines[i]:
        print(f"Line {i+1}: {lines[i].strip()}")
        break
