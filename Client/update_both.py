path_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/Quiz.css'
with open(path_css, 'a', encoding='utf-8') as f:
    f.write("\n@media (max-width: 768px) {\n  .quiz-action-bar {\n    display: none !important;\n  }\n}\n")

path_jsx = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/Quiz.jsx'
with open(path_jsx, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('backgroundColor: "#111115"', 'backgroundColor: "var(--bg-card)"')

with open(path_jsx, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated both files!')
