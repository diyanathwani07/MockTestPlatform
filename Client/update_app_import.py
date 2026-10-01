path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = 'const StreakPage = lazy(() => import("./Pages/StreakPage"));\n'
if "StreakPage = lazy" not in content:
    content = content.replace('const StudentDashboard = lazy(() => import("./Pages/StudentDashboard"));', import_stmt + 'const StudentDashboard = lazy(() => import("./Pages/StudentDashboard"));')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.jsx with StreakPage import")
