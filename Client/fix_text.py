import os

def replace_in_file(filepath, search_str, replace_str):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if search_str in content:
        content = content.replace(search_str, replace_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"String not found in {filepath}")

# 1. StudentResults.jsx
replace_in_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentResults.jsx',
    '<p className="result-item-desc">Review your historical performance and analytics for this test.</p>',
    '')

# 2. MyExams.jsx
replace_in_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/MyExams.jsx',
    '<p className="exam-series-desc">Practice mock exams for your preparation.</p>',
    '')

# 3. PracticeDashboard.jsx
replace_in_file('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/PracticeDashboard.jsx',
    '<p className="practice-card-desc">Practice module focusing on core concepts.</p>',
    '')

# Also remove "Untimed" and the Clock icon from PracticeDashboard.jsx
with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/PracticeDashboard.jsx', 'r', encoding='utf-8') as f:
    prac_content = f.read()

import re
# Look for <Clock size={14} /> Untimed
prac_content = re.sub(r'<span[^>]*>\s*<Clock[^>]*/>\s*Untimed\s*</span>', '', prac_content)
with open('c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/PracticeDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(prac_content)
print("Updated PracticeDashboard.jsx (Untimed)")
