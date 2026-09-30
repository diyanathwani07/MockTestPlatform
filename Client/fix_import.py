path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('import "../css/Practice.css";', 'import "../css/Practice.css";\nimport "../css/MyExams.css";')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Imported MyExams.css")
