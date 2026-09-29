path_css = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Client/src/css/StreakCard.css'
with open(path_css, 'r', encoding='utf-8') as f:
    content = f.read()

import re

mobile_css = """
@media (max-width: 768px) {
  .streak-card-container {
    padding: 16px;
  }
  .streak-header {
    margin-bottom: 20px;
  }
  .streak-title {
    font-size: 18px;
  }
  .fire-emoji {
    font-size: 20px;
  }
  .streak-badge {
    padding: 4px 10px;
    font-size: 11px;
  }
  
  .streak-days-container {
    overflow-x: visible; /* no scroll */
    padding-bottom: 0;
    gap: 0;
    justify-content: space-between;
  }
  
  .streak-day-item {
    width: auto;
    flex: 1;
  }
  
  .streak-circle {
    width: 36px;
    height: 36px;
    margin-bottom: 8px;
  }
  
  /* Scale down the SVG inside the circle */
  .streak-circle svg {
    width: 16px !important;
    height: 16px !important;
  }
  
  .streak-day-label {
    font-size: 10px;
    margin-bottom: 2px;
  }
  
  .streak-status {
    font-size: 9px;
  }
  
  .check-icon {
    font-size: 8px;
  }
  
  /* Fix the timeline line for smaller circles */
  .streak-timeline-line-bg {
    display: block !important;
    top: 18px;
    left: 20px;
    right: 20px;
  }
  .streak-timeline-line-fill {
    display: block !important;
    top: 18px;
    left: 20px;
  }
  
  /* Fix bottom banner text truncation */
  .streak-banner {
    padding: 12px;
    gap: 12px;
  }
  .streak-banner-icon-bg {
    width: 36px;
    height: 36px;
  }
  .streak-banner-icon-bg svg {
    width: 18px !important;
    height: 18px !important;
  }
  .streak-banner-text h4 {
    font-size: 13px;
    white-space: normal;
  }
  .streak-banner-text p {
    font-size: 11px;
    white-space: normal;
    line-height: 1.3;
  }
}
"""

# Replace the existing media query with the new one
content = re.sub(r'@media\s*\(\s*max-width:\s*768px\s*\)\s*\{.*?\}\s*\}', mobile_css, content, flags=re.DOTALL)
# In case it didn't match perfectly, check if it's there
if 'overflow-x: visible' not in content:
    # Just append it
    content += mobile_css

with open(path_css, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed StreakCard mobile CSS")
