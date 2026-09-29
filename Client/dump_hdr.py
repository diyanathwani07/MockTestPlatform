path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
with open('out_hdr.txt', 'w', encoding='utf-8') as out:
    out.write("".join(lines[75:110]))
