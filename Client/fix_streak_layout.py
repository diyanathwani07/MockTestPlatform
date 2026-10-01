path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/Pages/StreakPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<StudentNavbar title="Dashboard > Streak" />',
    '<StudentNavbar title="Streak" />'
)

content = content.replace(
    '<div className="sd-content" style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 20px" }}>',
    '<div className="sd-content" style={{ paddingTop: "20px" }}>'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StreakPage layout")
