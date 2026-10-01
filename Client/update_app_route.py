import re
path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_stmt = 'import StreakPage from "./Pages/StreakPage";\n'
if "import StreakPage" not in content:
    content = content.replace('import StudentDashboard from "./Pages/StudentDashboard";', import_stmt + 'import StudentDashboard from "./Pages/StudentDashboard";')

route_code = """
        <Route
          path="/dashboard/streak"
          element={
            <ProtectedRoute>
              <StreakPage />
            </ProtectedRoute>
          }
        />
"""
if "/dashboard/streak" not in content:
    content = content.replace('<Route path="/dashboard/leaderboard"', route_code + '        <Route path="/dashboard/leaderboard"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.jsx with StreakPage route")
