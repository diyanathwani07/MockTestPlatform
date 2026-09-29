path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Quiz.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'formatTimeBox' in line:
        start = max(0, i - 2)
        end = min(len(lines), i + 35)
        with open('out_time.txt', 'w', encoding='utf-8') as out:
            out.write("".join(lines[start:end]))
        break
