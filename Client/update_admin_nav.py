path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/admin/components/AdminNavbar.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
if 'import UniversalSearch' not in content:
    content = content.replace('import ThemeToggle from "../../components/ThemeToggle";', 'import ThemeToggle from "../../components/ThemeToggle";\nimport UniversalSearch from "../../components/UniversalSearch";')

# Insert component
if '<UniversalSearch />' not in content:
    content = content.replace('<div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>', 
                              '<div className="navbar-right-controls" style={{ display: "flex", alignItems: "center", gap: "16px" }}>\n        <UniversalSearch />')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AdminNavbar.jsx")
