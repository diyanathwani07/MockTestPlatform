path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentOnboarding.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '{formData.examId && ('
replacement = '{formData.examId && formData.examId !== "other" && ('
content = content.replace(target, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
