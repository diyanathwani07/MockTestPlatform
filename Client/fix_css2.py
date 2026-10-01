path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/QuizDetailsModal.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Reduce mobile padding in left panel
content = re.sub(r'\.qdm-left-panel \{\s*border-right: none;\s*border-bottom: 1px solid var\(--border-color, #ECE9F7\);\s*padding: 20px;\s*overflow-y: visible;', 
                 '.qdm-left-panel {\n      border-right: none;\n      border-bottom: 1px solid var(--border-color, #ECE9F7);\n      padding: 12px 16px;\n      overflow-y: visible;', content)

# Reduce right panel padding on mobile
content = re.sub(r'\.qdm-right-panel \{\s*padding: 24px 20px;\s*\}', 
                 '.qdm-right-panel {\n      padding: 16px;\n    }', content)

# Remove background and huge margin from refund notice to save space
# The refund notice is styled globally probably. Let's append some overrides for mobile.
mobile_overrides = """
    .qdm-refund-notice {
      padding: 8px 12px;
      margin-top: 16px;
      font-size: 11px;
    }
    .qdm-section-title {
      margin-bottom: 8px;
    }
    .qdm-plans-list {
      gap: 8px;
    }
    .qdm-plan-item {
      padding: 10px 14px;
    }
    .qdm-price-row {
      margin-bottom: 12px;
    }
    .qdm-currency-selector {
      margin-bottom: 16px;
    }
"""

if 'qdm-refund-notice {' not in content.split('@media (max-width: 768px)')[1]:
    content = content.replace('  @keyframes qdm-slide-up {', mobile_overrides + '\n  @keyframes qdm-slide-up {')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CSS padding")
