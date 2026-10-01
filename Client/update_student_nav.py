path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/StudentNavbar.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'import UniversalSearch' not in content:
    content = content.replace('import ThemeToggle from "./ThemeToggle";', 'import ThemeToggle from "./ThemeToggle";\nimport UniversalSearch from "./UniversalSearch";')

# Insert component
if '<UniversalSearch />' not in content:
    content = content.replace('<div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>', 
                              '<div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>\n          <UniversalSearch />')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StudentNavbar.jsx")
