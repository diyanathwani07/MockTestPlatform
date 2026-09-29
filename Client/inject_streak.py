path_jsx = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StudentDashboard.jsx'
with open(path_jsx, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Add import
if 'StreakCard' not in content:
    content = content.replace('import DashboardBannerCarousel from "../components/DashboardBannerCarousel";', 'import DashboardBannerCarousel from "../components/DashboardBannerCarousel";\nimport StreakCard from "../components/StreakCard";')

# We don't necessarily have to completely delete ScoreTrendChart, we can just replace its invocation!
perf_section = r'<div className="sd-performance-section">.*?<ScoreTrendChart data=\{results\} />.*?</div>\s*</div>'
if re.search(perf_section, content, re.DOTALL):
    content = re.sub(perf_section, '<div className="sd-performance-section" style={{ padding: 0, border: "none", background: "transparent", boxShadow: "none" }}>\n            <StreakCard results={results} />\n          </div>', content, flags=re.DOTALL)
else:
    print("Could not find perf section")

with open(path_jsx, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentDashboard.jsx safely")
