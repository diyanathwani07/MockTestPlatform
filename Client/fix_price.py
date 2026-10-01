path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/QuizDetailsModal.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<span className="qdm-price-label">PRICE</span>',
    '<span className="qdm-price-label">PRICE {plans.length === 1 && selectedPlan ? `(${selectedPlan.durationMonths} Month${selectedPlan.durationMonths > 1 ? "s" : ""})` : ""}</span>'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated price label")
