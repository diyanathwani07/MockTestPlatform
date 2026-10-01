import sys
sys.stdout.reconfigure(encoding="utf-8")
path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def print_context(line_num):
    print(f"\n--- Around Line {line_num} ---")
    start = max(0, line_num - 5)
    end = min(len(lines), line_num + 5)
    for i in range(start, end):
        print(f"{i+1}: {lines[i].rstrip()}")

for num in [790, 1158, 1626, 1634, 1640]:
    print_context(num)
