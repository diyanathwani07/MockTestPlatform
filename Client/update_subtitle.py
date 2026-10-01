path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '{selectedSubjectTab ? `Review all your test attempts for ${selectedSubjectTab}.` : "Select a subject to view your attempts."}',
    '{selectedSubjectTab ? "Review all your test attempts." : "Select a subject to view your attempts."}'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated subtitle in SubjectResults.jsx")
