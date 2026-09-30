path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/SubjectResults.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(
    r'\{decodedExamName\}\s*\{selectedSubjectTab \? `\- \$\{selectedSubjectTab\}` : ""\}\s*Results',
    '{selectedSubjectTab ? `${selectedSubjectTab} Results` : `${decodedExamName} Results`}',
    content
)

content = re.sub(
    r'Review all your test attempts for \{decodedExamName\}\s*\{selectedSubjectTab \? `\- \$\{selectedSubjectTab\}` : ""\}\.',
    'Review your attempts and performance analytics for {selectedSubjectTab ? selectedSubjectTab : decodedExamName}.',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SubjectResults.jsx")
