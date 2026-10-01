path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/components/QuizDetailsModal.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
old_plans_section = """                <div className="qdm-plans-section">
                  <div className="qdm-offer-label">
                    <span className="qdm-offer-dot"></span>
                    Exclusive Launch Offer
                  </div>
                  {plans.map((p, idx) => (
                    <div key={idx} className="qdm-plan-row" onClick={() => setSelectedPlan(p)}>
                      <input 
                        type="radio" 
                        name="subPlan" 
                        checked={selectedPlan?.durationMonths === p.durationMonths}
                        onChange={() => setSelectedPlan(p)}
                        className="qdm-radio"
                      />
                      <span>{p.durationMonths} Month{p.durationMonths > 1 ? 's' : ''} — <strong>₹{p.price}</strong></span>
                    </div>
                  ))}
                </div>"""

new_plans_section = """                {plans.length > 1 && (
                  <div className="qdm-plans-section">
                    <div className="qdm-offer-label">
                      <span className="qdm-offer-dot"></span>
                      Select Plan
                    </div>
                    {plans.map((p, idx) => (
                      <div key={idx} className="qdm-plan-row" onClick={() => setSelectedPlan(p)}>
                        <input 
                          type="radio" 
                          name="subPlan" 
                          checked={selectedPlan?.durationMonths === p.durationMonths}
                          onChange={() => setSelectedPlan(p)}
                          className="qdm-radio"
                        />
                        <span>{p.durationMonths} Month{p.durationMonths > 1 ? 's' : ''} — <strong>₹{p.price}</strong></span>
                      </div>
                    ))}
                  </div>
                )}"""

content = content.replace(old_plans_section, new_plans_section)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated plans section")
