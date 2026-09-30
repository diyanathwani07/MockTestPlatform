import re

css_path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StudentDashboard.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Let's extract @media (max-width: 768px) blocks
matches = re.findall(r'@media\s*\(\s*max-width:\s*768px\s*\)\s*\{(.*?)\}', css, re.DOTALL)
print("--- Mobile Media Queries ---")
for m in matches:
    print(m)

print("\n--- .sd-hero ---")
for m in re.findall(r'\.sd-hero\s*\{[^}]*\}', css):
    print(m)

print("\n--- .sd-stats-grid ---")
for m in re.findall(r'\.sd-stats-grid\s*\{[^}]*\}', css):
    print(m)

print("\n--- .sd-content ---")
for m in re.findall(r'\.sd-content\s*\{[^}]*\}', css):
    print(m)
